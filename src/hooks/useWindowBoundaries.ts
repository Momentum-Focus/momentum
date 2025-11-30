import { useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/ui.store";

/**
 * Hook to enforce window boundaries on resize
 * Automatically corrects widget positions when viewport size changes
 */
export const useWindowBoundaries = () => {
  const { widgetPositions, updatePosition } = useUIStore();

  // Boundary enforcement logic
  const enforceBoundaries = useCallback(() => {
    const widgetIds = Object.keys(widgetPositions);

    widgetIds.forEach((widgetId) => {
      const position = widgetPositions[widgetId];
      if (!position) return;

      // Get widget element from DOM
      const widgetElement = document.querySelector(
        `[data-widget-id="${widgetId}"]`
      ) as HTMLElement;

      if (!widgetElement) return;

      const widgetWidth = widgetElement.offsetWidth || 300;
      const widgetHeight = widgetElement.offsetHeight || 200;

      // Calculate boundaries (hard limits)
      const minX = 0;
      const minY = 0; // Header can go to top edge
      const maxX = Math.max(minX, window.innerWidth - widgetWidth);
      const maxY = Math.max(minY, window.innerHeight - widgetHeight);

      // Clamp coordinates to valid range
      const correctedX = Math.max(minX, Math.min(position.x, maxX));
      const correctedY = Math.max(minY, Math.min(position.y, maxY));

      // Only update if position changed
      if (correctedX !== position.x || correctedY !== position.y) {
        updatePosition(widgetId, correctedX, correctedY);
      }
    });
  }, [widgetPositions, updatePosition]);

  // Listen to window resize events
  useEffect(() => {
    // Small delay to ensure DOM has updated after resize
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        enforceBoundaries();
      }, 100); // Debounce resize events
    };

    window.addEventListener("resize", handleResize);

    // Run once on mount to correct any initial off-screen positions
    enforceBoundaries();

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [enforceBoundaries]);
};

/**
 * Helper function to calculate safe position within viewport bounds
 * Hard limits: Widget must be completely visible
 */
export const calculateSafePosition = (
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number } => {
  // Hard limits: Widget must stay completely within viewport
  const minX = 0;
  const minY = 0; // Header can go to top edge
  const maxX = Math.max(minX, window.innerWidth - width);
  const maxY = Math.max(minY, window.innerHeight - height);

  // Clamp coordinates to valid range
  const safeX = Math.max(minX, Math.min(x, maxX));
  const safeY = Math.max(minY, Math.min(y, maxY));

  return { x: safeX, y: safeY };
};
