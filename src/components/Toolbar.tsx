import React from 'react';
import { Timer, Music, CheckSquare, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToolbarProps {
  onOpenPomodoro: () => void;
  onOpenMusic: () => void;
  onOpenTasks: () => void;
  onOpenBackground: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onOpenPomodoro,
  onOpenMusic,
  onOpenTasks,
  onOpenBackground,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-widget-background border-t border-widget-border shadow-toolbar backdrop-blur-sm bg-opacity-95 z-50">
      <div className="flex items-center justify-center gap-8 py-4 px-6">
        <Button
          variant="ghost"
          size="lg"
          onClick={onOpenPomodoro}
          className="flex flex-col items-center gap-2 h-auto py-3 px-6 hover:bg-primary/10 hover:text-primary transition-smooth group"
        >
          <Timer className="h-6 w-6 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Timer</span>
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={onOpenMusic}
          className="flex flex-col items-center gap-2 h-auto py-3 px-6 hover:bg-primary/10 hover:text-primary transition-smooth group"
        >
          <Music className="h-6 w-6 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Música</span>
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={onOpenTasks}
          className="flex flex-col items-center gap-2 h-auto py-3 px-6 hover:bg-primary/10 hover:text-primary transition-smooth group"
        >
          <CheckSquare className="h-6 w-6 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Tarefas</span>
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={onOpenBackground}
          className="flex flex-col items-center gap-2 h-auto py-3 px-6 hover:bg-primary/10 hover:text-primary transition-smooth group"
        >
          <Palette className="h-6 w-6 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Fundo</span>
        </Button>
      </div>
    </div>
  );
};