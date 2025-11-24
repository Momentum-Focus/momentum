import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Settings } from "lucide-react";
import { WidgetContainer } from "./WidgetContainer";
import { Task, PomodoroMode } from "../FocusApp";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
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

interface TimerWidgetProps {
  onClose: () => void;
  activeTask?: Task | null;
  onTaskComplete?: () => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
}

// LocalStorage key for timer persistence
const TIMER_STORAGE_KEY = "momentum-timer-state";

interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  mode: PomodoroMode;
  cycleCount: number;
  currentCycle: number;
  totalCycles: number;
  startTime: number | null;
  taskId: string | null;
}

// Audio helper function
const playTimerSound = () => {
  try {
    // Use Web Audio API to generate a beep sound
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn("Could not play audio:", error);
  }
};

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  onClose,
  activeTask,
  onTaskComplete,
  defaultPosition,
  onPositionChange,
  onDragEnd,
  widgetId,
}) => {
  const {
    data: focusSettings,
    saveSettings,
    saving: isSavingSettings,
  } = useFocusSettings();

  // State management with localStorage persistence
  const [timerState, setTimerState] = useState<TimerState>(() => {
    // Load from localStorage on mount
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Check if timer was running and calculate elapsed time
          if (parsed.isRunning && parsed.startTime) {
            const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
            const newTimeLeft = Math.max(0, parsed.timeLeft - elapsed);
            return {
              ...parsed,
              timeLeft: newTimeLeft,
              isRunning: newTimeLeft > 0, // Stop if time expired
              startTime: newTimeLeft > 0 ? parsed.startTime : null,
            };
          }
          return parsed;
        } catch {
          // Invalid data, use defaults
        }
      }
    }
    return {
      timeLeft: 25 * 60,
      isRunning: false,
      mode: "focus" as PomodoroMode,
      cycleCount: 0,
      currentCycle: 1,
      totalCycles: 1,
      startTime: null,
      taskId: null,
    };
  });

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Input states - allow empty strings
  const [tempFocus, setTempFocus] = useState<string>("");
  const [tempShortBreak, setTempShortBreak] = useState<string>("");
  const [tempLongBreak, setTempLongBreak] = useState<string>("");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerWasStartedRef = useRef(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
    }
  }, [timerState]);

  // Initialize input values from focusSettings
  useEffect(() => {
    if (focusSettings) {
      setTempFocus(String(focusSettings.focusDurationMinutes ?? 25));
      setTempShortBreak(String(focusSettings.shortBreakDurationMinutes ?? 5));
      setTempLongBreak(String(focusSettings.longBreakDurationMinutes ?? 15));
    }
  }, [focusSettings]);

  // Calculate cycle-aware duration for tasks
  const getCycleDuration = useCallback(
    (totalMinutes: number, cycles: number): number => {
      if (!cycles || cycles <= 1) return totalMinutes * 60;
      return Math.round((totalMinutes / cycles) * 60);
    },
    []
  );

  // Get timer duration based on mode and active task
  const getTimerDuration = useCallback(
    (currentMode: PomodoroMode): number => {
      if (activeTask && currentMode === "focus") {
        const totalMinutes = activeTask.estimatedTime || 25;
        const cycles = activeTask.cycles || 1;
        return getCycleDuration(totalMinutes, cycles);
      }
      if (activeTask && currentMode === "short-break") {
        return (activeTask.breakDuration || 5) * 60;
      }

      const settings = focusSettings || {
        focusDurationMinutes: 25,
        shortBreakDurationMinutes: 5,
        longBreakDurationMinutes: 15,
      };
      switch (currentMode) {
        case "focus":
          return (settings.focusDurationMinutes ?? 25) * 60;
        case "short-break":
          return (settings.shortBreakDurationMinutes ?? 5) * 60;
        case "long-break":
          return (settings.longBreakDurationMinutes ?? 15) * 60;
        default:
          return 25 * 60;
      }
    },
    [activeTask, focusSettings, getCycleDuration]
  );

  // Update timer when task or settings change (only reset if timer hasn't been started)
  useEffect(() => {
    // Only reset timer if it was never started by the user
    // Don't reset if timer is paused (was started but isRunning is false)
    const shouldReset = !timerWasStartedRef.current && !timerState.isRunning;

    if (shouldReset) {
      const duration = getTimerDuration(timerState.mode);
      const cycles = activeTask?.cycles || 1;
      setTimerState((prev) => ({
        ...prev,
        timeLeft: duration,
        totalCycles: cycles,
        currentCycle: 1,
        taskId: activeTask?.id || null,
      }));
    }
  }, [
    activeTask,
    focusSettings,
    timerState.mode,
    timerState.isRunning,
    getTimerDuration,
  ]);

  // Timer interval logic
  useEffect(() => {
    if (timerState.isRunning && timerState.timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimerState((prev) => {
          const newTimeLeft = Math.max(0, prev.timeLeft - 1);

          // Update startTime on first tick
          if (!prev.startTime) {
            return {
              ...prev,
              timeLeft: newTimeLeft,
              startTime: Date.now(),
            };
          }

          return {
            ...prev,
            timeLeft: newTimeLeft,
          };
        });
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
  }, [timerState.isRunning, timerState.timeLeft]);

  // Handle timer completion
  useEffect(() => {
    if (timerState.timeLeft === 0 && timerState.isRunning) {
      setTimerState((prev) => ({
        ...prev,
        isRunning: false,
        startTime: null,
      }));

      // Play sound
      playTimerSound();

      // End session if active
      if (activeSessionId) {
        const duration = Math.floor(
          (getTimerDuration(timerState.mode) - timerState.timeLeft) / 60
        );
        endSession({ id: activeSessionId, durationMinutes: duration });
      }

      if (timerState.mode === "focus") {
        const newCycleCount = timerState.cycleCount + 1;
        const newCurrentCycle = timerState.currentCycle + 1;

        // Check if all cycles completed
        if (
          activeTask &&
          activeTask.cycles &&
          newCurrentCycle > activeTask.cycles
        ) {
          onTaskComplete?.();
          setTimerState((prev) => ({
            ...prev,
            cycleCount: 0,
            currentCycle: 1,
          }));
          return;
        }

        // Determine next break type
        const cycleThreshold = focusSettings?.cyclesBeforeLongBreak ?? 4;
        const shouldTakeLongBreak =
          newCycleCount % Math.max(1, cycleThreshold) === 0;
        const nextMode = shouldTakeLongBreak ? "long-break" : "short-break";

        setTimerState((prev) => ({
          ...prev,
          cycleCount: newCycleCount,
          currentCycle: newCurrentCycle,
          mode: nextMode,
          timeLeft: getTimerDuration(nextMode),
        }));
      } else {
        // Break finished, go back to focus
        setTimerState((prev) => ({
          ...prev,
          mode: "focus",
          timeLeft: getTimerDuration("focus"),
        }));
      }
    }
  }, [
    timerState.timeLeft,
    timerState.isRunning,
    timerState.mode,
    activeTask,
    activeSessionId,
    focusSettings,
    getTimerDuration,
    onTaskComplete,
  ]);

  const mapModeToSessionType = (
    mode: PomodoroMode
  ): "FOCUS" | "SHORT_BREAK" | "LONG_BREAK" => {
    if (mode === "focus") return "FOCUS";
    if (mode === "short-break") return "SHORT_BREAK";
    return "LONG_BREAK";
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

  const handlePlayPause = () => {
    if (timerState.isRunning) {
      // Pausar: apenas pausar o timer, mantendo o timeLeft atual
      // Não resetar nada, apenas parar o contador
      setTimerState((prev) => ({
        ...prev,
        isRunning: false,
        // Mantém o startTime para permitir cálculo correto ao retomar
      }));
      // Não finalizar sessão ao pausar - só ao resetar ou completar
    } else {
      // Retomar ou iniciar
      timerWasStartedRef.current = true; // Marca que o timer foi iniciado pelo usuário

      if (activeSessionId) {
        // Retomando uma sessão existente - ajusta startTime baseado no tempo restante
        const totalDuration = getTimerDuration(timerState.mode);
        const elapsedSeconds = totalDuration - timerState.timeLeft;
        setTimerState((prev) => ({
          ...prev,
          isRunning: true,
          // Ajusta startTime para compensar o tempo já decorrido
          startTime: Date.now() - elapsedSeconds * 1000,
        }));
      } else {
        // Iniciando uma nova sessão
        setTimerState((prev) => ({
          ...prev,
          isRunning: true,
          startTime: Date.now(),
        }));
        const taskId =
          activeTask &&
          timerState.mode === "focus" &&
          !isNaN(parseInt(activeTask.id))
            ? parseInt(activeTask.id)
            : undefined;

        createSession({
          typeSession: mapModeToSessionType(timerState.mode),
          taskId,
        });
      }
    }
  };

  const handleReset = () => {
    if (timerState.isRunning && activeSessionId) {
      const duration = Math.floor(
        (getTimerDuration(timerState.mode) - timerState.timeLeft) / 60
      );
      endSession({ id: activeSessionId, durationMinutes: duration });
    }
    const duration = getTimerDuration(timerState.mode);
    timerWasStartedRef.current = false; // Reset flag quando reseta
    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
      timeLeft: duration,
      startTime: null,
    }));
    setActiveSessionId(null);
  };

  const handleModeChange = (newMode: PomodoroMode) => {
    if (timerState.isRunning && activeSessionId) {
      const duration = Math.floor(
        (getTimerDuration(timerState.mode) - timerState.timeLeft) / 60
      );
      endSession({ id: activeSessionId, durationMinutes: duration });
    }
    const duration = getTimerDuration(newMode);
    setTimerState((prev) => ({
      ...prev,
      mode: newMode,
      isRunning: false,
      timeLeft: duration,
      startTime: null,
    }));
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
    if (timerState.mode === "focus") return "text-blue-400";
    if (timerState.mode === "short-break") return "text-green-400";
    return "text-yellow-400";
  };

  // Input validation - convert to number on blur or save
  const validateAndSetNumber = (
    value: string,
    min: number,
    max: number,
    defaultValue: number
  ): number => {
    const num = parseInt(value);
    if (isNaN(num) || num < min) return defaultValue;
    if (num > max) return max;
    return num;
  };

  const handleFocusBlur = () => {
    const validated = validateAndSetNumber(tempFocus, 1, 120, 25);
    setTempFocus(String(validated));
  };

  const handleShortBreakBlur = () => {
    const validated = validateAndSetNumber(tempShortBreak, 1, 60, 5);
    setTempShortBreak(String(validated));
  };

  const handleLongBreakBlur = () => {
    const validated = validateAndSetNumber(tempLongBreak, 1, 120, 15);
    setTempLongBreak(String(validated));
  };

  const handleSaveSettings = async () => {
    try {
      const focusMinutes = validateAndSetNumber(tempFocus, 1, 120, 25);
      const shortBreakMinutes = validateAndSetNumber(tempShortBreak, 1, 60, 5);
      const longBreakMinutes = validateAndSetNumber(tempLongBreak, 1, 120, 15);

      await saveSettings({
        focusDurationMinutes: focusMinutes,
        shortBreakDurationMinutes: shortBreakMinutes,
        longBreakDurationMinutes: longBreakMinutes,
      });
      toast({
        title: "Configurações salvas",
        description: "As configurações do timer foram atualizadas.",
      });
      setShowSettings(false);
      // Update timer if not running
      if (!timerState.isRunning) {
        const duration = getTimerDuration(timerState.mode);
        setTimerState((prev) => ({
          ...prev,
          timeLeft: duration,
        }));
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
  };

  // Calculate cycles info for display
  const cyclesInfo =
    activeTask && activeTask.cycles && activeTask.cycles > 1
      ? `Ciclo ${timerState.currentCycle} de ${activeTask.cycles}`
      : null;

  return (
    <>
      <WidgetContainer
        title="Timer Pomodoro"
        onClose={onClose}
        className="w-96"
        defaultPosition={defaultPosition}
        onPositionChange={onPositionChange}
        onDragEnd={onDragEnd}
        widgetId={widgetId}
        headerActions={
          <button
            onClick={() => setShowSettings(true)}
            className="h-6 w-6 p-0 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center group"
            title="Configurações"
          >
            <Settings
              className="h-3.5 w-3.5 text-white/50 group-hover:text-white/90 transition-colors"
              strokeWidth={1.5}
            />
          </button>
        }
      >
        <div className="p-8 relative">
          {activeTask && (
            <div className="mb-6 p-4 rounded-xl border border-white/10 bg-black/20">
              <p className="text-xs text-white/50 mb-1 font-light uppercase tracking-wider">
                Tarefa Ativa:
              </p>
              <p className="text-sm text-white/90 mb-1 font-medium">
                {activeTask.name}
              </p>
              {cyclesInfo && (
                <p className="text-xs text-white/50 font-light">{cyclesInfo}</p>
              )}
            </div>
          )}

          <div className="text-center">
            {/* Timer Display */}
            <motion.div
              className={`text-7xl font-thin mb-8 ${getModeColor()}`}
              animate={timerState.isRunning ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {formatTime(timerState.timeLeft)}
            </motion.div>

            {/* Segmented Control */}
            <div className="flex gap-1 mb-8 p-1 bg-black/20 rounded-xl">
              <button
                onClick={() => handleModeChange("focus")}
                className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  timerState.mode === "focus"
                    ? "bg-blue-500 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Foco
              </button>
              <button
                onClick={() => handleModeChange("short-break")}
                className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  timerState.mode === "short-break"
                    ? "bg-green-500 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Pausa
              </button>
              <button
                onClick={() => handleModeChange("long-break")}
                className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  timerState.mode === "long-break"
                    ? "bg-yellow-500 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Longa
              </button>
            </div>

            {/* Controls */}
            <div className="flex gap-3 justify-center">
              <motion.button
                onClick={handlePlayPause}
                className="h-16 w-16 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center text-white shadow-lg shadow-blue-500/30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {timerState.isRunning ? (
                  <Pause
                    className="h-6 w-6"
                    strokeWidth={2}
                    fill="currentColor"
                  />
                ) : (
                  <Play
                    className="h-6 w-6 ml-0.5"
                    strokeWidth={2}
                    fill="currentColor"
                  />
                )}
              </motion.button>

              <motion.button
                onClick={handleReset}
                className="h-16 w-16 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/90 border border-white/10"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RotateCcw className="h-5 w-5" strokeWidth={1.5} />
              </motion.button>
            </div>
          </div>
        </div>
      </WidgetContainer>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="zen-glass border-white/10 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-white/90 font-light">
              Configurações do Timer
            </DialogTitle>
            <DialogDescription className="text-white/60 font-light">
              Ajuste os tempos do Pomodoro
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="focus" className="text-white/60 font-light">
                Foco (minutos)
              </Label>
              <Input
                id="focus"
                type="number"
                min="1"
                max="120"
                value={tempFocus}
                onChange={(e) => setTempFocus(e.target.value)}
                onBlur={handleFocusBlur}
                className="bg-white/5 border-0 rounded-full h-12 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortBreak" className="text-white/60 font-light">
                Pausa Curta (minutos)
              </Label>
              <Input
                id="shortBreak"
                type="number"
                min="1"
                max="60"
                value={tempShortBreak}
                onChange={(e) => setTempShortBreak(e.target.value)}
                onBlur={handleShortBreakBlur}
                className="bg-white/5 border-0 rounded-full h-12 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longBreak" className="text-white/60 font-light">
                Pausa Longa (minutos)
              </Label>
              <Input
                id="longBreak"
                type="number"
                min="1"
                max="120"
                value={tempLongBreak}
                onChange={(e) => setTempLongBreak(e.target.value)}
                onBlur={handleLongBreakBlur}
                className="bg-white/5 border-0 rounded-full h-12 text-white/90 placeholder:text-white/30 focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-light"
              >
                {isSavingSettings ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white/90 rounded-full font-light"
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
