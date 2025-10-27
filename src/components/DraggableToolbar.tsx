import React, { useRef, useState, useEffect } from 'react';
import { Timer, Music, CheckSquare, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DraggableToolbarProps {
  onOpenPomodoro: () => void;
  onOpenMusic: () => void;
  onOpenTasks: () => void;
  onOpenBackground: () => void;
}

export const DraggableToolbar: React.FC<DraggableToolbarProps> = ({
  onOpenPomodoro,
  onOpenMusic,
  onOpenTasks,
  onOpenBackground,
}) => {
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('toolbar-position');
    return saved ? JSON.parse(saved) : { x: window.innerWidth / 2 - 200, y: window.innerHeight - 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && 
        (e.target.tagName === 'BUTTON' || e.target.closest('button'))) {
      return; // Don't start dragging if clicking on buttons
    }

    setIsDragging(true);
    const rect = toolbarRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Keep toolbar within viewport bounds
    const maxX = window.innerWidth - (toolbarRef.current?.offsetWidth || 400);
    const maxY = window.innerHeight - (toolbarRef.current?.offsetHeight || 80);

    const constrainedPosition = {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    };

    setPosition(constrainedPosition);
    localStorage.setItem('toolbar-position', JSON.stringify(constrainedPosition));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle window resize to keep toolbar in bounds
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - (toolbarRef.current?.offsetWidth || 400);
      const maxY = window.innerHeight - (toolbarRef.current?.offsetHeight || 80);
      
      setPosition(prev => {
        const newPosition = {
          x: Math.max(0, Math.min(prev.x, maxX)),
          y: Math.max(0, Math.min(prev.y, maxY)),
        };
        localStorage.setItem('toolbar-position', JSON.stringify(newPosition));
        return newPosition;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "fixed bg-widget-background/95 border border-widget-border rounded-2xl shadow-toolbar backdrop-blur-sm z-50 transition-all duration-200",
        isDragging && "cursor-grabbing scale-105",
        !isDragging && "cursor-grab hover:bg-widget-background"
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center gap-2 py-3 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenPomodoro}
          className="flex flex-col items-center gap-1 h-auto py-2 px-3 hover:bg-primary/10 hover:text-primary transition-smooth group cursor-pointer"
        >
          <Timer className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium">Timer</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenMusic}
          className="flex flex-col items-center gap-1 h-auto py-2 px-3 hover:bg-primary/10 hover:text-primary transition-smooth group cursor-pointer"
        >
          <Music className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium">Música</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenTasks}
          className="flex flex-col items-center gap-1 h-auto py-2 px-3 hover:bg-primary/10 hover:text-primary transition-smooth group cursor-pointer"
        >
          <CheckSquare className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium">Tarefas</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenBackground}
          className="flex flex-col items-center gap-1 h-auto py-2 px-3 hover:bg-primary/10 hover:text-primary transition-smooth group cursor-pointer"
        >
          <Palette className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium">Fundo</span>
        </Button>
      </div>
    </div>
  );
};
