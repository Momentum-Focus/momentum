import React, { useState } from "react";
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

const FocusApp = () => {
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [currentBackground, setCurrentBackground] = useState<string>("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeDockItem, setActiveDockItem] = useState<string | null>(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const { data: user } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => api.get("/user").then((res) => res.data),
    retry: 1,
    enabled: !!token,
  });

  const handleLogout = () => {
    localStorage.removeItem("authToken");
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
      setShowProfile(true);
      setActiveDockItem("profile");
      return;
    }

    const widgetKey = widgetId as "pomodoro" | "music" | "tasks" | "background";
    setActiveDockItem(widgetKey);

    if (widgetId === "pomodoro" && !showPomodoro) {
      const initialPos = getWidgetPosition("pomodoro", true, true);
      setWidgetPositions((prev) => ({
        ...prev,
        pomodoro: initialPos,
      }));
      setShowPomodoro(true);
    } else if (widgetId === "music" && !showMusic) {
      const initialPos = getWidgetPosition("music", true, true);
      setWidgetPositions((prev) => ({
        ...prev,
        music: initialPos,
      }));
      setShowMusic(true);
    } else if (widgetId === "tasks" && !showTasks) {
      const initialPos = getWidgetPosition("tasks", true, true);
      setWidgetPositions((prev) => ({
        ...prev,
        tasks: initialPos,
      }));
      setShowTasks(true);
    } else if (widgetId === "background" && !showBackground) {
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
            setActiveDockItem(null);
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
            setActiveDockItem(null);
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
            setActiveDockItem(null);
          }}
          onTaskStart={handleTaskStart}
          defaultPosition={
            widgetPositions["tasks"] || getWidgetPosition("tasks")
          }
          onPositionChange={(pos) => updateWidgetPosition("tasks", pos)}
          onDragEnd={(pos) => handleDragEnd("tasks", pos)}
          widgetId="tasks"
        />
      )}

      {showBackground && (
        <BackgroundWidget
          onClose={() => {
            setShowBackground(false);
            clearWidgetPosition("background");
            setActiveDockItem(null);
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
          activeItem={activeDockItem || undefined}
          onTimerClick={() => handleOpenWidget("pomodoro")}
          onMusicClick={() => handleOpenWidget("music")}
          onTasksClick={() => handleOpenWidget("tasks")}
          onBackgroundClick={() => handleOpenWidget("background")}
          onProfileClick={() => handleOpenWidget("profile")}
        />

      {/* Profile Modal */}
      <ProfileModal
        open={showProfile}
        onOpenChange={(open) => {
          setShowProfile(open);
          if (!open) {
            setActiveDockItem(null);
          }
        }}
      />
    </Layout>
  );
};

export default FocusApp;
