import { create } from "zustand";
import { persist } from "zustand/middleware";

type WindowState = {
  // Order of IDs. Index 0 = Back, Index N = Front.
  // Example: ['timer', 'music', 'tasks'] -> Tasks is on top (z-index: 100 + 2 = 102).
  windowStack: string[];

  // Store exact coordinates to prevent "teleportation" on re-render
  widgetPositions: Record<string, { x: number; y: number }>;
};

type WindowActions = {
  // Called onPointerDownCapture. Moves ID to the end of the array.
  bringToFront: (id: string) => void;

  // Called onDragEnd. Updates coordinates without re-rendering the stack.
  updatePosition: (id: string, x: number, y: number) => void;

  // Called on Toggle. Adds ID to stack if new, removes if closed.
  toggleWidget: (id: string) => void;

  // Remove widget from stack when closed
  removeFromStack: (id: string) => void;

  // Get z-index for a widget based on its position in stack
  getZIndex: (id: string) => number;

  // Initialize widget with default position (center of screen) if none exists
  initializeWidget: (
    id: string,
    width?: number,
    height?: number
  ) => { x: number; y: number };

  // Get widget position, initializing if needed
  getWidgetPosition: (
    id: string,
    defaultPos?: { x: number; y: number },
    width?: number,
    height?: number
  ) => { x: number; y: number };
};

type WindowStore = WindowState & WindowActions;

const BASE_Z_INDEX = 50;
const Z_INDEX_STEP = 1;

export const useUIStore = create<WindowStore>()(
  persist(
    (set, get) => ({
      // Initial state
      windowStack: [],
      widgetPositions: {},

      // Bring widget to front (CRITICAL: Synchronous operation)
      bringToFront: (id: string) => {
        if (!id) return;

        set((state) => {
          // Filter out the target ID from current stack
          const filteredStack = state.windowStack.filter(
            (stackId) => stackId !== id
          );

          // Push target ID to the end (top of stack)
          const newStack = [...filteredStack, id];

          return {
            windowStack: newStack,
          };
        });
      },

      // Update widget position (optimized: only updates if changed)
      updatePosition: (id: string, x: number, y: number) => {
        const state = get();
        const currentPos = state.widgetPositions[id];

        // Only update if position actually changed
        if (currentPos && currentPos.x === x && currentPos.y === y) {
          return; // No change, skip update
        }

        set((state) => ({
          widgetPositions: {
            ...state.widgetPositions,
            [id]: { x, y },
          },
        }));
      },

      // Initialize widget with default centered position
      initializeWidget: (
        id: string,
        width: number = 400,
        height: number = 600
      ) => {
        const state = get();

        // If position already exists, return it
        if (state.widgetPositions[id]) {
          return state.widgetPositions[id];
        }

        // Calculate center position
        const centerX = Math.max(
          20,
          Math.floor((window.innerWidth - width) / 2)
        );
        const centerY = Math.max(
          20,
          Math.floor((window.innerHeight - height) / 2)
        );

        const defaultPosition = { x: centerX, y: centerY };

        // Save to store
        set((state) => ({
          widgetPositions: {
            ...state.widgetPositions,
            [id]: defaultPosition,
          },
        }));

        return defaultPosition;
      },

      // Get widget position, initializing if needed
      getWidgetPosition: (
        id: string,
        defaultPos?: { x: number; y: number },
        width?: number,
        height?: number
      ) => {
        const state = get();

        // If position exists, return it
        if (state.widgetPositions[id]) {
          return state.widgetPositions[id];
        }

        // If default position provided, use it
        if (defaultPos) {
          set((state) => ({
            widgetPositions: {
              ...state.widgetPositions,
              [id]: defaultPos,
            },
          }));
          return defaultPos;
        }

        // Otherwise, initialize with centered position
        const { initializeWidget } = get();
        return initializeWidget(id, width, height);
      },

      // Toggle widget (add to stack if opening, remove if closing)
      toggleWidget: (id: string) => {
        set((state) => {
          const isInStack = state.windowStack.includes(id);

          if (isInStack) {
            // Widget is closing - remove from stack
            return {
              windowStack: state.windowStack.filter(
                (stackId) => stackId !== id
              ),
            };
          } else {
            // Widget is opening - add to end of stack (bring to front)
            return {
              windowStack: [...state.windowStack, id],
            };
          }
        });
      },

      // Remove widget from stack
      removeFromStack: (id: string) => {
        set((state) => ({
          windowStack: state.windowStack.filter((stackId) => stackId !== id),
        }));
      },

      // Get z-index based on position in stack
      getZIndex: (id: string) => {
        const state = get();
        const index = state.windowStack.indexOf(id);

        if (index === -1) {
          // Widget not in stack yet - return base z-index
          return BASE_Z_INDEX;
        }

        // Z-index = BASE + index in stack
        // Example: ['timer', 'music', 'tasks']
        // timer (index 0) = 100 + 0 = 100
        // music (index 1) = 100 + 1 = 101
        // tasks (index 2) = 100 + 2 = 102 (highest, on top)
        return BASE_Z_INDEX + index * Z_INDEX_STEP;
      },
    }),
    {
      name: "momentum-ui-store",
      partialize: (state) => ({
        widgetPositions: state.widgetPositions,
        // Don't persist windowStack - it should reset on reload
      }),
    }
  )
);
