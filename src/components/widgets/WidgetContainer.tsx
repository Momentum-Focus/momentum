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
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const widgetSizeRef = useRef({ width: 300, height: 200 });

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

  useEffect(() => {
    const adjustedPosition = adjustPositionToViewport(defaultPosition);
    setPosition(adjustedPosition);
  }, [defaultPosition, adjustPositionToViewport]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((currentPos) => adjustPositionToViewport(currentPos));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustPositionToViewport]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!draggable) return;
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === "BUTTON" || e.target.closest("button"))
      ) {
        return;
      }

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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const newX = e.clientX - dragOffsetRef.current.x;
        const newY = e.clientY - dragOffsetRef.current.y;

        const margin = 10;
        const maxX =
          window.innerWidth - widgetSizeRef.current.width - margin;
        const maxY =
          window.innerHeight - widgetSizeRef.current.height - margin;

        const newPosition = {
          x: Math.max(margin, Math.min(newX, maxX)),
          y: Math.max(margin, Math.min(newY, maxY)),
        };

        setPosition(newPosition);
        onPositionChange?.(newPosition);
      });
    },
    [onPositionChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setPosition((currentPos) => {
      onPositionChange?.(currentPos);
      if (onDragEnd) {
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
    <motion.div
      ref={widgetRef}
      data-widget-id={widgetId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "fixed zen-glass rounded-3xl z-40",
        !isDragging && "transition-all duration-200",
        isDragging && "cursor-grabbing will-change-transform transition-none",
        !isDragging && draggable && "cursor-grab",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-sm font-light text-white/90 tracking-wide select-none">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="h-6 w-6 p-0 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center group"
        >
          <X className="h-3.5 w-3.5 text-white/50 group-hover:text-white/90 transition-colors" strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-hidden">{children}</div>
    </motion.div>
  );
};

