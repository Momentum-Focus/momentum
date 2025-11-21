import React, { useRef, useState, useEffect, useCallback } from "react";
import { Timer, Music, CheckSquare, Palette, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableToolbarProps {
  onOpenPomodoro: () => void;
  onOpenMusic: () => void;
  onOpenTasks: () => void;
  onOpenBackground: () => void;
  onOpenProfile: () => void;
}

export const DraggableToolbar: React.FC<DraggableToolbarProps> = ({
  onOpenPomodoro,
  onOpenMusic,
  onOpenTasks,
  onOpenBackground,
  onOpenProfile,
}) => {
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem("toolbar-position");
    return saved
      ? JSON.parse(saved)
      : { x: window.innerWidth / 2 - 200, y: window.innerHeight - 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement &&
      (e.target.tagName === "BUTTON" || e.target.closest("button"))
    ) {
      return; // Don't start dragging if clicking on buttons
    }

    // Prevenir seleção de texto durante o arraste
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    const rect = toolbarRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Prevenir seleção de texto durante o arraste
    e.preventDefault();

    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;

    // Keep toolbar within viewport bounds
    const toolbarWidth = toolbarRef.current?.offsetWidth || 400;
    const toolbarHeight = toolbarRef.current?.offsetHeight || 80;
    const maxX = window.innerWidth - toolbarWidth;
    const maxY = window.innerHeight - toolbarHeight;

    const constrainedPosition = {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    };

    setPosition(constrainedPosition);
    // Salvar no localStorage apenas no final do arraste (no handleMouseUp)
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);

    // Salvar posição no localStorage ao finalizar o arraste
    setPosition((currentPos) => {
      localStorage.setItem("toolbar-position", JSON.stringify(currentPos));
      return currentPos;
    });
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle window resize to keep toolbar in bounds
  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - (toolbarRef.current?.offsetWidth || 400);
      const maxY =
        window.innerHeight - (toolbarRef.current?.offsetHeight || 80);

      setPosition((prev) => {
        const newPosition = {
          x: Math.max(0, Math.min(prev.x, maxX)),
          y: Math.max(0, Math.min(prev.y, maxY)),
        };
        localStorage.setItem("toolbar-position", JSON.stringify(newPosition));
        return newPosition;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "fixed zen-dock z-50",
        isDragging && "cursor-grabbing scale-105 transition-none select-none",
        !isDragging && "cursor-grab transition-all duration-200"
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center gap-1 py-2 px-3 select-none">
        <button
          onClick={onOpenPomodoro}
          className="flex flex-col items-center justify-center gap-1 h-14 w-14 rounded-xl hover:bg-white/10 transition-all duration-200 group relative"
        >
          <Timer className="h-5 w-5 zen-text-ghost group-hover:scale-110 transition-transform" strokeWidth={1.5} />
          <span className="text-[10px] font-medium zen-text-muted group-hover:zen-text-ghost transition-colors">
            Timer
          </span>
        </button>

        <button
          onClick={onOpenMusic}
          className="flex flex-col items-center justify-center gap-1 h-14 w-14 rounded-xl hover:bg-white/10 transition-all duration-200 group relative"
        >
          <Music className="h-5 w-5 zen-text-ghost group-hover:scale-110 transition-transform" strokeWidth={1.5} />
          <span className="text-[10px] font-medium zen-text-muted group-hover:zen-text-ghost transition-colors">
            Música
          </span>
        </button>

        <button
          onClick={onOpenTasks}
          className="flex flex-col items-center justify-center gap-1 h-14 w-14 rounded-xl hover:bg-white/10 transition-all duration-200 group relative"
        >
          <CheckSquare className="h-5 w-5 zen-text-ghost group-hover:scale-110 transition-transform" strokeWidth={1.5} />
          <span className="text-[10px] font-medium zen-text-muted group-hover:zen-text-ghost transition-colors">
            Tarefas
          </span>
        </button>

        <button
          onClick={onOpenBackground}
          className="flex flex-col items-center justify-center gap-1 h-14 w-14 rounded-xl hover:bg-white/10 transition-all duration-200 group relative"
        >
          <Palette className="h-5 w-5 zen-text-ghost group-hover:scale-110 transition-transform" strokeWidth={1.5} />
          <span className="text-[10px] font-medium zen-text-muted group-hover:zen-text-ghost transition-colors">
            Fundo
          </span>
        </button>

        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center gap-1 h-14 w-14 rounded-xl hover:bg-white/10 transition-all duration-200 group relative"
        >
          <User className="h-5 w-5 zen-text-ghost group-hover:scale-110 transition-transform" strokeWidth={1.5} />
          <span className="text-[10px] font-medium zen-text-muted group-hover:zen-text-ghost transition-colors">
            Perfil
          </span>
        </button>
      </div>
    </div>
  );
};
