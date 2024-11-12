import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface CurrencyState {
  totalMonthlyExpenses: number;
  setTotalMonthlyExpenses: (totalMonthlyExpenses: number) => void;
  breakEvenMonthlyCost: number;
  setBreakEvenMonthlyCost: (breakEvenMonthlyCost: number) => void;
  hourlyCost: number;
  setHourlyCost: (hourlyCost: number) => void;
}

export const useHourlyCostStore = create<CurrencyState>()(
  devtools(
    persist(
      (set) => ({
        totalMonthlyExpenses: 0,
        setTotalMonthlyExpenses: (totalMonthlyExpenses: number) =>
          set(() => ({ totalMonthlyExpenses: totalMonthlyExpenses })),
        breakEvenMonthlyCost: 0,
        setBreakEvenMonthlyCost: (breakEvenMonthlyCost: number) =>
          set(() => ({ breakEvenMonthlyCost: breakEvenMonthlyCost })),
        hourlyCost: 0,
        setHourlyCost: (hourlyCost: number) =>
          set(() => ({ hourlyCost: hourlyCost })),
      }),
      { name: "@formula.hourly-cost" }
    )
  )
);
