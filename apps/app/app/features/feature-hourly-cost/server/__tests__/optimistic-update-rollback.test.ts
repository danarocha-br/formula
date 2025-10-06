import type { ExpenseItem } from '@/app/types';
import { expenseCacheUtils, optimisticUpdateUtils } from '@/utils/query-cache-utils';
import { reactQueryKeys } from '@repo/database/cache-keys/react-query-keys';
import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateFixedExpenses } from '../create-fixed-expenses';
import { useDeleteFixedExpenses } from '../delete-fixed-expenses';
import { useUpdateFixedExpense } from '../update-fixed-expense';

// Mock the RPC client
vi.mock('@repo/design-system/lib/rpc', () => ({
  client: {
    api: {
      expenses: {
        'fixed-costs': {
          $post: vi.fn(),
          ':id': {
            $patch: vi.fn(),
          },
          ':userId': {
            ':id': {
              $delete: vi.fn(),
            },
          },
        },
      },
    },
  },
}));

// Mock translations
vi.mock('@/utils/translations', () => ({
  getTranslations: () => ({
    validation: {
      error: {
        'create-failed': 'Failed to create expense',
        'update-failed': 'Failed to update expense',
        'delete-failed': 'Failed to delete expense',
      },
    },
  }),
}));

// Mock circuit breakers and retry
vi.mock('@/utils/circuit-breaker', () => ({
  circuitBreakers: {
    createExpense: {
      execute: vi.fn((fn) => fn()),
      executeSync: vi.fn((fn) => fn()),
      getStatus: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 })),
    },
    updateExpense: {
      execute: vi.fn((fn) => fn()),
      executeSync: vi.fn((fn) => fn()),
      getStatus: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 })),
    },
    deleteExpense: {
      execute: vi.fn((fn) => fn()),
      executeSync: vi.fn((fn) => fn()),
      getStatus: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 })),
    },
    cacheUpdate: {
      executeSync: vi.fn((fn) => fn()),
      getStatus: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 })),
    },
  },
}));

vi.mock('@/utils/retry-with-backoff', () => ({
  retryWithBackoff: vi.fn((fn) => fn()),
  RetryConfigs: {
    api: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
    },
  },
}));

const createMockExpense = (overrides: Partial<ExpenseItem> = {}): ExpenseItem => ({
  id: 1,
  name: 'Test Expense',
  amount: 100,
  category: 'office',
  period: 'monthly',
  rank: 1,
  userId: 'user-123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('Optimistic Update Rollback Tests', () => {
  let queryClient: QueryClient;
  let mockExpenseCacheUtils: typeof expenseCacheUtils;
  let mockOptimisticUpdateUtils: typeof optimisticUpdateUtils;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Create fresh mocks for each test
    mockExpenseCacheUtils = {
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      removeExpense: vi.fn(),
      reorderExpenses: vi.fn(),
      updateMultipleExpenses: vi.fn(),
      getExpense: vi.fn(),
      getCurrentExpenses: vi.fn(),
      replaceAllExpenses: vi.fn(),
      removeMultipleExpenses: vi.fn(),
      expenseExists: vi.fn(),
    } as any;

    mockOptimisticUpdateUtils = {
      createOptimisticExpense: vi.fn(),
      replaceTempExpense: vi.fn(),
      isTempExpense: vi.fn(),
      createTempId: vi.fn(),
    } as any;

    // Mock the modules
    vi.mocked(expenseCacheUtils).addExpense = mockExpenseCacheUtils.addExpense;
    vi.mocked(expenseCacheUtils).updateExpense = mockExpenseCacheUtils.updateExpense;
    vi.mocked(expenseCacheUtils).removeExpense = mockExpenseCacheUtils.removeExpense;
    vi.mocked(expenseCacheUtils).getCurrentExpenses = mockExpenseCacheUtils.getCurrentExpenses;
    vi.mocked(expenseCacheUtils).replaceAllExpenses = mockExpenseCacheUtils.replaceAllExpenses;
    vi.mocked(expenseCacheUtils).getExpense = mockExpenseCacheUtils.getExpense;

    vi.mocked(optimisticUpdateUtils).createOptimisticExpense = mockOptimisticUpdateUtils.createOptimisticExpense;
    vi.mocked(optimisticUpdateUtils).replaceTempExpense = mockOptimisticUpdateUtils.replaceTempExpense;

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: any }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  describe('Create Expense Optimistic Rollback', () => {
    it('should rollback optimistic create on API failure', async () => {
      const apiError = new Error('API Error');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'].$post).mockRejectedValue(apiError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(apiError);

      const { result } = renderHook(() => useCreateFixedExpenses(), { wrapper });

      const initialExpenses = [createMockExpense({ id: 1, name: 'Existing' })];
      const optimisticExpense = createMockExpense({ id: -1, name: 'Optimistic' });

      mockExpenseCacheUtils.getCurrentExpenses.mockReturnValue(initialExpenses);
      mockOptimisticUpdateUtils.createOptimisticExpense.mockReturnValue(optimisticExpense);

      // Execute the mutation
      result.current.mutate({
        json: {
          name: 'New Expense',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 2,
          userId: 'user-123',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify optimistic update was added
      expect(mockExpenseCacheUtils.addExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        optimisticExpense
      );

      // Verify rollback occurred
      expect(mockExpenseCacheUtils.removeExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        optimisticExpense.id
      );

      // Verify cache was restored to previous state
      expect(mockExpenseCacheUtils.replaceAllExpenses).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        initialExpenses
      );
    });

    it('should handle rollback when previous expenses is undefined', async () => {
      const apiError = new Error('API Error');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'].$post).mockRejectedValue(apiError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(apiError);

      const { result } = renderHook(() => useCreateFixedExpenses(), { wrapper });

      const optimisticExpense = createMockExpense({ id: -1, name: 'Optimistic' });

      // Mock empty initial state
      mockExpenseCacheUtils.getCurrentExpenses.mockReturnValue([]);
      mockOptimisticUpdateUtils.createOptimisticExpense.mockReturnValue(optimisticExpense);

      result.current.mutate({
        json: {
          name: 'New Expense',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 1,
          userId: 'user-123',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should still remove the optimistic expense
      expect(mockExpenseCacheUtils.removeExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        optimisticExpense.id
      );

      // Should restore empty array
      expect(mockExpenseCacheUtils.replaceAllExpenses).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        []
      );
    });

    it('should handle successful optimistic update replacement', async () => {
      const successResponse = {
        success: true,
        data: {
          id: 123,
          name: 'Created Expense',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 1,
        },
      };

      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'].$post).mockResolvedValue({
        json: () => Promise.resolve(successResponse),
      } as any);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockResolvedValue(successResponse);

      const { result } = renderHook(() => useCreateFixedExpenses(), { wrapper });

      const optimisticExpense = createMockExpense({ id: -1, name: 'Optimistic' });
      mockOptimisticUpdateUtils.createOptimisticExpense.mockReturnValue(optimisticExpense);
      mockExpenseCacheUtils.getCurrentExpenses.mockReturnValue([]);

      result.current.mutate({
        json: {
          name: 'New Expense',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 1,
          userId: 'user-123',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify optimistic expense was replaced with real one
      expect(mockOptimisticUpdateUtils.replaceTempExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        optimisticExpense.id,
        expect.objectContaining({
          id: 123,
          name: 'Created Expense',
          userId: 'user-123',
        })
      );
    });
  });

  describe('Update Expense Optimistic Rollback', () => {
    it('should rollback optimistic update on API failure', async () => {
      const apiError = new Error('Update failed');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'][':id'].$patch).mockRejectedValue(apiError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(apiError);

      const { result } = renderHook(() => useUpdateFixedExpense(), { wrapper });

      const originalExpense = createMockExpense({ id: 1, name: 'Original' });
      const queryKey = reactQueryKeys.fixedExpenses.byUserId('user-123');
      const previousExpenses = [originalExpense];

      queryClient.setQueryData(queryKey, previousExpenses);
      mockExpenseCacheUtils.getExpense.mockReturnValue(originalExpense);

      result.current.mutate({
        json: {
          name: 'Updated Name',
          userId: 'user-123',
        },
        param: { id: '1' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify optimistic update was attempted
      expect(mockExpenseCacheUtils.updateExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        expect.objectContaining({
          id: 1,
          name: 'Updated Name',
        })
      );

      // Verify rollback occurred - cache should be restored to previous state
      const finalCacheData = queryClient.getQueryData(queryKey);
      expect(finalCacheData).toEqual(previousExpenses);
    });

    it('should handle update rollback with missing expense', async () => {
      const apiError = new Error('Update failed');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'][':id'].$patch).mockRejectedValue(apiError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(apiError);

      const { result } = renderHook(() => useUpdateFixedExpense(), { wrapper });

      const queryKey = reactQueryKeys.fixedExpenses.byUserId('user-123');
      const previousExpenses: ExpenseItem[] = [];

      queryClient.setQueryData(queryKey, previousExpenses);
      mockExpenseCacheUtils.getExpense.mockReturnValue(undefined);

      result.current.mutate({
        json: {
          name: 'Updated Name',
          userId: 'user-123',
        },
        param: { id: '999' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should handle gracefully without throwing
      expect(result.current.error).toBe(apiError);
    });
  });

  describe('Delete Expense Optimistic Rollback', () => {
    it('should rollback optimistic delete on API failure', async () => {
      const apiError = new Error('Delete failed');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'][':userId'][':id'].$delete).mockRejectedValue(apiError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(apiError);

      const { result } = renderHook(() => useDeleteFixedExpenses(), { wrapper });

      const expenseToDelete = createMockExpense({ id: 1, name: 'To Delete' });
      const otherExpense = createMockExpense({ id: 2, name: 'Other' });
      const queryKey = reactQueryKeys.fixedExpenses.byUserId('user-123');
      const previousExpenses = [expenseToDelete, otherExpense];

      queryClient.setQueryData(queryKey, previousExpenses);

      result.current.mutate({
        param: { id: '1', userId: 'user-123' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify optimistic delete was attempted
      expect(mockExpenseCacheUtils.removeExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        1
      );

      // Verify rollback occurred - cache should be restored to previous state
      const finalCacheData = queryClient.getQueryData(queryKey);
      expect(finalCacheData).toEqual(previousExpenses);
    });

    it('should handle delete rollback with empty previous state', async () => {
      const apiError = new Error('Delete failed');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'][':userId'][':id'].$delete).mockRejectedValue(apiError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(apiError);

      const { result } = renderHook(() => useDeleteFixedExpenses(), { wrapper });

      const queryKey = reactQueryKeys.fixedExpenses.byUserId('user-123');
      const previousExpenses: ExpenseItem[] = [];

      queryClient.setQueryData(queryKey, previousExpenses);

      result.current.mutate({
        param: { id: '999', userId: 'user-123' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should still attempt the optimistic delete
      expect(mockExpenseCacheUtils.removeExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        999
      );

      // Should restore empty array
      const finalCacheData = queryClient.getQueryData(queryKey);
      expect(finalCacheData).toEqual([]);
    });
  });

  describe('Complex Rollback Scenarios', () => {
    it('should handle multiple concurrent optimistic updates with selective rollback', async () => {
      const { client } = await import('@repo/design-system/lib/rpc');

      // First mutation succeeds, second fails
      vi.mocked(client.api.expenses['fixed-costs'].$post)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            success: true,
            data: { id: 100, name: 'Success', amount: 100, category: 'office', period: 'monthly', rank: 1 },
          }),
        } as any)
        .mockRejectedValueOnce(new Error('Second mutation failed'));

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff)
        .mockResolvedValueOnce({
          success: true,
          data: { id: 100, name: 'Success', amount: 100, category: 'office', period: 'monthly', rank: 1 },
        })
        .mockRejectedValueOnce(new Error('Second mutation failed'));

      const hook1 = renderHook(() => useCreateFixedExpenses(), { wrapper });
      const hook2 = renderHook(() => useCreateFixedExpenses(), { wrapper });

      const optimistic1 = createMockExpense({ id: -1, name: 'Optimistic 1' });
      const optimistic2 = createMockExpense({ id: -2, name: 'Optimistic 2' });

      mockOptimisticUpdateUtils.createOptimisticExpense
        .mockReturnValueOnce(optimistic1)
        .mockReturnValueOnce(optimistic2);

      mockExpenseCacheUtils.getCurrentExpenses.mockReturnValue([]);

      // Execute concurrent mutations
      hook1.result.current.mutate({
        json: {
          name: 'First Expense',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 1,
          userId: 'user-123',
        },
      });

      hook2.result.current.mutate({
        json: {
          name: 'Second Expense',
          amount: 200,
          category: 'office',
          period: 'monthly',
          rank: 2,
          userId: 'user-123',
        },
      });

      await waitFor(() => {
        expect(hook1.result.current.isSuccess).toBe(true);
        expect(hook2.result.current.isError).toBe(true);
      });

      // First mutation should replace optimistic with real
      expect(mockOptimisticUpdateUtils.replaceTempExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        -1,
        expect.objectContaining({ id: 100 })
      );

      // Second mutation should rollback its optimistic update
      expect(mockExpenseCacheUtils.removeExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        -2
      );
    });

    it('should handle rollback when cache utilities throw errors', async () => {
      const apiError = new Error('API Error');
      const cacheError = new Error('Cache error');

      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'].$post).mockRejectedValue(apiError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(apiError);

      // Mock cache utilities to throw during rollback
      mockExpenseCacheUtils.removeExpense.mockImplementation(() => {
        throw cacheError;
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateFixedExpenses(), { wrapper });

      const optimisticExpense = createMockExpense({ id: -1, name: 'Optimistic' });
      mockOptimisticUpdateUtils.createOptimisticExpense.mockReturnValue(optimisticExpense);
      mockExpenseCacheUtils.getCurrentExpenses.mockReturnValue([]);

      result.current.mutate({
        json: {
          name: 'New Expense',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 1,
          userId: 'user-123',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should fall back to invalidation when rollback fails
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });

    it('should maintain cache consistency during partial rollback failures', async () => {
      const apiError = new Error('API Error');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'].$post).mockRejectedValue(apiError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(apiError);

      const { result } = renderHook(() => useCreateFixedExpenses(), { wrapper });

      const initialExpenses = [
        createMockExpense({ id: 1, name: 'Existing 1' }),
        createMockExpense({ id: 2, name: 'Existing 2' }),
      ];
      const optimisticExpense = createMockExpense({ id: -1, name: 'Optimistic' });

      mockExpenseCacheUtils.getCurrentExpenses.mockReturnValue(initialExpenses);
      mockOptimisticUpdateUtils.createOptimisticExpense.mockReturnValue(optimisticExpense);

      // Mock removeExpense to succeed but replaceAllExpenses to fail
      mockExpenseCacheUtils.removeExpense.mockImplementation(() => {
        // Success - no throw
      });
      mockExpenseCacheUtils.replaceAllExpenses.mockImplementation(() => {
        throw new Error('Replace failed');
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate({
        json: {
          name: 'New Expense',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 1,
          userId: 'user-123',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should attempt both rollback operations
      expect(mockExpenseCacheUtils.removeExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        -1
      );
      expect(mockExpenseCacheUtils.replaceAllExpenses).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        initialExpenses
      );

      // Should fall back to invalidation when partial rollback fails
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });
});