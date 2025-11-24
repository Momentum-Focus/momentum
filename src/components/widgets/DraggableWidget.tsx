import React, { useRef, useState, useEffect, useCallback } from "react";
import { X, Minus, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableWidgetProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
  headerActions?: React.ReactNode;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  title,
  children,
  onClose,
  className,
  defaultPosition = { x: 100, y: 100 },
  onPositionChange,
  onDragEnd,
  widgetId,
  headerActions,
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const widgetSizeRef = useRef({ width: 300, height: 200 });
  const isInitialMountRef = useRef(true);

  // Função para ajustar posição para ficar dentro da viewport
  const adjustPositionToViewport = useCallback(
    (pos: { x: number; y: number }) => {
      const widgetWidth = widgetRef.current?.offsetWidth || 300;
      const widgetHeight = widgetRef.current?.offsetHeight || 200;
      const margin = 5;

      return {
        x: Math.max(
          margin,
          Math.min(pos.x, window.innerWidth - widgetWidth - margin)
        ),
        y: Math.max(
          margin,
          Math.min(pos.y, window.innerHeight - widgetHeight - margin)
        ),
      };
    },
    []
  );

  // Atualiza posição quando defaultPosition muda e garante que fica dentro da viewport
  useEffect(() => {
    const adjustedPosition = adjustPositionToViewport(defaultPosition);
    setPosition((prevPos) => {
      const positionChanged =
        adjustedPosition.x !== prevPos.x || adjustedPosition.y !== prevPos.y;

      if (positionChanged) {
        // Só notifica a posição se não for o mount inicial (evita atualização durante render)
        if (!isInitialMountRef.current && onPositionChange) {
          requestAnimationFrame(() => {
            onPositionChange(adjustedPosition);
          });
        }

        if (isInitialMountRef.current) {
          isInitialMountRef.current = false;
        }

        return adjustedPosition;
      }

      return prevPos;
    });
  }, [defaultPosition, adjustPositionToViewport]);

  // Ajusta posição quando a janela é redimensionada
  useEffect(() => {
    const handleResize = () => {
      setPosition((currentPos) => {
        const adjusted = adjustPositionToViewport(currentPos);
        if (adjusted.x !== currentPos.x || adjusted.y !== currentPos.y) {
          if (onPositionChange) {
            onPositionChange(adjusted);
          }
        }
        return adjusted;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustPositionToViewport, onPositionChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement &&
      (e.target.tagName === "BUTTON" || e.target.closest("button"))
    ) {
      return; // Don't start dragging if clicking on buttons
    }

    setIsDragging(true);

    // Atualiza tamanho do widget no início do arraste
    if (widgetRef.current) {
      widgetSizeRef.current = {
        width: widgetRef.current.offsetWidth,
        height: widgetRef.current.offsetHeight,
      };
    }

    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const newX = e.clientX - dragOffsetRef.current.x;
        const newY = e.clientY - dragOffsetRef.current.y;

        // Keep widget completely within viewport bounds (não pode cortar nenhuma parte)
        const margin = 5;
        const maxX = window.innerWidth - widgetSizeRef.current.width - margin;
        const maxY = window.innerHeight - widgetSizeRef.current.height - margin;

        const newPosition = {
          x: Math.max(margin, Math.min(newX, maxX)),
          y: Math.max(margin, Math.min(newY, maxY)),
        };

        // Atualiza posição imediatamente para resposta visual sem delay
        setPosition(newPosition);

        // Notifica a posição imediatamente durante o arraste (sem debounce para melhor responsividade)
        if (onPositionChange) {
          onPositionChange(newPosition);
        }
      });
    },
    [onPositionChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);

    // Notifica a posição final e chama onDragEnd para detectar sobreposições
    setPosition((currentPos) => {
      if (onPositionChange) {
        onPositionChange(currentPos);
      }
      // Notifica que o arraste terminou (para verificar sobreposição com outros widgets)
      if (onDragEnd) {
        // Usa setTimeout para garantir que o DOM foi atualizado antes de verificar sobreposição
        setTimeout(() => {
          onDragEnd(currentPos);
        }, 0);
      }
      return currentPos;
    });

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [onPositionChange, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={widgetRef}
      data-widget-id={widgetId}
      className={cn(
        "fixed zen-widget z-40",
        !isDragging && "transition-all duration-200",
        isDragging && "cursor-grabbing will-change-transform transition-none",
        !isDragging && "cursor-grab",
        isMinimized && "h-auto",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: isDragging ? "translateZ(0)" : undefined,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3
          className="text-sm font-medium zen-text-ghost select-none"
          style={{ fontWeight: 500 }}
        >
          {title}
        </h3>
        <div className="flex items-center gap-1">
          {headerActions}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0 rounded hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            {isMinimized ? (
              <Square className="h-3 w-3 zen-text-muted" strokeWidth={1.5} />
            ) : (
              <Minus className="h-3 w-3 zen-text-muted" strokeWidth={1.5} />
            )}
          </button>
          <button
            onClick={onClose}
            className="h-6 w-6 p-0 rounded hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            <X
              className="h-3 w-3 zen-text-muted hover:zen-text-ghost transition-colors"
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>

      {!isMinimized && <div className="overflow-hidden">{children}</div>}
    </div>
  );
};
