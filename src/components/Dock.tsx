import React, { useState, useRef, useCallback, useEffect } from "react";
import { Timer, Music, CheckSquare, Palette, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type DockItem = {
  id: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
};

interface DockProps {
  activeItem?: string;
  onTimerClick: () => void;
  onMusicClick: () => void;
  onTasksClick: () => void;
  onBackgroundClick: () => void;
  onProfileClick: () => void;
}

export const Dock: React.FC<DockProps> = ({
  activeItem,
  onTimerClick,
  onMusicClick,
  onTasksClick,
  onBackgroundClick,
  onProfileClick,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") {
      return { x: 0, y: 0 };
    }

    const saved = localStorage.getItem("dock-position");
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      x: window.innerWidth / 2 - 200,
      y: window.innerHeight - 120,
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (
      event.target instanceof HTMLElement &&
      (event.target.tagName === "BUTTON" || event.target.closest("button"))
    ) {
      return;
    }

    event.preventDefault();
    setIsDragging(true);
    const rect = dockRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffsetRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    event.preventDefault();
    const newX = event.clientX - dragOffsetRef.current.x;
    const newY = event.clientY - dragOffsetRef.current.y;

    const dockWidth = dockRef.current?.offsetWidth || 380;
    const dockHeight = dockRef.current?.offsetHeight || 100;
    const maxX = window.innerWidth - dockWidth - 16;
    const maxY = window.innerHeight - dockHeight - 16;

    const constrained = {
      x: Math.max(16, Math.min(newX, maxX)),
      y: Math.max(16, Math.min(newY, maxY)),
    };
    setPosition(constrained);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setPosition((current) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("dock-position", JSON.stringify(current));
      }
      return current;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = localStorage.getItem("dock-position");
    if (!saved) {
      setPosition({
        x: window.innerWidth / 2 - 200,
        y: window.innerHeight - 120,
      });
    }
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

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const dockWidth = dockRef.current?.offsetWidth || 380;
        const dockHeight = dockRef.current?.offsetHeight || 100;
        const maxX = window.innerWidth - dockWidth - 16;
        const maxY = window.innerHeight - dockHeight - 16;
        return {
          x: Math.max(16, Math.min(prev.x, maxX)),
          y: Math.max(16, Math.min(prev.y, maxY)),
        };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const items: DockItem[] = [
    { id: "timer", icon: Timer, label: "Timer", onClick: onTimerClick },
    { id: "music", icon: Music, label: "Música", onClick: onMusicClick },
    { id: "tasks", icon: CheckSquare, label: "Tarefas", onClick: onTasksClick },
    { id: "background", icon: Palette, label: "Fundo", onClick: onBackgroundClick },
    { id: "profile", icon: User, label: "Perfil", onClick: onProfileClick },
  ];

  return (
    <motion.div
      ref={dockRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn(
        "fixed z-50 rounded-full",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="zen-glass rounded-full px-6 py-3 flex items-center gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          const isHovered = hoveredItem === item.id;

          return (
            <div key={item.id} className="relative flex flex-col items-center">
              <motion.button
                onClick={item.onClick}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-200 relative",
                  isActive
                    ? "text-blue-400 bg-white/5"
                    : "text-white/60 hover:text-white/90 hover:bg-white/5"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full"
                  />
                )}
              </motion.button>

              {/* Tooltip */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 rounded text-xs text-white/90 whitespace-nowrap pointer-events-none"
                >
                  {item.label}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

