import { useMemo } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

/**
 * Configuration for the generic stable data hook
 */
interface UseStableDataConfig<T> {
  /**
   * Optional sort comparator for array data
   * If not provided, data will be returned as-is
   */
  sortComparator?: (a: T, b: T) => number;

  /**
   * Optional selector function to transform the data
   * Useful for extracting specific fields or applying transformations
   */
  selector?: (data: T) => T;

  /**
   * Optional default value when data is not available
   */
  defaultValue?: T;
}

/**
 * Return type for stable data hooks
 */
interface UseStableDataReturn<T> {
  data: T;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  isFetching: boolean;
}

/**
 * Generic stable data selector hook factory that provides:
 * - Memoized data with stable references
 * - Proper dependency management to prevent unnecessary re-renders
 * - Optional sorting for array data
 * - Optional data transformation
 * - Consistent loading and error states
 *
 * This hook prevents performance issues by ensuring that:
 * 1. The returned data has a stable reference when the underlying data hasn't changed
 * 2. Sorting is consistent and deterministic for array data
 * 3. Dependencies are properly managed to prevent infinite re-renders
 * 4. Data transformations are memoized
 *
 * @param queryResult - The result from a React Query hook
 * @param config - Configuration options for data processing
 * @returns Stable data with query states
 */
export function useStableData<T>(
  queryResult: UseQueryResult<T>,
  config: UseStableDataConfig<T> = {}
): UseStableDataReturn<T> {
  const {
    sortComparator,
    selector,
    defaultValue,
  } = config;

  const {
    data: rawData,
    isLoading,
    isError,
    error,
    isSuccess,
    isFetching,
  } = queryResult;

  // Memoize the processed data to maintain stable references
  // Only recalculate when the raw data actually changes
  const data = useMemo(() => {
    // Return default value if no data is available
    if (!rawData) {
      return defaultValue as T;
    }

    let processedData = rawData;

    // Apply selector transformation if provided
    if (selector) {
      processedData = selector(processedData);
    }

    // Apply sorting if data is an array and sort comparator is provided
    if (Array.isArray(processedData) && sortComparator) {
      // Check if the array is already sorted to maintain reference stability
      const isAlreadySorted = processedData.every((item, index, arr) => {
        if (index === 0) return true;
        return sortComparator(arr[index - 1], item) <= 0;
      });

      if (isAlreadySorted) {
        // Return the same reference if already sorted
        return processedData;
      } else {
        // Create a shallow copy and sort
        processedData = [...processedData].sort(sortComparator) as T;
      }
    }

    return processedData;
  }, [rawData, selector, sortComparator, defaultValue]);

  return {
    data,
    isLoading,
    isError,
    error,
    isSuccess,
    isFetching,
  };
}

/**
 * Default sort comparator for items with rank property
 * Handles undefined ranks consistently by placing them at the end
 * Uses ID as secondary sort for deterministic ordering
 */
export function createRankSortComparator<T extends { rank?: number; id: number }>(
  a: T,
  b: T
): number {
  const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
  const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;

  // Primary sort by rank
  if (rankA !== rankB) {
    return rankA - rankB;
  }

  // Secondary sort by ID for deterministic ordering when ranks are equal
  return a.id - b.id;
}