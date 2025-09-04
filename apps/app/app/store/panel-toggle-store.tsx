import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface PanelToggleState {
  isBillablePanelVisible: boolean;
  toggleBillablePanel: () => void;
  showBillablePanel: () => void;
  hideBillablePanel: () => void;
}

export const usePanelToggleStore = create<PanelToggleState>()(
  devtools(
    (set) => ({
      isBillablePanelVisible: true, // Default state: panel visible
      toggleBillablePanel: () =>
        set((state) => ({
          isBillablePanelVisible: !state.isBillablePanelVisible,
        })),
      showBillablePanel: () =>
        set(() => ({
          isBillablePanelVisible: true,
        })),
      hideBillablePanel: () =>
        set(() => ({
          isBillablePanelVisible: false,
        })),
    }),
    {
      name: "panel-toggle-store",
    }
  )
);