import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { WidgetContainer } from "./WidgetContainer";
import { Task, PomodoroMode } from "../FocusApp";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useFocusSettings } from "@/hooks/use-focus-settings";

interface TimerWidgetProps {
  onClose: () => void;
  activeTask?: Task | null;
  onTaskComplete?: () => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  onClose,
  activeTask,
  onTaskComplete,
  defaultPosition,
  onPositionChange,
  onDragEnd,
  widgetId,
}) => {
  const { data: focusSettings } = useFocusSettings();
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const getBaseDuration = (currentMode: PomodoroMode) => {
    if (currentMode === "focus") {
      return (focusSettings?.focusDurationMinutes ?? 25) * 60;
    }
    if (currentMode === "short-break") {
      return (focusSettings?.shortBreakDurationMinutes ?? 5) * 60;
    }
    return (focusSettings?.longBreakDurationMinutes ?? 15) * 60;
  };

  const getTimerDuration = (currentMode: PomodoroMode) => {
    if (activeTask && currentMode === "focus") {
      return activeTask.estimatedTime * 60;
    }
    if (activeTask && currentMode === "short-break") {
      return (activeTask.breakDuration || 5) * 60;
    }
    return getBaseDuration(currentMode);
  };

  useEffect(() => {
    setTimeLeft(getTimerDuration(mode));
  }, [mode, activeTask, focusSettings]);

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

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);

      if (activeSessionId) {
        const duration = Math.floor(getTimerDuration(mode) / 60);
        endSession({ id: activeSessionId, durationMinutes: duration });
      }

      if (mode === "focus") {
        setCycleCount((prev) => prev + 1);

        if (
          activeTask &&
          activeTask.cycles &&
          cycleCount + 1 >= activeTask.cycles
        ) {
          onTaskComplete?.();
          return;
        }

    const cycleThreshold = focusSettings?.cyclesBeforeLongBreak ?? 4;
    const shouldTakeLongBreak =
      (cycleCount + 1) % Math.max(1, cycleThreshold) === 0;
    const nextMode = shouldTakeLongBreak ? "long-break" : "short-break";
        setMode(nextMode);
      } else {
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
      setIsRunning(false);
      if (activeSessionId) {
        const duration = Math.floor((getTimerDuration(mode) - timeLeft) / 60);
        endSession({ id: activeSessionId, durationMinutes: duration });
      }
    } else {
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
    if (mode === "focus") return "text-blue-400";
    if (mode === "short-break") return "text-green-400";
    return "text-yellow-400";
  };

  return (
    <WidgetContainer
      title="Timer Pomodoro"
      onClose={onClose}
      className="w-96"
      defaultPosition={defaultPosition}
      onPositionChange={onPositionChange}
      onDragEnd={onDragEnd}
      widgetId={widgetId}
    >
      <div className="p-8">
        {activeTask && (
          <div className="mb-6 p-4 rounded-xl border border-white/10 bg-black/20">
            <p className="text-xs text-white/50 mb-1 font-light uppercase tracking-wider">
              Tarefa Ativa:
            </p>
            <p className="text-sm text-white/90 mb-1 font-medium">
              {activeTask.name}
            </p>
            {activeTask.cycles && (
              <p className="text-xs text-white/50 font-light">
                Ciclo {cycleCount + 1} de {activeTask.cycles}
              </p>
            )}
          </div>
        )}

        <div className="text-center">
          {/* Timer Display */}
          <motion.div
            className={`text-7xl font-thin mb-8 ${getModeColor()}`}
            animate={isRunning ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {formatTime(timeLeft)}
          </motion.div>

          {/* Segmented Control */}
          <div className="flex gap-1 mb-8 p-1 bg-black/20 rounded-xl">
            <button
              onClick={() => handleModeChange("focus")}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                mode === "focus"
                  ? "bg-blue-500 text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Foco
            </button>
            <button
              onClick={() => handleModeChange("short-break")}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                mode === "short-break"
                  ? "bg-green-500 text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Pausa
            </button>
            <button
              onClick={() => handleModeChange("long-break")}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                mode === "long-break"
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
              {isRunning ? (
                <Pause className="h-6 w-6" strokeWidth={2} fill="currentColor" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" strokeWidth={2} fill="currentColor" />
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
  );
};

