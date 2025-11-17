import React, { useState } from "react";
import { DraggableToolbar } from "./DraggableToolbar";
import { PomodoroWidget } from "./widgets/PomodoroWidget";
import { MusicWidget } from "./widgets/MusicWidget";
import { TasksWidget } from "./widgets/TasksWidget";
import { BackgroundSelector } from "./BackgroundSelector";
import { ProfileModal } from "./ProfileModal";
import momentumLogo from "@/assets/momentum-logo.png";

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

  // Rastrear posições dos widgets abertos
  const [widgetPositions, setWidgetPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  // Posição padrão para todos os widgets
  const DEFAULT_POSITION = { x: 100, y: 100 };
  // Usar tamanho maior para garantir margem de segurança na verificação
  const WIDGET_SIZE = { width: 420, height: 400 }; // Tamanho aproximado dos widgets (inclui margem)
  const OFFSET_STEP = 80; // Passo maior para garantir espaçamento adequado

  // Função para verificar se duas posições se sobrepõem
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

  // Função para verificar se uma posição mantém o widget completamente dentro da viewport
  const isPositionWithinViewport = (
    position: { x: number; y: number },
    size: { width: number; height: number }
  ): boolean => {
    const margin = 10; // Margem mínima das bordas
    return (
      position.x >= margin &&
      position.y >= margin &&
      position.x + size.width <= window.innerWidth - margin &&
      position.y + size.height <= window.innerHeight - margin
    );
  };

  // Função para calcular posição que não sobreponha widgets existentes
  const getWidgetPosition = (
    widgetId: "pomodoro" | "music" | "tasks" | "background",
    excludeWidgetId?: boolean, // Se true, não inclui o próprio widget na lista de ocupados
    forceRecalculate?: boolean // Se true, recalcula mesmo se já tiver posição salva
  ): { x: number; y: number } => {
    // Se este widget já tem uma posição salva e não está forçando recálculo, verifica se ainda é válida
    if (widgetPositions[widgetId] && !forceRecalculate) {
      const savedPos = widgetPositions[widgetId];
      // Verifica se a posição salva ainda não sobrepõe nenhum widget
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
      // Se não é válida, continua para recalcular
    }

    // Lista de widgets abertos com suas posições (exceto o atual se excludeWidgetId for true)
    const openWidgetsWithPositions: {
      id: string;
      pos: { x: number; y: number };
    }[] = [];

    // Se excludeWidgetId for true, exclui o widget atual da lista
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

    // Pega as posições dos widgets já abertos
    const occupiedPositions = openWidgetsWithPositions.map((w) => w.pos);

    // Tenta a posição padrão primeiro
    let candidatePosition = { ...DEFAULT_POSITION };

    // Garante que a posição padrão está dentro da viewport
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

    // Verifica se a posição padrão está livre E dentro da viewport
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

    // Se não está livre, encontra uma posição que não sobreponha
    // Padrão SIMPLES: tenta posições em sequência
    // Primeiro: direita (1,0), depois baixo (0,1), depois diagonal (1,1), etc.
    let attempt = 0;
    const maxAttempts = 300; // Muitas tentativas para garantir

    while (attempt < maxAttempts) {
      // Sequência simples: (1,0), (0,1), (1,1), (2,0), (0,2), (2,1), (1,2), (2,2), (3,0), ...
      let gridX = 0;
      let gridY = 0;

      // Sequência determinística
      if (attempt === 0) {
        gridX = 1;
        gridY = 0;
      } else if (attempt === 1) {
        gridX = 0;
        gridY = 1;
      } else {
        // Para o resto, usa um padrão que percorre a grade de forma sistemática
        const ringSize = Math.ceil(Math.sqrt(attempt));
        const indexInRing = attempt - (ringSize - 1) ** 2;

        if (indexInRing < ringSize) {
          // Lado direito do quadrado
          gridX = ringSize;
          gridY = indexInRing;
        } else if (indexInRing < ringSize * 2) {
          // Lado inferior
          gridX = ringSize * 2 - indexInRing - 1;
          gridY = ringSize;
        } else if (indexInRing < ringSize * 3) {
          // Lado esquerdo
          gridX = 0;
          gridY = ringSize * 3 - indexInRing - 1;
        } else {
          // Lado superior
          gridX = indexInRing - ringSize * 3 + 1;
          gridY = 0;
        }
      }

      candidatePosition = {
        x: DEFAULT_POSITION.x + gridX * OFFSET_STEP,
        y: DEFAULT_POSITION.y + gridY * OFFSET_STEP,
      };

      // Garante que não sai da tela - ajusta para que o widget fique completamente dentro
      const margin = 10; // Margem mínima das bordas
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

      // CRÍTICO: Verifica duas coisas:
      // 1. Se esta posição está livre (não sobrepõe nenhum widget existente)
      // 2. Se o widget fica completamente dentro da viewport
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

    // Se não encontrou posição livre após todas as tentativas, retorna a última tentativa
    // (isso não deveria acontecer, mas é um fallback)

    return candidatePosition;
  };

  // Função para atualizar posição de um widget quando ele é movido
  const updateWidgetPosition = (
    widgetId: "pomodoro" | "music" | "tasks" | "background",
    position: { x: number; y: number }
  ) => {
    setWidgetPositions((prev) => ({
      ...prev,
      [widgetId]: position,
    }));
  };

  // Função para lidar com o fim do arraste e detectar sobreposições
  const handleDragEnd = (
    draggedWidgetId: "pomodoro" | "music" | "tasks" | "background",
    finalPosition: { x: number; y: number }
  ) => {
    // Atualiza a posição do widget que foi arrastado
    updateWidgetPosition(draggedWidgetId, finalPosition);

    // Aguarda um frame para garantir que o DOM foi atualizado
    requestAnimationFrame(() => {
      // Obtém o tamanho real do widget arrastado usando a posição final
      const draggedWidgetElement = document.querySelector(
        `[data-widget-id="${draggedWidgetId}"]`
      ) as HTMLElement;

      if (!draggedWidgetElement) return;

      const draggedSize = {
        width: draggedWidgetElement.offsetWidth,
        height: draggedWidgetElement.offsetHeight,
      };

      // Lista de widgets a verificar
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

      // Para cada widget, verifica sobreposição usando posições reais do DOM
      widgetsToCheck.forEach((widget) => {
        const otherWidgetElement = document.querySelector(
          `[data-widget-id="${widget.id}"]`
        ) as HTMLElement;

        if (!otherWidgetElement) return;

        // Obtém posição real do DOM (não do estado)
        const otherRect = otherWidgetElement.getBoundingClientRect();
        const otherPosition = {
          x: otherRect.left,
          y: otherRect.top,
        };

        const otherSize = {
          width: otherWidgetElement.offsetWidth,
          height: otherWidgetElement.offsetHeight,
        };

        // Obtém posição do widget arrastado usando getBoundingClientRect
        const draggedRect = draggedWidgetElement.getBoundingClientRect();
        const draggedActualPosition = {
          x: draggedRect.left,
          y: draggedRect.top,
        };

        // Verifica se há sobreposição
        if (
          positionsOverlap(draggedActualPosition, otherPosition, draggedSize) ||
          positionsOverlap(otherPosition, draggedActualPosition, otherSize)
        ) {
          // Encontra uma nova posição livre para o widget sobreposto
          // Exclui o widget arrastado e o próprio widget da lista
          const newPosition = getWidgetPosition(widget.id, true, true);

          // Atualiza a posição do widget sobreposto
          updateWidgetPosition(widget.id, newPosition);
        }
      });
    });
  };

  // Limpa posição quando widget fecha
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
    }
  };

  const handleTaskComplete = () => {
    setActiveTask(null);
  };

  return (
    <div
      className="min-h-screen bg-background relative overflow-hidden transition-all duration-500"
      style={{
        backgroundImage: currentBackground
          ? `url(${currentBackground})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Main Content Area */}
      {!currentBackground && (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center">
            <div className="flex flex-col items-center space-y-4 mb-8">
              <img
                src={momentumLogo}
                alt="Momentum"
                className="w-20 h-20 animate-float"
              />
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
          onClose={() => {
            setShowPomodoro(false);
            clearWidgetPosition("pomodoro");
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
        <BackgroundSelector
          onClose={() => {
            setShowBackground(false);
            clearWidgetPosition("background");
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

      {/* Draggable Toolbar */}
      <DraggableToolbar
        onOpenPomodoro={() => {
          if (!showPomodoro) {
            const initialPos = getWidgetPosition("pomodoro", true, true);
            setWidgetPositions((prev) => ({
              ...prev,
              pomodoro: initialPos,
            }));
          }
          setShowPomodoro(true);
        }}
        onOpenMusic={() => {
          if (!showMusic) {
            const initialPos = getWidgetPosition("music", true, true);
            setWidgetPositions((prev) => ({
              ...prev,
              music: initialPos,
            }));
          }
          setShowMusic(true);
        }}
        onOpenTasks={() => {
          if (!showTasks) {
            const initialPos = getWidgetPosition("tasks", true, true);
            setWidgetPositions((prev) => ({
              ...prev,
              tasks: initialPos,
            }));
          }
          setShowTasks(true);
        }}
        onOpenBackground={() => {
          if (!showBackground) {
            const initialPos = getWidgetPosition("background", true, true);
            setWidgetPositions((prev) => ({
              ...prev,
              background: initialPos,
            }));
          }
          setShowBackground(true);
        }}
        onOpenProfile={() => setShowProfile(true)}
      />

      {/* Profile Modal */}
      <ProfileModal open={showProfile} onOpenChange={setShowProfile} />
    </div>
  );
};

export default FocusApp;
