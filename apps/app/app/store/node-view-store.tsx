import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NodeViewState {
  nodePositions: Record<string, { x: number; y: number }>;
  setNodePositions: (
    positions: Record<string, { x: number; y: number }>
  ) => void;
  updateNodePosition: (
    nodeId: string,
    position: { x: number; y: number }
  ) => void;
}

export const useNodeViewStore = create(
  persist<NodeViewState>(
    (set) => ({
      nodePositions: {},
      setNodePositions: (positions) => set({ nodePositions: positions }),
      updateNodePosition: (nodeId, position) =>
        set((state) => ({
          nodePositions: {
            ...state.nodePositions,
            [nodeId]: position,
          },
        })),
    }),
    {
      name: "@formula.node-positions",
    }
  )
);
