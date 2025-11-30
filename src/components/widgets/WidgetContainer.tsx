import React, { useRef, useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { motion, useDragControls } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme-context";
import { useUIStore } from "@/stores/ui.store";
import { calculateSafePosition } from "@/hooks/useWindowBoundaries";

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
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const { themeColor } = useTheme();

  // Window Stack Management
  const {
    bringToFront,
    getZIndex,
    removeFromStack,
    updatePosition,
    widgetPositions,
    toggleWidget,
  } = useUIStore();

  // Window Stack Management
  const windowStack = useUIStore((state) => state.windowStack);
  const zIndex = widgetId ? getZIndex(widgetId) : 50;

  // Track drag start position to calculate final position correctly
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Get current position from store or use default
  const storePos = widgetId ? widgetPositions[widgetId] : undefined;
  const initialPosition = storePos || defaultPosition;

  // Use position state - sync with store but don't interfere during drag
  const [motionX, setMotionX] = useState(initialPosition.x);
  const [motionY, setMotionY] = useState(initialPosition.y);

  // Track initialization to prevent loops
  const initializedRef = useRef<string | null>(null);

  // Initialize widget and add to stack (only once per widgetId on mount)
  useEffect(() => {
    if (!widgetId) return;

    // Only initialize once
    if (initializedRef.current === widgetId) return;
    initializedRef.current = widgetId;

    // Add widget to stack
    toggleWidget(widgetId);

    // Initialize position if not in store
    const currentStorePos = widgetPositions[widgetId];
    if (!currentStorePos) {
      const { initializeWidget } = useUIStore.getState();
      const widgetWidth = 400;
      const widgetHeight = 600;
      const pos = initializeWidget(widgetId, widgetWidth, widgetHeight);
      setMotionX(pos.x);
      setMotionY(pos.y);
    } else {
      setMotionX(currentStorePos.x);
      setMotionY(currentStorePos.y);
    }

    // Cleanup: remove from stack only on unmount
    return () => {
      if (initializedRef.current === widgetId) {
        removeFromStack(widgetId);
        initializedRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount

  // Sync with store position changes (but don't interfere during drag)
  useEffect(() => {
    if (!widgetId || !storePos || dragStartPositionRef.current) {
      return;
    }

    // Only update if position actually changed
    if (storePos.x !== motionX || storePos.y !== motionY) {
      setMotionX(storePos.x);
      setMotionY(storePos.y);
    }
  }, [widgetId, storePos, motionX, motionY]);

  // Handle pointer down to bring widget to front (CRITICAL: Use Capture for instant feedback)
  const handlePointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      // Don't bring to front if clicking on buttons
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === "BUTTON" || e.target.closest("button"))
      ) {
        return;
      }

      if (widgetId) {
        bringToFront(widgetId);
      }
    },
    [widgetId, bringToFront]
  );

  // Handle drag start - store initial position
  const handleDragStart = useCallback(() => {
    if (!widgetRef.current) return;

    // Store the position where drag started
    dragStartPositionRef.current = { x: motionX, y: motionY };
  }, [motionX, motionY]);

  // Handle drag end to sync final position (ANTI-TELEPORT LOGIC)
  const handleDragEnd = useCallback(
    (_event: any, info: { offset: { x: number; y: number } }) => {
      if (!widgetId || !widgetRef.current || !dragStartPositionRef.current) {
        dragStartPositionRef.current = null;
        return;
      }

      // CRITICAL: Calculate absolute position from drag start position + offset
      // This ensures accurate calculation without state conflicts
      const finalX = dragStartPositionRef.current.x + info.offset.x;
      const finalY = dragStartPositionRef.current.y + info.offset.y;

      // Get widget dimensions
      const widgetWidth = widgetRef.current.offsetWidth || 300;
      const widgetHeight = widgetRef.current.offsetHeight || 200;

      // Calculate safe position within boundaries (hard limits)
      const safePosition = calculateSafePosition(
        finalX,
        finalY,
        widgetWidth,
        widgetHeight
      );

      // Clear drag start position
      dragStartPositionRef.current = null;

      // Update motion values immediately (prevents teleport)
      setMotionX(safePosition.x);
      setMotionY(safePosition.y);

      // Update store with absolute position
      updatePosition(widgetId, safePosition.x, safePosition.y);

      // Call parent callbacks
      if (onPositionChange) {
        onPositionChange(safePosition);
      }
      if (onDragEnd) {
        onDragEnd(safePosition);
      }
    },
    [widgetId, updatePosition, onPositionChange, onDragEnd]
  );

  const headerRef = useRef<HTMLDivElement>(null);

  // Handle drag start from header only
  const handleHeaderPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!draggable) return;

      // Ignore button clicks
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === "BUTTON" || e.target.closest("button"))
      ) {
        return;
      }

      // Start drag from header
      dragControls.start(e);
    },
    [draggable, dragControls]
  );

  return (
    <motion.div
      ref={widgetRef}
      data-widget-id={widgetId}
      initial={{ opacity: 0, x: motionX, y: motionY + 20 }}
      animate={{
        opacity: 1,
        x: motionX,
        y: motionY,
      }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("fixed zen-glass rounded-3xl flex flex-col", className)}
      style={{
        zIndex: zIndex,
      }}
      drag={draggable}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={false}
      layout={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onPointerDownCapture={handlePointerDownCapture}
      whileDrag={{ cursor: "grabbing" }}
      dragTransition={{ power: 0, timeConstant: 0 }}
    >
      {/* Header - Drag Handle */}
      <div
        ref={headerRef}
        className={cn(
          "flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0 select-none",
          draggable && "cursor-grab active:cursor-grabbing"
        )}
        onPointerDown={handleHeaderPointerDown}
        style={{ touchAction: "none" }}
      >
        <h3 className="text-sm font-light text-white/90 tracking-wide select-none">
          {title}
        </h3>
        <div className="flex items-center gap-1">
          {headerActions}
          <button
            onClick={() => {
              if (widgetId) {
                removeFromStack(widgetId);
              }
              onClose();
            }}
            className="h-6 w-6 p-0 rounded-lg transition-colors flex items-center justify-center group relative"
            style={{
              border: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${themeColor}20`;
              e.currentTarget.style.borderColor = themeColor;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${themeColor}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "";
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.boxShadow = "";
            }}
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
