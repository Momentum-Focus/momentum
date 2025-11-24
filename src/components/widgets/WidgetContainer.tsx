import React, { useRef, useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WidgetContainerProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onDragEnd?: (finalPosition: { x: number; y: number }) => void;
  widgetId?: string;
  draggable?: boolean;
  headerActions?: React.ReactNode;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  title,
  children,
  onClose,
  className,
  defaultPosition = { x: 100, y: 100 },
  onPositionChange,
  onDragEnd,
  widgetId,
  draggable = true,
  headerActions,
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetSizeRef = useRef({ width: 300, height: 200 });
  const isDraggingRef = useRef(false);
  const positionRef = useRef(defaultPosition);
  const rafIdRef = useRef<number | null>(null);

  // Função para ajustar posição dentro da viewport
  const adjustPositionToViewport = useCallback(
    (pos: { x: number; y: number }) => {
      const widgetWidth = widgetRef.current?.offsetWidth || 300;
      const widgetHeight = widgetRef.current?.offsetHeight || 200;
      const margin = 10;

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

  // Atualiza positionRef quando position muda
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Sincroniza com defaultPosition apenas quando não está arrastando
  useEffect(() => {
    if (!isDraggingRef.current) {
      const adjustedPosition = adjustPositionToViewport(defaultPosition);
      if (
        adjustedPosition.x !== positionRef.current.x ||
        adjustedPosition.y !== positionRef.current.y
      ) {
        setPosition(adjustedPosition);
      }
    }
  }, [defaultPosition, adjustPositionToViewport]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((currentPos) => adjustPositionToViewport(currentPos));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustPositionToViewport]);

  const headerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!draggable) return;

      // Verifica se o clique foi no header (drag handle)
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        return; // Não inicia drag se não foi no header
      }

      // Ignora cliques em botões
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === "BUTTON" || e.target.closest("button"))
      ) {
        return;
      }

      // Previne comportamento padrão
      e.preventDefault();

      isDraggingRef.current = true;
      setIsDragging(true);

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
    },
    [draggable]
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    // Cancela o frame anterior se existir
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Usa requestAnimationFrame para suavizar o movimento
    rafIdRef.current = requestAnimationFrame(() => {
      if (!isDraggingRef.current) return;

      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;

      const margin = 10;
      const maxX = window.innerWidth - widgetSizeRef.current.width - margin;
      const maxY = window.innerHeight - widgetSizeRef.current.height - margin;

      const newPosition = {
        x: Math.max(margin, Math.min(newX, maxX)),
        y: Math.max(margin, Math.min(newY, maxY)),
      };

      // Atualiza posição diretamente sem causar re-renders desnecessários
      positionRef.current = newPosition;
      setPosition(newPosition);
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    setIsDragging(false);

    // Cancela qualquer frame pendente
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Notifica mudanças de posição apenas no final do drag
    const finalPosition = positionRef.current;
    if (onPositionChange) {
      onPositionChange(finalPosition);
    }
    if (onDragEnd) {
      onDragEnd(finalPosition);
    }
  }, [onPositionChange, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove, {
        passive: false,
      });
      document.addEventListener("mouseup", handleMouseUp);
      // Previne seleção de texto durante o drag
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <motion.div
      ref={widgetRef}
      data-widget-id={widgetId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "fixed zen-glass rounded-3xl z-40 flex flex-col",
        isDragging && "cursor-grabbing will-change-transform",
        !isDragging && "cursor-default",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transition: isDragging ? "none" : undefined,
        transform: "translate(0, 0)", // Força transform para melhor performance
      }}
    >
      {/* Header - Drag Handle */}
      <div
        ref={headerRef}
        className={cn(
          "flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0",
          draggable && "cursor-grab active:cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
      >
        <h3 className="text-sm font-light text-white/90 tracking-wide select-none">
          {title}
        </h3>
        <div className="flex items-center gap-1">
          {headerActions}
          <button
            onClick={onClose}
            className="h-6 w-6 p-0 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center group"
          >
            <X
              className="h-3.5 w-3.5 text-white/50 group-hover:text-white/90 transition-colors"
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden flex-1 min-h-0">{children}</div>
    </motion.div>
  );
};
