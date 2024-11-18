import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type ViewPreference = "grid" | "table" | "node" | "chart";

interface ViewPreferenceState {
  viewPreference: ViewPreference;
  setViewPreference: (view: ViewPreference) => void;
}

export const useViewPreferenceStore = create<ViewPreferenceState>()(
  devtools(
    persist(
      (set) => ({
        viewPreference: "grid",
        setViewPreference: (view: ViewPreference) =>
          set({ viewPreference: view }),
      }),
      { name: "@formula.view-preference" }
    )
  )
);
