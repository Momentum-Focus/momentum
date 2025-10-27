import React, { useState } from 'react';
import { DraggableToolbar } from './DraggableToolbar';
import { PomodoroWidget } from './widgets/PomodoroWidget';
import { MusicWidget } from './widgets/MusicWidget';
import { TasksWidget } from './widgets/TasksWidget';
import { BackgroundSelector } from './BackgroundSelector';
import momentumLogo from '@/assets/momentum-logo.png';

export interface Task {
  id: string;
  name: string;
  estimatedTime: number;
  cycles?: number;
  breakDuration?: number;
  breakCount?: number;
  isActive?: boolean;
  isCompleted?: boolean;
}

export type PomodoroMode = 'focus' | 'short-break' | 'long-break';

const FocusApp = () => {
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [currentBackground, setCurrentBackground] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleTaskStart = (task: Task) => {
    setActiveTask(task);
    setTasks(prev => prev.map(t => ({ ...t, isActive: t.id === task.id })));
    setShowPomodoro(true);
  };

  const handleTaskComplete = () => {
    if (activeTask) {
      setTasks(prev => prev.map(t => 
        t.id === activeTask.id 
          ? { ...t, isActive: false, isCompleted: true } 
          : t
      ));
      setActiveTask(null);
    }
  };

  return (
    <div 
      className="min-h-screen bg-background relative overflow-hidden transition-all duration-500"
      style={{
        backgroundImage: currentBackground ? `url(${currentBackground})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Main Content Area */}
      {!currentBackground && (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center">
            <div className="flex flex-col items-center space-y-4 mb-8">
              <img src={momentumLogo} alt="Momentum" className="w-20 h-20 animate-float" />
              <h1 className="text-5xl font-bold text-foreground animate-float">
                Momentum
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-md mx-auto">
              Um espaço para concentração, produtividade e bem-estar mental.
            </p>
          </div>
        </div>
      )}

      {/* Widgets */}
      {showPomodoro && (
        <PomodoroWidget
          onClose={() => setShowPomodoro(false)}
          activeTask={activeTask}
          onTaskComplete={handleTaskComplete}
        />
      )}

      {showMusic && (
        <MusicWidget onClose={() => setShowMusic(false)} />
      )}

      {showTasks && (
        <TasksWidget
          onClose={() => setShowTasks(false)}
          tasks={tasks}
          setTasks={setTasks}
          onTaskStart={handleTaskStart}
        />
      )}

      {showBackground && (
        <BackgroundSelector
          onClose={() => setShowBackground(false)}
          onBackgroundSelect={setCurrentBackground}
          currentBackground={currentBackground}
        />
      )}

      {/* Draggable Toolbar */}
      <DraggableToolbar
        onOpenPomodoro={() => setShowPomodoro(true)}
        onOpenMusic={() => setShowMusic(true)}
        onOpenTasks={() => setShowTasks(true)}
        onOpenBackground={() => setShowBackground(true)}
      />
    </div>
  );
};

export default FocusApp;