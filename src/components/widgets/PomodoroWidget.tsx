import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DraggableWidget } from "./DraggableWidget";
import { Task, PomodoroMode } from "../FocusApp";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PomodoroWidgetProps {
  onClose: () => void;
  activeTask?: Task | null;
  onTaskComplete?: () => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
}

const TIMER_DURATIONS = {
  focus: 25 * 60, // 25 minutes
  "short-break": 5 * 60, // 5 minutes
  "long-break": 15 * 60, // 15 minutes
};

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
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Use custom durations from task if available
  const getTimerDuration = (currentMode: PomodoroMode) => {
    if (activeTask && currentMode === "focus") {
      return activeTask.estimatedTime * 60;
    }
    if (activeTask && currentMode === "short-break") {
      return (activeTask.breakDuration || 5) * 60;
    }
    return TIMER_DURATIONS[currentMode];
  };

  useEffect(() => {
    setTimeLeft(getTimerDuration(mode));
  }, [mode, activeTask]);

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
    <DraggableWidget
      title="Timer Pomodoro"
      onClose={onClose}
      className="w-80"
      defaultPosition={defaultPosition}
      onPositionChange={onPositionChange}
      onDragEnd={onDragEnd}
      widgetId={widgetId}
    >
      <div className={`p-6 ${getModeBackground()} rounded-t-lg`}>
        {activeTask && (
          <div className="mb-4 p-3 bg-widget-background rounded-lg border border-widget-border">
            <p className="text-sm text-muted-foreground">Tarefa Ativa:</p>
            <p className="font-medium text-foreground">{activeTask.name}</p>
            {activeTask.cycles && (
              <p className="text-xs text-muted-foreground">
                Ciclo {cycleCount + 1} de {activeTask.cycles}
              </p>
            )}
          </div>
        )}

        <div className="text-center">
          <div
            className={`text-6xl font-bold ${getModeColor()} mb-4 ${
              isRunning ? "animate-pulse-focus" : ""
            }`}
          >
            {formatTime(timeLeft)}
          </div>

          <div className="flex gap-2 mb-6">
            <Button
              variant={mode === "focus" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeChange("focus")}
              className="flex-1"
            >
              Foco
            </Button>
            <Button
              variant={mode === "short-break" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeChange("short-break")}
              className="flex-1"
            >
              Pausa
            </Button>
            <Button
              variant={mode === "long-break" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeChange("long-break")}
              className="flex-1"
            >
              Pausa Longa
            </Button>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={handlePlayPause}
              size="lg"
              className="bg-gradient-primary hover:bg-primary-hover"
            >
              {isRunning ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <Button onClick={handleReset} variant="outline" size="lg">
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </DraggableWidget>
  );
};
