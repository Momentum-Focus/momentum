import React, { useRef, useState, useEffect, useCallback } from "react";
import { X, Minus, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DraggableWidgetProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  title,
  children,
  onClose,
  className,
  defaultPosition = { x: 100, y: 100 },
  onPositionChange,
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const widgetSizeRef = useRef({ width: 300, height: 200 });
  const positionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    setPosition(adjustedPosition);

    // Notifica a posição ajustada se necessário
    if (
      adjustedPosition.x !== defaultPosition.x ||
      adjustedPosition.y !== defaultPosition.y
    ) {
      if (onPositionChange) {
        onPositionChange(adjustedPosition);
      }
    }
  }, [defaultPosition, onPositionChange, adjustPositionToViewport]);

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

        // Atualiza posição imediatamente para resposta visual
        setPosition(newPosition);

        // Debounce da notificação de mudança de posição (só salva quando parar de arrastar)
        // Isso reduz re-renders desnecessários no componente pai
        if (positionChangeTimeoutRef.current) {
          clearTimeout(positionChangeTimeoutRef.current);
        }
        positionChangeTimeoutRef.current = setTimeout(() => {
          if (onPositionChange) {
            onPositionChange(newPosition);
          }
        }, 100); // Salva após 100ms sem movimento
      });
    },
    [onPositionChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);

    // Cancela qualquer timeout pendente
    if (positionChangeTimeoutRef.current) {
      clearTimeout(positionChangeTimeoutRef.current);
      positionChangeTimeoutRef.current = null;
    }

    // Notifica a posição final imediatamente
    setPosition((currentPos) => {
      if (onPositionChange) {
        onPositionChange(currentPos);
      }
      return currentPos;
    });

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [onPositionChange]);

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
      if (positionChangeTimeoutRef.current) {
        clearTimeout(positionChangeTimeoutRef.current);
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={widgetRef}
      className={cn(
        "fixed bg-widget-background border border-widget-border rounded-lg shadow-widget backdrop-blur-sm bg-opacity-95 z-40",
        // Remove transição durante o arraste para melhor performance
        !isDragging && "transition-all duration-200",
        isDragging && "cursor-grabbing will-change-transform",
        !isDragging && "cursor-grab",
        isMinimized && "h-auto",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        // Usa transform durante o arraste para melhor performance (GPU acceleration)
        transform: isDragging ? "translateZ(0)" : undefined,
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
            {isMinimized ? (
              <Square className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
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
      {!isMinimized && <div className="overflow-hidden">{children}</div>}
    </div>
  );
};
