import { renderHook } from '@testing-library/react';
import { useStableData, createRankSortComparator } from '../use-stable-data';
import type { UseQueryResult } from '@tanstack/react-query';
import { vi } from 'vitest';

// Mock data types for testing
interface TestItem {
  id: number;
  name: string;
  rank?: number;
}

interface TestSingleItem {
  id: number;
  value: string;
}

describe('useStableData', () => {
  const createMockQueryResult = <T>(
    data: T,
    overrides: Partial<UseQueryResult<T>> = {}
  ): UseQueryResult<T> => ({
    data,
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: true,
    isFetching: false,
    isStale: false,
    isPlaceholderData: false,
    isPending: false,
    status: 'success',
    fetchStatus: 'idle',
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isRefetching: false,
    isLoadingError: false,
    isRefetchError: false,
    refetch: vi.fn(),
    ...overrides,
  });

  describe('basic functionality', () => {
    it('should return data with stable reference when data unchanged', () => {
      const testData = [{ id: 1, name: 'test' }];
      const queryResult = createMockQueryResult(testData);

      const { result, rerender } = renderHook(() =>
        useStableData(queryResult)
      );

      const firstResult = result.current.data;

      // Rerender with same data
      rerender();

      const secondResult = result.current.data;

      // Should have stable reference
      expect(firstResult).toBe(secondResult);
      expect(result.current.data).toEqual(testData);
    });

    it('should return new reference when data changes', () => {
      const initialData = [{ id: 1, name: 'test1' }];
      const updatedData = [{ id: 1, name: 'test2' }];

      let queryResult = createMockQueryResult(initialData);

      const { result, rerender } = renderHook(
        ({ queryResult }) => useStableData(queryResult),
        { initialProps: { queryResult } }
      );

      const firstResult = result.current.data;

      // Update with new data
      queryResult = createMockQueryResult(updatedData);
      rerender({ queryResult });

      const secondResult = result.current.data;

      // Should have new reference with updated data
      expect(firstResult).not.toBe(secondResult);
      expect(result.current.data).toEqual(updatedData);
    });

    it('should return default value when no data', () => {
      const defaultValue = [];
      const queryResult = createMockQueryResult(null);

      const { result } = renderHook(() =>
        useStableData(queryResult, { defaultValue })
      );

      expect(result.current.data).toBe(defaultValue);
    });

    it('should pass through query states correctly', () => {
      const queryResult = createMockQueryResult(null, {
        isLoading: true,
        isError: false,
        error: null,
        isSuccess: false,
        isFetching: true,
      });

      const { result } = renderHook(() => useStableData(queryResult));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isFetching).toBe(true);
    });
  });

  describe('sorting functionality', () => {
    it('should sort array data when sortComparator provided', () => {
      const unsortedData: TestItem[] = [
        { id: 3, name: 'third', rank: 3 },
        { id: 1, name: 'first', rank: 1 },
        { id: 2, name: 'second', rank: 2 },
      ];

      const queryResult = createMockQueryResult(unsortedData);

      const { result } = renderHook(() =>
        useStableData(queryResult, {
          sortComparator: (a, b) => (a.rank || 0) - (b.rank || 0),
        })
      );

      expect(result.current.data).toEqual([
        { id: 1, name: 'first', rank: 1 },
        { id: 2, name: 'second', rank: 2 },
        { id: 3, name: 'third', rank: 3 },
      ]);
    });

    it('should not sort non-array data', () => {
      const singleItem: TestSingleItem = { id: 1, value: 'test' };
      const queryResult = createMockQueryResult(singleItem);

      const { result } = renderHook(() =>
        useStableData(queryResult, {
          sortComparator: () => 0, // This should be ignored for non-arrays
        })
      );

      expect(result.current.data).toEqual(singleItem);
    });

    it('should maintain stable reference when sorted data unchanged', () => {
      const sortedData: TestItem[] = [
        { id: 1, name: 'first', rank: 1 },
        { id: 2, name: 'second', rank: 2 },
      ];

      let queryResult = createMockQueryResult(sortedData);

      const { result, rerender } = renderHook(
        ({ queryResult }) => useStableData(queryResult, {
          sortComparator: (a, b) => (a.rank || 0) - (b.rank || 0),
        }),
        { initialProps: { queryResult } }
      );

      const firstResult = result.current.data;

      // Rerender with same query result - this should maintain stable reference
      // because the data is already sorted and the underlying rawData hasn't changed
      rerender({ queryResult });
      const secondResult = result.current.data;

      // Should maintain stable reference when data is already sorted
      expect(firstResult).toBe(secondResult);
      expect(result.current.data).toEqual([
        { id: 1, name: 'first', rank: 1 },
        { id: 2, name: 'second', rank: 2 },
      ]);
    });
  });

  describe('selector functionality', () => {
    it('should apply selector transformation', () => {
      const originalData = { id: 1, value: 'original', extra: 'data' };
      const queryResult = createMockQueryResult(originalData);

      const { result } = renderHook(() =>
        useStableData(queryResult, {
          selector: (data) => ({ ...data, value: 'transformed' }),
        })
      );

      expect(result.current.data).toEqual({
        id: 1,
        value: 'transformed',
        extra: 'data',
      });
    });

    it('should maintain stable reference when selector result unchanged', () => {
      const originalData = { id: 1, value: 'test' };
      const queryResult = createMockQueryResult(originalData);

      const { result, rerender } = renderHook(() =>
        useStableData(queryResult, {
          selector: (data) => data, // Identity selector
        })
      );

      const firstResult = result.current.data;
      rerender();
      const secondResult = result.current.data;

      expect(firstResult).toBe(secondResult);
    });
  });

  describe('combined functionality', () => {
    it('should apply both selector and sorting', () => {
      const originalData: TestItem[] = [
        { id: 2, name: 'second', rank: 2 },
        { id: 1, name: 'first', rank: 1 },
      ];

      const queryResult = createMockQueryResult(originalData);

      const { result } = renderHook(() =>
        useStableData(queryResult, {
          selector: (data) => data.map(item => ({ ...item, name: item.name.toUpperCase() })),
          sortComparator: (a, b) => (a.rank || 0) - (b.rank || 0),
        })
      );

      expect(result.current.data).toEqual([
        { id: 1, name: 'FIRST', rank: 1 },
        { id: 2, name: 'SECOND', rank: 2 },
      ]);
    });
  });
});

describe('createRankSortComparator', () => {
  it('should sort by rank ascending', () => {
    const items: TestItem[] = [
      { id: 1, name: 'first', rank: 3 },
      { id: 2, name: 'second', rank: 1 },
      { id: 3, name: 'third', rank: 2 },
    ];

    const sorted = items.sort(createRankSortComparator);

    expect(sorted).toEqual([
      { id: 2, name: 'second', rank: 1 },
      { id: 3, name: 'third', rank: 2 },
      { id: 1, name: 'first', rank: 3 },
    ]);
  });

  it('should handle undefined ranks by placing them at the end', () => {
    const items: TestItem[] = [
      { id: 1, name: 'first', rank: 2 },
      { id: 2, name: 'second' }, // no rank
      { id: 3, name: 'third', rank: 1 },
      { id: 4, name: 'fourth' }, // no rank
    ];

    const sorted = items.sort(createRankSortComparator);

    expect(sorted).toEqual([
      { id: 3, name: 'third', rank: 1 },
      { id: 1, name: 'first', rank: 2 },
      { id: 2, name: 'second' },
      { id: 4, name: 'fourth' },
    ]);
  });

  it('should use ID as secondary sort when ranks are equal', () => {
    const items: TestItem[] = [
      { id: 3, name: 'third', rank: 1 },
      { id: 1, name: 'first', rank: 1 },
      { id: 2, name: 'second', rank: 1 },
    ];

    const sorted = items.sort(createRankSortComparator);

    expect(sorted).toEqual([
      { id: 1, name: 'first', rank: 1 },
      { id: 2, name: 'second', rank: 1 },
      { id: 3, name: 'third', rank: 1 },
    ]);
  });

  it('should use ID as secondary sort for undefined ranks', () => {
    const items: TestItem[] = [
      { id: 3, name: 'third' },
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
    ];

    const sorted = items.sort(createRankSortComparator);

    expect(sorted).toEqual([
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
      { id: 3, name: 'third' },
    ]);
  });
});