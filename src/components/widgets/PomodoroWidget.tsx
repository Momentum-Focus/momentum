import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Settings } from "lucide-react";
import { DraggableWidget } from "./DraggableWidget";
import { Task, PomodoroMode } from "../FocusApp";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/context/theme-context";
import { useFocusSettings } from "@/hooks/use-focus-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PomodoroWidgetProps {
  onClose: () => void;
  activeTask?: Task | null;
  onTaskComplete?: () => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
}

// TIMER_DURATIONS will be replaced by focusSettings

export const PomodoroWidget: React.FC<PomodoroWidgetProps> = ({
  onClose,
  activeTask,
  onTaskComplete,
  defaultPosition,
  onPositionChange,
  onDragEnd,
  widgetId,
}) => {
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { themeColor } = useTheme();
  const queryClient = useQueryClient();
  const {
    data: focusSettings,
    saveSettings,
    saving: isSavingFocus,
  } = useFocusSettings();
  const [timerSettings, setTimerSettings] = useState({
    focusDurationMinutes: 25,
    shortBreakDurationMinutes: 5,
    longBreakDurationMinutes: 15,
    cyclesBeforeLongBreak: 4,
  });
  const [isTimerDirty, setIsTimerDirty] = useState(false);

  // Initialize timeLeft with focus duration
  const [timeLeft, setTimeLeft] = useState(() => {
    const settings = focusSettings || timerSettings;
    return settings.focusDurationMinutes * 60;
  });

  // Mapear PomodoroMode do frontend para SessionType do backend
  const mapModeToSessionType = (
    mode: PomodoroMode
  ): "FOCUS" | "SHORT_BREAK" | "LONG_BREAK" => {
    switch (mode) {
      case "focus":
        return "FOCUS";
      case "short-break":
        return "SHORT_BREAK";
      case "long-break":
        return "LONG_BREAK";
      default:
        return "FOCUS";
    }
  };

  const { mutate: createSession } = useMutation<
    { id: number; typeSession: string },
    Error,
    { typeSession: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK"; taskId?: number }
  >({
    mutationFn: (data) =>
      api
        .post("/study-sessions", {
          typeSession: data.typeSession,
          taskId: data.taskId,
        })
        .then((res) => res.data),
    onSuccess: (data) => {
      setActiveSessionId(data.id);
    },
    onError: () => {
      toast({
        title: "Erro ao iniciar sessão",
        description: "Não foi possível salvar o início da sessão no servidor.",
        variant: "destructive",
      });
    },
  });

  const { mutate: endSession } = useMutation<
    any,
    Error,
    { id: number; durationMinutes: number }
  >({
    mutationFn: ({ id, durationMinutes }) =>
      api
        .patch(`/study-sessions/${id}`, {
          endedAt: new Date().toISOString(),
          durationMinutes: durationMinutes,
        })
        .then((res) => res.data),
    onSuccess: () => {
      setActiveSessionId(null);
      queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
    },
    onError: () => {
      toast({
        title: "Erro ao finalizar sessão",
        description: "Não foi possível salvar o fim da sessão no servidor.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (focusSettings) {
      setTimerSettings(focusSettings);
      setIsTimerDirty(false);
    }
  }, [focusSettings]);

  // Update timer when settings change (only if not running)
  useEffect(() => {
    if (!isRunning) {
      // Calculate duration directly
      let duration = 0;
      if (activeTask && mode === "focus") {
        duration = activeTask.estimatedTime * 60;
      } else if (activeTask && mode === "short-break") {
        duration = (activeTask.breakDuration || 5) * 60;
      } else {
        const settings = focusSettings || timerSettings;
        switch (mode) {
          case "focus":
            duration = settings.focusDurationMinutes * 60;
            break;
          case "short-break":
            duration = settings.shortBreakDurationMinutes * 60;
            break;
          case "long-break":
            duration = settings.longBreakDurationMinutes * 60;
            break;
          default:
            duration = 25 * 60;
        }
      }
      setTimeLeft(duration);
    }
  }, [focusSettings, timerSettings, mode, activeTask, isRunning]);

  const handleTimerChange = (
    field: keyof typeof timerSettings,
    value: number
  ) => {
    setIsTimerDirty(true);
    setTimerSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveTimer = async () => {
    try {
      await saveSettings(timerSettings);
      toast({
        title: "Configurações salvas",
        description: "Seu cronômetro Pomodoro foi atualizado.",
      });
      setIsTimerDirty(false);
      setShowSettings(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description:
          error.response?.data?.message ||
          "Não foi possível atualizar suas configurações agora.",
        variant: "destructive",
      });
    }
  };

  // Use custom durations from task if available
  const getTimerDuration = (currentMode: PomodoroMode) => {
    if (activeTask && currentMode === "focus") {
      return activeTask.estimatedTime * 60;
    }
    if (activeTask && currentMode === "short-break") {
      return (activeTask.breakDuration || 5) * 60;
    }
    // Use focusSettings if available, otherwise fallback to defaults
    const settings = focusSettings || timerSettings;
    switch (currentMode) {
      case "focus":
        return settings.focusDurationMinutes * 60;
      case "short-break":
        return settings.shortBreakDurationMinutes * 60;
      case "long-break":
        return settings.longBreakDurationMinutes * 60;
      default:
        return 25 * 60;
    }
  };

  useEffect(() => {
    setTimeLeft(getTimerDuration(mode));
  }, [mode, activeTask, focusSettings, timerSettings]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  // Handle timer completion
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);

      // Finalizar sessão quando o timer termina
      if (activeSessionId) {
        const duration = Math.floor(getTimerDuration(mode) / 60);
        endSession({ id: activeSessionId, durationMinutes: duration });
      }

      if (mode === "focus") {
        setCycleCount((prev) => prev + 1);

        // Check if task is completed based on cycles
        if (
          activeTask &&
          activeTask.cycles &&
          cycleCount + 1 >= activeTask.cycles
        ) {
          onTaskComplete?.();
          return;
        }

        // Auto-switch to break
        const nextMode =
          (cycleCount + 1) % 4 === 0 ? "long-break" : "short-break";
        setMode(nextMode);
      } else {
        // Auto-switch back to focus
        setMode("focus");
      }
    }
  }, [
    timeLeft,
    isRunning,
    mode,
    cycleCount,
    activeTask,
    onTaskComplete,
    activeSessionId,
    endSession,
  ]);

  const handlePlayPause = () => {
    if (isRunning) {
      // Pausar - finalizar sessão atual
      setIsRunning(false);
      if (activeSessionId) {
        const duration = Math.floor((getTimerDuration(mode) - timeLeft) / 60);
        endSession({ id: activeSessionId, durationMinutes: duration });
      }
    } else {
      // Iniciar - criar nova sessão
      setIsRunning(true);
      const taskId =
        activeTask && mode === "focus" && !isNaN(parseInt(activeTask.id))
          ? parseInt(activeTask.id)
          : undefined;

      createSession({
        typeSession: mapModeToSessionType(mode),
        taskId,
      });
    }
  };

  const handleReset = () => {
    if (isRunning && activeSessionId) {
      const duration = Math.floor((getTimerDuration(mode) - timeLeft) / 60);
      endSession({ id: activeSessionId, durationMinutes: duration });
    }
    setIsRunning(false);
    setTimeLeft(getTimerDuration(mode));
    setActiveSessionId(null);
  };

  const handleModeChange = (newMode: PomodoroMode) => {
    // Se estava rodando, finalizar a sessão atual
    if (isRunning && activeSessionId) {
      const duration = Math.floor((getTimerDuration(mode) - timeLeft) / 60);
      endSession({ id: activeSessionId, durationMinutes: duration });
    }
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(getTimerDuration(newMode));
    setActiveSessionId(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getModeColor = () => {
    switch (mode) {
      case "focus":
        return "text-focus";
      case "short-break":
        return "text-break";
      case "long-break":
        return "text-long-break";
      default:
        return "text-focus";
    }
  };

  const getModeBackground = () => {
    switch (mode) {
      case "focus":
        return "bg-focus/10";
      case "short-break":
        return "bg-break/10";
      case "long-break":
        return "bg-long-break/10";
      default:
        return "bg-focus/10";
    }
  };

  return (
    <>
      <DraggableWidget
        title="Timer Pomodoro"
        onClose={onClose}
        className="w-80"
        defaultPosition={defaultPosition}
        onPositionChange={onPositionChange}
        onDragEnd={onDragEnd}
        widgetId={widgetId}
        headerActions={
          <button
            onClick={() => setShowSettings(true)}
            className="h-7 w-7 p-0 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center group"
            title="Configurações"
          >
            <Settings
              className="h-4 w-4 text-white/70 group-hover:text-white transition-colors"
              strokeWidth={2}
            />
          </button>
        }
      >
        <div className="p-8">
          {activeTask && (
            <div className="mb-6 p-4 rounded-lg border border-white/10 bg-white/5">
              <p
                className="text-xs zen-text-muted mb-1"
                style={{ fontWeight: 400 }}
              >
                Tarefa Ativa:
              </p>
              <p
                className="text-sm zen-text-ghost mb-1"
                style={{ fontWeight: 500 }}
              >
                {activeTask.name}
              </p>
              {activeTask.cycles && (
                <p
                  className="text-xs zen-text-muted"
                  style={{ fontWeight: 400 }}
                >
                  Ciclo {cycleCount + 1} de {activeTask.cycles}
                </p>
              )}
            </div>
          )}

          <div className="text-center">
            <div
              className={`text-7xl mb-6 zen-accent ${
                isRunning ? "animate-pulse" : ""
              }`}
              style={{ fontWeight: 200, letterSpacing: "-0.05em" }}
            >
              {formatTime(timeLeft)}
            </div>

            <div className="flex gap-2 mb-8 justify-center">
              <button
                onClick={() => handleModeChange("focus")}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                  mode === "focus"
                    ? "bg-[#4ade80] text-[#121212]"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                }`}
                style={{ fontWeight: 500 }}
              >
                Foco
              </button>
              <button
                onClick={() => handleModeChange("short-break")}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                  mode === "short-break"
                    ? "bg-[#4ade80] text-[#121212]"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                }`}
                style={{ fontWeight: 500 }}
              >
                Pausa
              </button>
              <button
                onClick={() => handleModeChange("long-break")}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                  mode === "long-break"
                    ? "bg-[#4ade80] text-[#121212]"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                }`}
                style={{ fontWeight: 500 }}
              >
                Pausa Longa
              </button>
            </div>

            <div className="flex gap-3 justify-center items-center">
              <button
                onClick={handlePlayPause}
                className="h-12 w-12 rounded-full bg-[#4ade80] hover:bg-[#22c55e] transition-colors flex items-center justify-center text-[#121212] shadow-lg shadow-[#4ade80]/20"
              >
                {isRunning ? (
                  <Pause
                    className="h-5 w-5"
                    strokeWidth={2}
                    fill="currentColor"
                  />
                ) : (
                  <Play
                    className="h-5 w-5 ml-0.5"
                    strokeWidth={2}
                    fill="currentColor"
                  />
                )}
              </button>

              <button
                onClick={handleReset}
                className="h-12 w-12 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center zen-text-ghost border border-white/10"
              >
                <RotateCcw className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </DraggableWidget>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md rounded-3xl border border-white/10 bg-black/70 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)] px-8 py-8">
          <DialogHeader>
            <DialogTitle className="text-white/90 font-light text-2xl tracking-wide">
              Configurações de Foco
            </DialogTitle>
            <DialogDescription className="text-white/60 font-light">
              Personalize sua rotina de Pomodoro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-white/60 font-light">
                  Foco (min)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={timerSettings.focusDurationMinutes}
                  onChange={(e) =>
                    handleTimerChange(
                      "focusDurationMinutes",
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-white/90 focus:ring-1 focus:outline-none transition-all"
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${themeColor}80`;
                    e.currentTarget.style.borderColor = `${themeColor}80`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-white/60 font-light">
                  Pausa Curta (min)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={timerSettings.shortBreakDurationMinutes}
                  onChange={(e) =>
                    handleTimerChange(
                      "shortBreakDurationMinutes",
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-white/90 focus:ring-1 focus:outline-none transition-all"
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${themeColor}80`;
                    e.currentTarget.style.borderColor = `${themeColor}80`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-white/60 font-light">
                  Pausa Longa (min)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={timerSettings.longBreakDurationMinutes}
                  onChange={(e) =>
                    handleTimerChange(
                      "longBreakDurationMinutes",
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-white/90 focus:ring-1 focus:outline-none transition-all"
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${themeColor}80`;
                    e.currentTarget.style.borderColor = `${themeColor}80`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-white/60 font-light">
                  Ciclos até pausa longa
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={timerSettings.cyclesBeforeLongBreak}
                  onChange={(e) =>
                    handleTimerChange(
                      "cyclesBeforeLongBreak",
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-white/90 focus:ring-1 focus:outline-none transition-all"
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${themeColor}80`;
                    e.currentTarget.style.borderColor = `${themeColor}80`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveTimer}
                disabled={!isTimerDirty || isSavingFocus}
                className="flex-1 h-11 disabled:opacity-50 text-white rounded-xl text-base font-medium transition-all shadow-lg"
                style={{
                  backgroundColor: themeColor,
                  boxShadow: `0 0 20px ${themeColor}30`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = `${themeColor}E6`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = themeColor)
                }
              >
                {isSavingFocus ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                className="flex-1 h-11 bg-transparent hover:bg-white/10 text-white/90 border-white/10 rounded-xl text-base font-medium transition-all"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
