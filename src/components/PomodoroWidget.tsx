import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DraggableWidget } from './DraggableWidget';
import { Task } from './TasksWidget';
import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { SessionType } from '@prisma/client';

type PomodoroMode = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

interface PomodoroWidgetProps {
  onClose: () => void;
  activeTask?: Task | null;
  onTaskComplete?: () => void;
}

const TIMER_DURATIONS = {
  FOCUS: 25 * 60,
  SHORT_BREAK: 5 * 60,
  LONG_BREAK: 15 * 60,
};

interface StudySession {
  id: number;
  typeSession: PomodoroMode;
  taskId?: number;
}

export const PomodoroWidget: React.FC<PomodoroWidgetProps> = ({
  onClose,
  activeTask,
  onTaskComplete,
}) => {
  const [mode, setMode] = useState<PomodoroMode>('FOCUS');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.FOCUS);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getTimerDuration = (currentMode: PomodoroMode) => {
    return TIMER_DURATIONS[currentMode];
  };

  const { mutate: createSession } = useMutation<
    StudySession,
    Error,
    { typeSession: PomodoroMode; taskId?: number }
  >({
    mutationFn: (data) =>
      api.post('/study-sessions', data).then((res) => res.data),
    onSuccess: (data) => {
      setActiveSessionId(data.id);
    },
    onError: () => {
      toast({
        title: 'Erro ao iniciar sessão',
        description: 'Não foi possível salvar o início da sessão no servidor.',
        variant: 'destructive',
      });
    },
  });

  const { mutate: endSession } = useMutation<
    StudySession,
    Error,
    { id: number; durationMinutes: number }
  >({
    mutationFn: ({ id, durationMinutes }) =>
      api.patch(`/study-sessions/${id}`, {
        endedAt: new Date().toISOString(),
        durationMinutes: durationMinutes,
      }),
    onSuccess: () => {
      setActiveSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
    },
    onError: () => {
      toast({
        title: 'Erro ao finalizar sessão',
        description: 'Não foi possível salvar o fim da sessão no servidor.',
        variant: 'destructive',
      });
    },
  });

  const saveCompletedSession = (completedMode: PomodoroMode) => {
    if (activeSessionId) {
      const duration = Math.floor(getTimerDuration(completedMode) / 60);
      endSession({ id: activeSessionId, durationMinutes: duration });
    }
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);

            saveCompletedSession(mode);

            const nextMode = getNextMode();
            handleModeChange(nextMode, false);

            if (mode === 'FOCUS' && onTaskComplete) {
              onTaskComplete();
            }

            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, activeSessionId]);

  const getNextMode = () => {
    if (mode === 'FOCUS') {
      const newCycleCount = cycleCount + 1;
      setCycleCount(newCycleCount);
      return newCycleCount % 4 === 0 ? 'LONG_BREAK' : 'SHORT_BREAK';
    }
    return 'FOCUS';
  };

  const handlePlayPause = () => {
    if (isRunning) {
      setIsRunning(false);
      if (activeSessionId) {
        const duration = Math.floor((getTimerDuration(mode) - timeLeft) / 60);
        endSession({ id: activeSessionId, durationMinutes: duration });
      }
    } else {
      setIsRunning(true);
      createSession({
        typeSession: mode,
        taskId: mode === 'FOCUS' ? activeTask?.id : undefined,
      });
    }
  };

  const handleModeChange = (newMode: PomodoroMode, manuallyChanged = true) => {
    if (isRunning) {
      const duration = Math.floor((getTimerDuration(mode) - timeLeft) / 60);
      if (activeSessionId)
        endSession({ id: activeSessionId, durationMinutes: duration });
    }

    setMode(newMode);
    setTimeLeft(getTimerDuration(newMode));
    setIsRunning(false);

    if (manuallyChanged) {
      setActiveSessionId(null);
    }
  };

  const handleReset = () => {
    if (isRunning && activeSessionId) {
      const duration = Math.floor((getTimerDuration(mode) - timeLeft) / 60);
      endSession({ id: activeSessionId, durationMinutes: duration });
    }
    setIsRunning(false);
    setTimeLeft(getTimerDuration(mode));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getModeLabel = () => {
    if (mode === 'FOCUS')
      return activeTask ? `Foco: ${activeTask.title}` : 'Hora de Focar';
    if (mode === 'SHORT_BREAK') return 'Pausa Curta';
    return 'Pausa Longa';
  };

  return (
    <DraggableWidget
      title="Pomodoro Timer"
      onClose={onClose}
      className="w-80"
      defaultPosition={{ x: 200, y: 200 }}
    >
      <div className="p-6 space-y-6">
        <div className="text-center space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            {getModeLabel()}
          </div>
          <div className="text-7xl font-bold font-mono text-foreground">
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={mode === 'FOCUS' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('FOCUS')}
            className="flex-1"
          >
            Foco
          </Button>
          <Button
            variant={mode === 'SHORT_BREAK' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('SHORT_BREAK')}
            className="flex-1"
          >
            Pausa
          </Button>
          <Button
            variant={mode === 'LONG_BREAK' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('LONG_BREAK')}
            className="flex-1"
          >
            Pausa Longa
          </Button>
        </div>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={handlePlayPause}
            size="lg"
            className="bg-gradient-primary hover:bg-primary-hover w-28"
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
    </DraggableWidget>
  );
};