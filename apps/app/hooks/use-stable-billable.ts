import { useStableData } from "./use-stable-data";
import { useGetBillableExpenses } from "../app/features/feature-billable-cost/server/get-billable-expenses";
import type { BillableCostItem } from "../utils/query-cache-utils";

interface UseStableBillableParams {
  userId: string;
}

interface UseStableBillableReturn {
  billableData: BillableCostItem | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  isFetching: boolean;
}

/**
 * A stable data selector hook for billable cost data that provides:
 * - Memoized billable cost data with stable references
 * - Proper dependency management to prevent unnecessary re-renders
 * - Loading and error states
 * - Null handling for when no billable data exists
 *
 * This hook prevents performance issues by ensuring that:
 * 1. The returned billable data has a stable reference when data hasn't changed
 * 2. Dependencies are properly managed to prevent infinite re-renders
 * 3. Null states are handled consistently
 * 4. The hook works with single-object cache patterns
 *
 * @param params - Parameters including userId
 * @returns Stable billable data with query states
 */
export const useStableBillable = ({ userId }: UseStableBillableParams): UseStableBillableReturn => {
  const queryResult = useGetBillableExpenses({ userId });

  const stableResult = useStableData(queryResult, {
    defaultValue: null,
    // No sorting needed for single object
    // No selector transformation needed - return data as-is
  });

  return {
    billableData: stableResult.data,
    isLoading: stableResult.isLoading,
    isError: stableResult.isError,
    error: stableResult.error,
    isSuccess: stableResult.isSuccess,
    isFetching: stableResult.isFetching,
  };
};