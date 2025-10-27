import React, { useRef, useState, useEffect } from 'react';
import { X, Minus, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DraggableWidgetProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  defaultPosition?: { x: number; y: number };
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  title,
  children,
  onClose,
  className,
  defaultPosition = { x: 100, y: 100 },
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && 
        (e.target.tagName === 'BUTTON' || e.target.closest('button'))) {
      return; // Don't start dragging if clicking on buttons
    }

    setIsDragging(true);
    const rect = widgetRef.current?.getBoundingClientRect();
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

    // Keep widget within viewport bounds
    const maxX = window.innerWidth - (widgetRef.current?.offsetWidth || 300);
    const maxY = window.innerHeight - (widgetRef.current?.offsetHeight || 200);

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
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

  return (
    <div
      ref={widgetRef}
      className={cn(
        "fixed bg-widget-background border border-widget-border rounded-lg shadow-widget backdrop-blur-sm bg-opacity-95 z-40 transition-all duration-200",
        isDragging && "cursor-grabbing scale-105",
        !isDragging && "cursor-grab",
        isMinimized && "h-auto",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-3 border-b border-widget-border bg-gradient-subtle rounded-t-lg">
        <h3 className="font-medium text-foreground select-none">{title}</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            {isMinimized ? <Square className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Widget Content */}
      {!isMinimized && (
        <div className="overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
};
