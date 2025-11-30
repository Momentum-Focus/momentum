import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Timer,
  Music,
  CheckSquare,
  Palette,
  User,
  Folder,
  BarChart3,
  Headphones,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme-context";

type DockItem = {
  id: string;
  icon: React.ComponentType<any>;
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
  onProjectsClick: () => void;
  onReportsClick: () => void;
  onSupportClick: () => void;
}

export const Dock: React.FC<DockProps> = ({
  activeItem,
  onTimerClick,
  onMusicClick,
  onTasksClick,
  onBackgroundClick,
  onProfileClick,
  onProjectsClick,
  onReportsClick,
  onSupportClick,
}) => {
  const { themeColor } = useTheme();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("dock-collapsed");
    return saved === "true";
  });
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

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("dock-collapsed", String(newState));
      }
      return newState;
    });
  }, []);

  // Handle drag end to save position
  const handleDragEnd = useCallback(
    (event: any, info: any) => {
      const dockWidth = dockRef.current?.offsetWidth || 380;
      const dockHeight = dockRef.current?.offsetHeight || 60;
      const maxX = window.innerWidth - dockWidth - 16;
      const maxY = window.innerHeight - dockHeight - 16;

      const newX = Math.max(16, Math.min(position.x + info.offset.x, maxX));
      const newY = Math.max(16, Math.min(position.y + info.offset.y, maxY));

      const finalPosition = { x: newX, y: newY };
      setPosition(finalPosition);

      if (typeof window !== "undefined") {
        localStorage.setItem("dock-position", JSON.stringify(finalPosition));
      }
    },
    [position]
  );

  const items: DockItem[] = [
    { id: "timer", icon: Timer, label: "Timer", onClick: onTimerClick },
    { id: "music", icon: Music, label: "Música", onClick: onMusicClick },
    { id: "tasks", icon: CheckSquare, label: "Tarefas", onClick: onTasksClick },
    {
      id: "projects",
      icon: Folder,
      label: "Projetos",
      onClick: onProjectsClick,
    },
    {
      id: "reports",
      icon: BarChart3,
      label: "Relatórios",
      onClick: onReportsClick,
    },
    {
      id: "background",
      icon: Palette,
      label: "Fundo",
      onClick: onBackgroundClick,
    },
    { id: "profile", icon: User, label: "Perfil", onClick: onProfileClick },
    {
      id: "support",
      icon: Headphones,
      label: "Suporte",
      onClick: onSupportClick,
    },
  ];

  return (
    <motion.div
      ref={dockRef}
      initial={{ opacity: 0, x: position.x, y: position.y + 20 }}
      animate={{
        x: position.x,
        y: position.y,
        opacity: 1,
      }}
      className="fixed z-50 rounded-full cursor-grab active:cursor-grabbing"
      drag
      dragMomentum={false}
      dragElastic={0}
      dragPropagation={false}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: "grabbing" }}
      dragTransition={{ power: 0, timeConstant: 0 }}
      transition={{
        opacity: { duration: 0.3, delay: 0.1 },
        x: { duration: 0 },
        y: { duration: 0 },
        default: { duration: 0 },
      }}
    >
      <motion.div
        className="zen-glass rounded-full flex items-center gap-4"
        animate={{
          paddingLeft: isCollapsed ? "0.75rem" : "1rem",
          paddingRight: isCollapsed ? "0.75rem" : "1rem",
          paddingTop: "0.5rem",
          paddingBottom: "0.5rem",
        }}
        transition={{
          layout: { duration: 0.15, ease: "easeOut" },
          default: { duration: 0.15, ease: "easeOut" },
        }}
        layout
      >
        {/* Botão Toggle */}
        <motion.button
          data-dock-toggle
          onClick={handleToggleCollapse}
          className="aspect-square h-10 w-10 rounded-2xl flex items-center justify-center relative flex-shrink-0 text-white/60 hover:text-white/90 hover:bg-white/10"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isCollapsed ? (
              <motion.div
                key="menu"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <Menu className="h-5 w-5" strokeWidth={1.5} />
              </motion.div>
            ) : (
              <motion.div
                key="close"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Ícones do Dock */}
        {!isCollapsed && (
          <motion.div
            className="flex items-center gap-4 overflow-hidden"
            layout
          >
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              const isHovered = hoveredItem === item.id;

              return (
                <div
                  key={item.id}
                  className="relative flex flex-col items-center"
                >
                  <motion.button
                    onClick={item.onClick}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={cn(
                      "aspect-square h-10 w-10 rounded-2xl flex items-center justify-center relative",
                      isActive
                        ? "bg-white/10"
                        : "text-white/60 hover:text-white/90 hover:bg-white/10"
                    )}
                    style={isActive ? { color: themeColor } : {}}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-1 w-1 h-1 rounded-full"
                        style={{ backgroundColor: themeColor }}
                      />
                    )}
                  </motion.button>

                  {/* Tooltip */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 rounded text-xs text-white/90 whitespace-nowrap pointer-events-none z-50"
                    >
                      {item.label}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};
