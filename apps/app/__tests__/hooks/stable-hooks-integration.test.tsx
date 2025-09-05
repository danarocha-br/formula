/**
 * Integration tests for stable data selector hooks
 * Tests cross-feature interactions and performance characteristics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { createQueryWrapper } from '../../test-utils';
import { useStableData, createRankSortComparator } from '../../hooks/use-stable-data';
import { useStableBillable } from '../../hooks/use-stable-billable';
import { useStableEquipment } from '../../hooks/use-stable-equipment';
import { useStableExpenses } from '../../hooks/use-stable-expenses';
import type { BillableCostItem } from '../../utils/query-cache-utils';
import type { EquipmentExpenseItem } from '../../app/types';

// Mock the query hooks
vi.mock('../../app/features/feature-billable-cost/server/get-billable-expenses', () => ({
  useGetBillableExpenses: vi.fn(),
}));

vi.mock('../../app/features/feature-variable-cost/server/get-equipment-expenses', () => ({
  useGetEquipmentExpenses: vi.fn(),
}));

vi.mock('../../app/features/feature-fixed-cost/server/get-fixed-expenses', () => ({
  useGetFixedExpenses: vi.fn(),
}));

describe('Stable Hooks Integration Tests', () => {
  let queryClient: QueryClient;
  const userId = 'test-user-123';

  // Get the mocked functions
  const mockUseGetBillableExpenses = vi.mocked(
    require('../../app/features/feature-billable-cost/server/get-billable-expenses').useGetBillableExpenses
  );
  const mockUseGetEquipmentExpenses = vi.mocked(
    require('../../app/features/feature-variable-cost/server/get-equipment-expenses').useGetEquipmentExpenses
  );
  const mockUseGetFixedExpenses = vi.mocked(
    require('../../app/features/feature-fixed-cost/server/get-fixed-expenses').useGetFixedExpenses
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    vi.clearAllMocks();
  });

  describe('useStableData Generic Hook', () => {
    interface TestItem {
      id: number;
      name: string;
      rank?: number;
    }

    it('should provide stable references when data unchanged', () => {
      const testData: TestItem[] = [
        { id: 1, name: 'Item 1', rank: 1 },
        { id: 2, name: 'Item 2', rank: 2 },
      ];

      const mockQueryResult = {
        data: testData,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      };

      const { result, rerender } = renderHook(
        () => useStableData(mockQueryResult, {
          sortComparator: createRankSortComparator,
          defaultValue: [],
        }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      const firstResult = result.current.data;

      // Rerender with same data
      rerender();

      const secondResult = result.current.data;

      // Should maintain reference stability
      expect(firstResult).toBe(secondResult);
    });

    it('should update reference when data actually changes', () => {
      const initialData: TestItem[] = [
        { id: 1, name: 'Item 1', rank: 1 },
      ];

      const updatedData: TestItem[] = [
        { id: 1, name: 'Item 1', rank: 1 },
        { id: 2, name: 'Item 2', rank: 2 },
      ];

      let mockQueryResult = {
        data: initialData,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      };

      const { result, rerender } = renderHook(
        () => useStableData(mockQueryResult, {
          sortComparator: createRankSortComparator,
          defaultValue: [],
        }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      const firstResult = result.current.data;
      expect(firstResult).toHaveLength(1);

      // Update the mock data
      mockQueryResult = { ...mockQueryResult, data: updatedData };
      rerender();

      const secondResult = result.current.data;
      expect(secondResult).toHaveLength(2);
      expect(firstResult).not.toBe(secondResult);
    });

    it('should maintain sort order consistency', () => {
      const unsortedData: TestItem[] = [
        { id: 3, name: 'Item 3', rank: 3 },
        { id: 1, name: 'Item 1', rank: 1 },
        { id: 2, name: 'Item 2', rank: 2 },
      ];

      const mockQueryResult = {
        data: unsortedData,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      };

      const { result } = renderHook(
        () => useStableData(mockQueryResult, {
          sortComparator: createRankSortComparator,
          defaultValue: [],
        }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      const sortedData = result.current.data;
      expect(sortedData[0].rank).toBe(1);
      expect(sortedData[1].rank).toBe(2);
      expect(sortedData[2].rank).toBe(3);
    });

    it('should handle undefined ranks in sorting', () => {
      const dataWithUndefinedRanks: TestItem[] = [
        { id: 2, name: 'Item 2', rank: undefined },
        { id: 1, name: 'Item 1', rank: 1 },
        { id: 3, name: 'Item 3', rank: undefined },
      ];

      const mockQueryResult = {
        data: dataWithUndefinedRanks,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      };

      const { result } = renderHook(
        () => useStableData(mockQueryResult, {
          sortComparator: createRankSortComparator,
          defaultValue: [],
        }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      const sortedData = result.current.data;
      expect(sortedData[0].rank).toBe(1);
      expect(sortedData[0].id).toBe(1);
      // Items with undefined ranks should be sorted by ID
      expect(sortedData[1].id).toBe(2);
      expect(sortedData[2].id).toBe(3);
    });

    it('should apply selector transformation', () => {
      const testData: TestItem[] = [
        { id: 1, name: 'Item 1', rank: 1 },
        { id: 2, name: 'Item 2', rank: 2 },
      ];

      const mockQueryResult = {
        data: testData,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      };

      const selector = (data: TestItem[]) => data.filter(item => item.id === 1);

      const { result } = renderHook(
        () => useStableData(mockQueryResult, {
          selector,
          defaultValue: [],
        }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].id).toBe(1);
    });

    it('should return default value when no data', () => {
      const mockQueryResult = {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: false,
        isFetching: false,
      };

      const defaultValue: TestItem[] = [{ id: 0, name: 'Default', rank: 0 }];

      const { result } = renderHook(
        () => useStableData(mockQueryResult, { defaultValue }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.data).toEqual(defaultValue);
    });
  });

  describe('useStableBillable Hook', () => {
    it('should provide stable billable data', () => {
      const billableData: BillableCostItem = {
        id: 1,
        userId,
        workDays: 22,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1760,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockUseGetBillableExpenses.mockReturnValue({
        data: billableData,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      const { result } = renderHook(
        () => useStableBillable({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.billableData).toEqual(billableData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    it('should handle null billable data', () => {
      mockUseGetBillableExpenses.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      const { result } = renderHook(
        () => useStableBillable({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.billableData).toBeNull();
    });

    it('should handle loading state', () => {
      mockUseGetBillableExpenses.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        isSuccess: false,
        isFetching: true,
      });

      const { result } = renderHook(
        () => useStableBillable({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.billableData).toBeNull();
    });

    it('should handle error state', () => {
      const error = new Error('Failed to fetch billable data');

      mockUseGetBillableExpenses.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error,
        isSuccess: false,
        isFetching: false,
      });

      const { result } = renderHook(
        () => useStableBillable({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(error);
      expect(result.current.billableData).toBeNull();
    });
  });

  describe('useStableEquipment Hook', () => {
    it('should provide stable sorted equipment data', () => {
      const equipmentData: EquipmentExpenseItem[] = [
        {
          id: 2,
          userId,
          name: 'Equipment 2',
          category: 'software',
          amount: 500,
          purchaseDate: new Date('2024-01-01'),
          usage: 100,
          lifeSpan: 12,
          rank: 2,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 1,
          userId,
          name: 'Equipment 1',
          category: 'computer',
          amount: 2000,
          purchaseDate: new Date('2024-01-01'),
          usage: 80,
          lifeSpan: 36,
          rank: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockUseGetEquipmentExpenses.mockReturnValue({
        data: equipmentData,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      const { result } = renderHook(
        () => useStableEquipment({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.equipment).toHaveLength(2);
      expect(result.current.equipment[0].rank).toBe(1);
      expect(result.current.equipment[1].rank).toBe(2);
      expect(result.current.equipment[0].name).toBe('Equipment 1');
    });

    it('should handle empty equipment array', () => {
      mockUseGetEquipmentExpenses.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      const { result } = renderHook(
        () => useStableEquipment({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.equipment).toEqual([]);
    });

    it('should handle undefined equipment data', () => {
      mockUseGetEquipmentExpenses.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: false,
        isFetching: false,
      });

      const { result } = renderHook(
        () => useStableEquipment({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.equipment).toEqual([]);
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should handle multiple stable hooks simultaneously', () => {
      const billableData: BillableCostItem = {
        id: 1,
        userId,
        workDays: 22,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1760,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const equipmentData: EquipmentExpenseItem[] = [
        {
          id: 1,
          userId,
          name: 'Equipment 1',
          category: 'computer',
          amount: 2000,
          purchaseDate: new Date('2024-01-01'),
          usage: 80,
          lifeSpan: 36,
          rank: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockUseGetBillableExpenses.mockReturnValue({
        data: billableData,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      mockUseGetEquipmentExpenses.mockReturnValue({
        data: equipmentData,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      const { result } = renderHook(
        () => ({
          billable: useStableBillable({ userId }),
          equipment: useStableEquipment({ userId }),
        }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.billable.billableData).toEqual(billableData);
      expect(result.current.equipment.equipment).toEqual(equipmentData);
      expect(result.current.billable.isSuccess).toBe(true);
      expect(result.current.equipment.isSuccess).toBe(true);
    });

    it('should handle mixed loading states across features', () => {
      mockUseGetBillableExpenses.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        isSuccess: false,
        isFetching: true,
      });

      mockUseGetEquipmentExpenses.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      const { result } = renderHook(
        () => ({
          billable: useStableBillable({ userId }),
          equipment: useStableEquipment({ userId }),
        }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.billable.isLoading).toBe(true);
      expect(result.current.equipment.isLoading).toBe(false);
      expect(result.current.billable.billableData).toBeNull();
      expect(result.current.equipment.equipment).toEqual([]);
    });

    it('should handle mixed error states across features', () => {
      const billableError = new Error('Billable fetch failed');
      const equipmentError = new Error('Equipment fetch failed');

      mockUseGetBillableExpenses.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: billableError,
        isSuccess: false,
        isFetching: false,
      });

      mockUseGetEquipmentExpenses.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: equipmentError,
        isSuccess: false,
        isFetching: false,
      });

      const { result } = renderHook(
        () => ({
          billable: useStableBillable({ userId }),
          equipment: useStableEquipment({ userId }),
        }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.billable.isError).toBe(true);
      expect(result.current.equipment.isError).toBe(true);
      expect(result.current.billable.error).toBe(billableError);
      expect(result.current.equipment.error).toBe(equipmentError);
    });
  });

  describe('Performance Characteristics', () => {
    it('should not cause unnecessary re-renders with stable references', () => {
      const equipmentData: EquipmentExpenseItem[] = [
        {
          id: 1,
          userId,
          name: 'Equipment 1',
          category: 'computer',
          amount: 2000,
          purchaseDate: new Date('2024-01-01'),
          usage: 80,
          lifeSpan: 36,
          rank: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockUseGetEquipmentExpenses.mockReturnValue({
        data: equipmentData,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      let renderCount = 0;
      const { result, rerender } = renderHook(
        () => {
          renderCount++;
          return useStableEquipment({ userId });
        },
        { wrapper: createQueryWrapper(queryClient) }
      );

      const firstData = result.current.equipment;
      const initialRenderCount = renderCount;

      // Rerender multiple times with same data
      rerender();
      rerender();
      rerender();

      const finalData = result.current.equipment;
      const finalRenderCount = renderCount;

      // Data reference should be stable
      expect(firstData).toBe(finalData);
      // Should have rendered 4 times total (initial + 3 rerenders)
      expect(finalRenderCount).toBe(initialRenderCount + 3);
    });

    it('should handle large datasets efficiently', () => {
      const largeEquipmentData: EquipmentExpenseItem[] = Array.from(
        { length: 1000 },
        (_, index) => ({
          id: index + 1,
          userId,
          name: `Equipment ${index + 1}`,
          category: 'computer',
          amount: 1000 + index,
          purchaseDate: new Date('2024-01-01'),
          usage: 80,
          lifeSpan: 36,
          rank: index + 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        })
      );

      mockUseGetEquipmentExpenses.mockReturnValue({
        data: largeEquipmentData,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      const startTime = performance.now();
      const { result } = renderHook(
        () => useStableEquipment({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );
      const endTime = performance.now();

      expect(result.current.equipment).toHaveLength(1000);
      expect(result.current.equipment[0].rank).toBe(1);
      expect(result.current.equipment[999].rank).toBe(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should maintain performance with frequent data updates', () => {
      let equipmentData: EquipmentExpenseItem[] = [
        {
          id: 1,
          userId,
          name: 'Equipment 1',
          category: 'computer',
          amount: 2000,
          purchaseDate: new Date('2024-01-01'),
          usage: 80,
          lifeSpan: 36,
          rank: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const mockQuery = {
        data: equipmentData,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      };

      mockUseGetEquipmentExpenses.mockReturnValue(mockQuery);

      const { result, rerender } = renderHook(
        () => useStableEquipment({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      const startTime = performance.now();

      // Simulate 100 rapid updates
      for (let i = 0; i < 100; i++) {
        equipmentData = [
          {
            ...equipmentData[0],
            amount: 2000 + i,
            updatedAt: new Date().toISOString(),
          },
        ];
        mockQuery.data = equipmentData;
        rerender();
      }

      const endTime = performance.now();

      expect(result.current.equipment[0].amount).toBe(2099);
      expect(endTime - startTime).toBeLessThan(1000); // Should handle 100 updates in less than 1 second
    });
  });
});