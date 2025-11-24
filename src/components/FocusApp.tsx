import React, { useState, useEffect } from "react";
import { Layout } from "./Layout";
import { Dock } from "./Dock";
import { TimerWidget } from "./widgets/TimerWidget";
import { MusicWidget } from "./widgets/MusicWidget";
import { TasksWidget } from "./widgets/TasksWidget";
import { BackgroundWidget } from "./widgets/BackgroundWidget";
import { ProfileModal } from "./ProfileModal";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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

export type PomodoroMode = "focus" | "short-break" | "long-break";

interface FocusAppProps {
  isGuestMode?: boolean;
  user?: { id: number; name: string; email: string };
}

const FocusApp: React.FC<FocusAppProps> = ({
  isGuestMode = false,
  user: userProp,
}) => {
  // Persistência de widgets abertos no localStorage
  const loadWidgetState = () => {
    if (typeof window === "undefined") {
      return {
        showPomodoro: false,
        showMusic: false,
        showTasks: false,
        showBackground: false,
        showProfile: false,
      };
    }
    const saved = localStorage.getItem("momentum-widgets-state");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          showPomodoro: false,
          showMusic: false,
          showTasks: false,
          showBackground: false,
          showProfile: false,
        };
      }
    }
    return {
      showPomodoro: false,
      showMusic: false,
      showTasks: false,
      showBackground: false,
      showProfile: false,
    };
  };

  const saveWidgetState = (state: {
    showPomodoro: boolean;
    showMusic: boolean;
    showTasks: boolean;
    showBackground: boolean;
    showProfile: boolean;
  }) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("momentum-widgets-state", JSON.stringify(state));
    }
  };

  const initialState = loadWidgetState();
  const [showPomodoro, setShowPomodoro] = useState(initialState.showPomodoro);
  const [showMusic, setShowMusic] = useState(initialState.showMusic);
  const [showTasks, setShowTasks] = useState(initialState.showTasks);
  const [showBackground, setShowBackground] = useState(
    initialState.showBackground
  );
  const [showProfile, setShowProfile] = useState(initialState.showProfile);
  // Load background from localStorage
  const loadBackground = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("momentum-background");
      return saved || "";
    }
    return "";
  };

  const [currentBackground, setCurrentBackground] = useState<string>(
    loadBackground()
  );

  // Persist background to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (currentBackground) {
        localStorage.setItem("momentum-background", currentBackground);
      } else {
        localStorage.removeItem("momentum-background");
      }
    }
  }, [currentBackground]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeDockItem, setActiveDockItem] = useState<string | null>(null);

  // Salva estado dos widgets sempre que mudar
  useEffect(() => {
    saveWidgetState({
      showPomodoro,
      showMusic,
      showTasks,
      showBackground,
      showProfile,
    });
  }, [showPomodoro, showMusic, showTasks, showBackground, showProfile]);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const { data: userFromQuery } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    retry: 1,
    enabled: !!token && !isGuestMode,
    refetchOnMount: true, // Sempre refetch quando o componente monta
    refetchOnWindowFocus: false, // Não refetch quando a janela ganha foco
  });

  const user = userProp || userFromQuery;

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    sessionStorage.setItem("logoutSuccess", "true");
    window.location.reload();
  };

  const [widgetPositions, setWidgetPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const DEFAULT_POSITION = { x: 100, y: 100 };
  const WIDGET_SIZE = { width: 420, height: 400 };
  const OFFSET_STEP = 80;

  const positionsOverlap = (
    pos1: { x: number; y: number },
    pos2: { x: number; y: number },
    size: { width: number; height: number }
  ): boolean => {
    return (
      pos1.x < pos2.x + size.width &&
      pos1.x + size.width > pos2.x &&
      pos1.y < pos2.y + size.height &&
      pos1.y + size.height > pos2.y
    );
  };

  const isPositionWithinViewport = (
    position: { x: number; y: number },
    size: { width: number; height: number }
  ): boolean => {
    const margin = 10;
    return (
      position.x >= margin &&
      position.y >= margin &&
      position.x + size.width <= window.innerWidth - margin &&
      position.y + size.height <= window.innerHeight - margin
    );
  };

  const getWidgetPosition = (
    widgetId: "pomodoro" | "music" | "tasks" | "background",
    excludeWidgetId?: boolean,
    forceRecalculate?: boolean
  ): { x: number; y: number } => {
    if (widgetPositions[widgetId] && !forceRecalculate) {
      const savedPos = widgetPositions[widgetId];
      const widgetsToCheck = [
        showPomodoro && widgetId !== "pomodoro"
          ? {
              id: "pomodoro",
              pos: widgetPositions["pomodoro"] || DEFAULT_POSITION,
            }
          : null,
        showMusic && widgetId !== "music"
          ? { id: "music", pos: widgetPositions["music"] || DEFAULT_POSITION }
          : null,
        showTasks && widgetId !== "tasks"
          ? { id: "tasks", pos: widgetPositions["tasks"] || DEFAULT_POSITION }
          : null,
        showBackground && widgetId !== "background"
          ? {
              id: "background",
              pos: widgetPositions["background"] || DEFAULT_POSITION,
            }
          : null,
      ].filter(Boolean) as { id: string; pos: { x: number; y: number } }[];

      const isValid = !widgetsToCheck.some((w) =>
        positionsOverlap(savedPos, w.pos, WIDGET_SIZE)
      );

      if (isValid) {
        return savedPos;
      }
    }

    const openWidgetsWithPositions: {
      id: string;
      pos: { x: number; y: number };
    }[] = [];

    const shouldExclude = (id: string) =>
      excludeWidgetId === true && widgetId === id;

    if (showPomodoro && !shouldExclude("pomodoro")) {
      openWidgetsWithPositions.push({
        id: "pomodoro",
        pos: widgetPositions["pomodoro"] || DEFAULT_POSITION,
      });
    }
    if (showMusic && !shouldExclude("music")) {
      openWidgetsWithPositions.push({
        id: "music",
        pos: widgetPositions["music"] || DEFAULT_POSITION,
      });
    }
    if (showTasks && !shouldExclude("tasks")) {
      openWidgetsWithPositions.push({
        id: "tasks",
        pos: widgetPositions["tasks"] || DEFAULT_POSITION,
      });
    }
    if (showBackground && !shouldExclude("background")) {
      openWidgetsWithPositions.push({
        id: "background",
        pos: widgetPositions["background"] || DEFAULT_POSITION,
      });
    }

    const occupiedPositions = openWidgetsWithPositions.map((w) => w.pos);

    let candidatePosition = { ...DEFAULT_POSITION };

    const margin = 10;
    candidatePosition.x = Math.max(
      margin,
      Math.min(
        candidatePosition.x,
        window.innerWidth - WIDGET_SIZE.width - margin
      )
    );
    candidatePosition.y = Math.max(
      margin,
      Math.min(
        candidatePosition.y,
        window.innerHeight - WIDGET_SIZE.height - margin
      )
    );

    const defaultPositionFree = !occupiedPositions.some((pos) =>
      positionsOverlap(candidatePosition, pos, WIDGET_SIZE)
    );
    const defaultPositionInViewport = isPositionWithinViewport(
      candidatePosition,
      WIDGET_SIZE
    );

    if (defaultPositionFree && defaultPositionInViewport) {
      return candidatePosition;
    }

    let attempt = 0;
    const maxAttempts = 300;

    while (attempt < maxAttempts) {
      let gridX = 0;
      let gridY = 0;

      if (attempt === 0) {
        gridX = 1;
        gridY = 0;
      } else if (attempt === 1) {
        gridX = 0;
        gridY = 1;
      } else {
        const ringSize = Math.ceil(Math.sqrt(attempt));
        const indexInRing = attempt - (ringSize - 1) ** 2;

        if (indexInRing < ringSize) {
          gridX = ringSize;
          gridY = indexInRing;
        } else if (indexInRing < ringSize * 2) {
          gridX = ringSize * 2 - indexInRing - 1;
          gridY = ringSize;
        } else if (indexInRing < ringSize * 3) {
          gridX = 0;
          gridY = ringSize * 3 - indexInRing - 1;
        } else {
          gridX = indexInRing - ringSize * 3 + 1;
          gridY = 0;
        }
      }

      candidatePosition = {
        x: DEFAULT_POSITION.x + gridX * OFFSET_STEP,
        y: DEFAULT_POSITION.y + gridY * OFFSET_STEP,
      };

      const margin = 10;
      candidatePosition.x = Math.max(
        margin,
        Math.min(
          candidatePosition.x,
          window.innerWidth - WIDGET_SIZE.width - margin
        )
      );
      candidatePosition.y = Math.max(
        margin,
        Math.min(
          candidatePosition.y,
          window.innerHeight - WIDGET_SIZE.height - margin
        )
      );

      const isFree = !occupiedPositions.some((pos) =>
        positionsOverlap(candidatePosition, pos, WIDGET_SIZE)
      );
      const isWithinViewport = isPositionWithinViewport(
        candidatePosition,
        WIDGET_SIZE
      );

      if (isFree && isWithinViewport) {
        return candidatePosition;
      }

      attempt++;
    }

    return candidatePosition;
  };

  const updateWidgetPosition = (
    widgetId: "pomodoro" | "music" | "tasks" | "background",
    position: { x: number; y: number }
  ) => {
    setWidgetPositions((prev) => ({
      ...prev,
      [widgetId]: position,
    }));
  };

  const handleDragEnd = (
    draggedWidgetId: "pomodoro" | "music" | "tasks" | "background",
    finalPosition: { x: number; y: number }
  ) => {
    updateWidgetPosition(draggedWidgetId, finalPosition);

    requestAnimationFrame(() => {
      const draggedWidgetElement = document.querySelector(
        `[data-widget-id="${draggedWidgetId}"]`
      ) as HTMLElement;

      if (!draggedWidgetElement) return;

      const draggedSize = {
        width: draggedWidgetElement.offsetWidth,
        height: draggedWidgetElement.offsetHeight,
      };

      const widgetsToCheck: Array<{
        id: "pomodoro" | "music" | "tasks" | "background";
      }> = [];

      if (showPomodoro && draggedWidgetId !== "pomodoro") {
        widgetsToCheck.push({ id: "pomodoro" });
      }
      if (showMusic && draggedWidgetId !== "music") {
        widgetsToCheck.push({ id: "music" });
      }
      if (showTasks && draggedWidgetId !== "tasks") {
        widgetsToCheck.push({ id: "tasks" });
      }
      if (showBackground && draggedWidgetId !== "background") {
        widgetsToCheck.push({ id: "background" });
      }

      widgetsToCheck.forEach((widget) => {
        const otherWidgetElement = document.querySelector(
          `[data-widget-id="${widget.id}"]`
        ) as HTMLElement;

        if (!otherWidgetElement) return;

        const otherRect = otherWidgetElement.getBoundingClientRect();
        const otherPosition = {
          x: otherRect.left,
          y: otherRect.top,
        };

        const otherSize = {
          width: otherWidgetElement.offsetWidth,
          height: otherWidgetElement.offsetHeight,
        };

        const draggedRect = draggedWidgetElement.getBoundingClientRect();
        const draggedActualPosition = {
          x: draggedRect.left,
          y: draggedRect.top,
        };

        if (
          positionsOverlap(draggedActualPosition, otherPosition, draggedSize) ||
          positionsOverlap(otherPosition, draggedActualPosition, otherSize)
        ) {
          const newPosition = getWidgetPosition(widget.id, true, true);
          updateWidgetPosition(widget.id, newPosition);
        }
      });
    });
  };

  const clearWidgetPosition = (
    widgetId: "pomodoro" | "music" | "tasks" | "background"
  ) => {
    setWidgetPositions((prev) => {
      const newPositions = { ...prev };
      delete newPositions[widgetId];
      return newPositions;
    });
  };

  const handleTaskStart = (task: Task) => {
    setActiveTask(task);
    if (!showPomodoro) {
      setShowPomodoro(true);
      setActiveDockItem("timer");
    }
  };

  const handleTaskComplete = () => {
    setActiveTask(null);
  };

  const handleOpenWidget = (
    widgetId: "pomodoro" | "music" | "tasks" | "background" | "profile"
  ) => {
    if (widgetId === "profile") {
      // Toggle para profile
      if (showProfile) {
        setShowProfile(false);
        setActiveDockItem(null);
        return;
      }
      setShowProfile(true);
      setActiveDockItem("profile");
      return;
    }

    const widgetKey = widgetId as "pomodoro" | "music" | "tasks" | "background";

    // Toggle: se já está aberto, fecha
    if (widgetId === "pomodoro" && showPomodoro) {
      setShowPomodoro(false);
      setActiveDockItem(null);
      return;
    }
    if (widgetId === "music" && showMusic) {
      setShowMusic(false);
      setActiveDockItem(null);
      return;
    }
    if (widgetId === "tasks" && showTasks) {
      setShowTasks(false);
      setActiveDockItem(null);
      return;
    }
    if (widgetId === "background" && showBackground) {
      setShowBackground(false);
      setActiveDockItem(null);
      return;
    }

    // Se não está aberto, abre
    setActiveDockItem(widgetKey);

    if (widgetId === "pomodoro") {
      const initialPos = getWidgetPosition("pomodoro", true, true);
      setWidgetPositions((prev) => ({
        ...prev,
        pomodoro: initialPos,
      }));
      setShowPomodoro(true);
    }
    if (widgetId === "music") {
      const initialPos = getWidgetPosition("music", true, true);
      setWidgetPositions((prev) => ({
        ...prev,
        music: initialPos,
      }));
      setShowMusic(true);
    }
    if (widgetId === "tasks") {
      const initialPos = getWidgetPosition("tasks", true, true);
      setWidgetPositions((prev) => ({
        ...prev,
        tasks: initialPos,
      }));
      setShowTasks(true);
    }
    if (widgetId === "background") {
      const initialPos = getWidgetPosition("background", true, true);
      setWidgetPositions((prev) => ({
        ...prev,
        background: initialPos,
      }));
      setShowBackground(true);
    }
  };

  return (
    <Layout
      backgroundImage={currentBackground}
      userName={user?.name}
      onLogout={handleLogout}
    >
      {/* Widgets */}
      {showPomodoro && (
        <TimerWidget
          onClose={() => {
            setShowPomodoro(false);
            clearWidgetPosition("pomodoro");
            setActiveDockItem(
              activeDockItem === "pomodoro" ? null : activeDockItem
            );
          }}
          activeTask={activeTask}
          onTaskComplete={handleTaskComplete}
          defaultPosition={
            widgetPositions["pomodoro"] || getWidgetPosition("pomodoro")
          }
          onPositionChange={(pos) => updateWidgetPosition("pomodoro", pos)}
          onDragEnd={(pos) => handleDragEnd("pomodoro", pos)}
          widgetId="pomodoro"
        />
      )}

      {showMusic && (
        <MusicWidget
          onClose={() => {
            setShowMusic(false);
            clearWidgetPosition("music");
            setActiveDockItem(
              activeDockItem === "music" ? null : activeDockItem
            );
          }}
          defaultPosition={
            widgetPositions["music"] || getWidgetPosition("music")
          }
          onPositionChange={(pos) => updateWidgetPosition("music", pos)}
          onDragEnd={(pos) => handleDragEnd("music", pos)}
          widgetId="music"
        />
      )}

      {showTasks && (
        <TasksWidget
          onClose={() => {
            setShowTasks(false);
            clearWidgetPosition("tasks");
            setActiveDockItem(
              activeDockItem === "tasks" ? null : activeDockItem
            );
          }}
          onTaskStart={handleTaskStart}
          defaultPosition={
            widgetPositions["tasks"] || getWidgetPosition("tasks")
          }
          onPositionChange={(pos) => updateWidgetPosition("tasks", pos)}
          onDragEnd={(pos) => handleDragEnd("tasks", pos)}
          widgetId="tasks"
          isGuestMode={isGuestMode}
        />
      )}

      {showBackground && (
        <BackgroundWidget
          onClose={() => {
            setShowBackground(false);
            clearWidgetPosition("background");
            setActiveDockItem(
              activeDockItem === "background" ? null : activeDockItem
            );
          }}
          onBackgroundSelect={setCurrentBackground}
          currentBackground={currentBackground}
          defaultPosition={
            widgetPositions["background"] || getWidgetPosition("background")
          }
          onPositionChange={(pos) => updateWidgetPosition("background", pos)}
          onDragEnd={(pos) => handleDragEnd("background", pos)}
          widgetId="background"
        />
      )}

      {/* Dock */}
      <Dock
        activeItem={
          showPomodoro
            ? "pomodoro"
            : showMusic
            ? "music"
            : showTasks
            ? "tasks"
            : showBackground
            ? "background"
            : showProfile
            ? "profile"
            : undefined
        }
        onTimerClick={() => handleOpenWidget("pomodoro")}
        onMusicClick={() => handleOpenWidget("music")}
        onTasksClick={() => handleOpenWidget("tasks")}
        onBackgroundClick={() => handleOpenWidget("background")}
        onProfileClick={() => {
          if (isGuestMode) {
            // Em modo visitante, redirecionar para login
            window.location.href = "/login";
            return;
          }
          handleOpenWidget("profile");
        }}
      />

      {/* Profile Modal - apenas se não for visitante */}
      {!isGuestMode && (
        <ProfileModal
          open={showProfile}
          onOpenChange={(open) => {
            setShowProfile(open);
            if (!open) {
              setActiveDockItem(null);
            }
          }}
        />
      )}
    </Layout>
  );
};

export default FocusApp;
