import { useStableData, createRankSortComparator } from "./use-stable-data";
import { useGetEquipmentExpenses } from "../app/features/feature-variable-cost/server/get-equipment-expenses";
import type { EquipmentExpenseItem } from "../app/types";

interface UseStableEquipmentParams {
  userId: string;
}

interface UseStableEquipmentReturn {
  equipment: EquipmentExpenseItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  isFetching: boolean;
}

/**
 * A stable data selector hook for equipment expenses that provides:
 * - Memoized, sorted equipment expenses with stable references
 * - Proper dependency management to prevent unnecessary re-renders
 * - Consistent sorting by rank with ID as secondary sort
 * - Loading and error states
 * - Empty array default for when no equipment exists
 *
 * This hook prevents performance issues by ensuring that:
 * 1. The returned equipment array has a stable reference when data hasn't changed
 * 2. Sorting is consistent and deterministic
 * 3. Dependencies are properly managed to prevent infinite re-renders
 * 4. The hook works with array-based cache patterns
 *
 * @param params - Parameters including userId
 * @returns Stable equipment data with query states
 */
export const useStableEquipment = ({ userId }: UseStableEquipmentParams): UseStableEquipmentReturn => {
  const queryResult = useGetEquipmentExpenses({ userId });

  const stableResult = useStableData(queryResult, {
    defaultValue: [],
    sortComparator: createRankSortComparator,
    // No selector transformation needed - return data as-is
  });

  return {
    equipment: stableResult.data,
    isLoading: stableResult.isLoading,
    isError: stableResult.isError,
    error: stableResult.error,
    isSuccess: stableResult.isSuccess,
    isFetching: stableResult.isFetching,
  };
};