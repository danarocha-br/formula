import { useMemo } from "react";
import { useGetFixedExpenses } from "../app/features/feature-hourly-cost/server/get-fixed-expenses";
import type { ExpenseItem } from "../app/types";

interface UseStableExpensesParams {
  userId: string;
}

interface UseStableExpensesReturn {
  expenses: ExpenseItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  isFetching: boolean;
}

/**
 * A stable data selector hook for expenses that provides:
 * - Memoized, sorted expenses with stable references
 * - Proper dependency management to prevent unnecessary re-renders
 * - Consistent sorting by rank
 * - Loading and error states
 *
 * This hook prevents the stack overflow issue by ensuring that:
 * 1. The returned expenses array has a stable reference when data hasn't changed
 * 2. Sorting is consistent and deterministic
 * 3. Dependencies are properly managed to prevent infinite re-renders
 */
export const useStableExpenses = ({ userId }: UseStableExpensesParams): UseStableExpensesReturn => {
  const queryResult = useGetFixedExpenses({ userId });

  const {
    data: rawExpenses,
    isLoading,
    isError,
    error,
    isSuccess,
    isFetching,
  } = queryResult;

  // Memoize the sorted expenses to maintain stable references
  // Only recalculate when the raw data actually changes
  const expenses = useMemo(() => {
    if (!rawExpenses || !Array.isArray(rawExpenses)) {
      return [];
    }

    // Create a shallow copy and sort by rank
    // Use a stable sort that handles undefined ranks consistently
    return [...rawExpenses].sort((a, b) => {
      const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;

      // Primary sort by rank
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // Secondary sort by ID for deterministic ordering when ranks are equal
      return a.id - b.id;
    });
  }, [rawExpenses]);

  return {
    expenses,
    isLoading,
    isError,
    error,
    isSuccess,
    isFetching,
  };
};