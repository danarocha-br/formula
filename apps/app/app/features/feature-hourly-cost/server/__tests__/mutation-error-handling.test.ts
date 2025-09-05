import type { ExpenseItem } from '@/app/types';
import { reactQueryKeys } from '@repo/database/cache-keys/react-query-keys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateFixedExpenses } from '../create-fixed-expenses';
import { useDeleteFixedExpenses } from '../delete-fixed-expenses';
import { useUpdateBatchFixedExpense } from '../update-batch-fixed-expenses';
import { useUpdateFixedExpense } from '../update-fixed-expense';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { optimisticUpdateUtils } from '@/utils/query-cache-utils';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { optimisticUpdateUtils } from '@/utils/query-cache-utils';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { optimisticUpdateUtils } from '@/utils/query-cache-utils';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { optimisticUpdateUtils } from '@/utils/query-cache-utils';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { optimisticUpdateUtils } from '@/utils/query-cache-utils';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { expenseCacheUtils } from '@/utils/query-cache-utils';
import { optimisticUpdateUtils } from '@/utils/query-cache-utils';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { circuitBreakers } from '@/utils/circuit-breaker';

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
          $put: vi.fn(),
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
        'network-error': 'Network error occurred',
        'server-error': 'Server error occurred',
        'validation-failed': 'Validation failed',
      },
    },
  }),
}));

// Mock cache utilities
vi.mock('@/utils/query-cache-utils', () => ({
  expenseCacheUtils: {
    addExpense: vi.fn(),
    updateExpense: vi.fn(),
    removeExpense: vi.fn(),
    reorderExpenses: vi.fn(),
    updateMultipleExpenses: vi.fn(),
    getExpense: vi.fn(),
    getCurrentExpenses: vi.fn(),
    replaceAllExpenses: vi.fn(),
  },
  optimisticUpdateUtils: {
    createOptimisticExpense: vi.fn(),
    replaceTempExpense: vi.fn(),
    isTempExpense: vi.fn(),
  },
}));

// Mock circuit breakers
vi.mock('@/utils/circuit-breaker', () => ({
  circuitBreakers: {
    createExpense: {
      execute: vi.fn(),
      executeSync: vi.fn(),
      getStatus: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 })),
    },
    updateExpense: {
      execute: vi.fn(),
      executeSync: vi.fn(),
      getStatus: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 })),
    },
    deleteExpense: {
      execute: vi.fn(),
      executeSync: vi.fn(),
      getStatus: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 })),
    },
    cacheUpdate: {
      executeSync: vi.fn(),
      getStatus: vi.fn(() => ({ state: 'CLOSED', failureCount: 0 })),
    },
  },
}));

// Mock retry utility
vi.mock('@/utils/retry-with-backoff', () => ({
  retryWithBackoff: vi.fn(),
  RetryError: class RetryError extends Error {
    constructor(message: string, public attempts: number, public lastError: Error, public allErrors: Error[]) {
      super(message);
      this.name = 'RetryError';
    }
  },
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

const mockExpense: ExpenseItem = {
  id: 1,
  name: 'Test Expense',
  amount: 100,
  category: 'office',
  period: 'monthly',
  rank: 1,
  userId: 'user-123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('Mutation Error Handling Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Reset circuit breaker mocks
    vi.mocked(circuitBreakers.createExpense.execute).mockImplementation(async (fn) => fn());
    vi.mocked(circuitBreakers.updateExpense.execute).mockImplementation(async (fn) => fn());
    vi.mocked(circuitBreakers.deleteExpense.execute).mockImplementation(async (fn) => fn());
    vi.mocked(circuitBreakers.cacheUpdate.executeSync).mockImplementation((fn) => fn());
  });

  const wrapper = ({ children }: { children: any }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  describe('useCreateFixedExpenses Error Scenarios', () => {
    it('should handle network errors with proper error messages', async () => {
      const networkError = new Error('Network error');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'].$post).mockRejectedValue(networkError);

      // Mock retry to fail after attempts
      const { retryWithBackoff, RetryError } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(
        new RetryError('Operation failed after 3 attempts', 3, networkError, [networkError])
      );

      const { result } = renderHook(() => useCreateFixedExpenses(), { wrapper });

      // Mock optimistic expense creation
      const optimisticExpense = { ...mockExpense, id: -1 };
      vi.mocked(optimisticUpdateUtils.createOptimisticExpense).mockReturnValue(optimisticExpense);
      vi.mocked(expenseCacheUtils.getCurrentExpenses).mockReturnValue([]);

      result.current.mutate({
        json: {
          name: 'Test Expense',
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

      // Verify error handling
      expect(result.current.error).toBeInstanceOf(RetryError);
      expect(expenseCacheUtils.removeExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        optimisticExpense.id
      );
    });

    it('should handle API validation errors without retry', async () => {
      const validationError = new Error('400: Validation failed');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'].$post).mockRejectedValue(validationError);

      // Mock retry to not retry validation errors
      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(validationError);

      const { result } = renderHook(() => useCreateFixedExpenses(), { wrapper });

      const optimisticExpense = { ...mockExpense, id: -1 };
      vi.mocked(optimisticUpdateUtils.createOptimisticExpense).mockReturnValue(optimisticExpense);
      vi.mocked(expenseCacheUtils.getCurrentExpenses).mockReturnValue([]);

      result.current.mutate({
        json: {
          name: '',
          amount: -100,
          category: 'office',
          period: 'monthly',
          rank: 1,
          userId: 'user-123',
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('400');
    });

    it('should handle circuit breaker open state', async () => {
      // Mock circuit breaker to be open
      vi.mocked(circuitBreakers.createExpense.execute).mockRejectedValue(
        new Error('Circuit breaker is OPEN for createExpense')
      );

      const { result } = renderHook(() => useCreateFixedExpenses(), { wrapper });

      result.current.mutate({
        json: {
          name: 'Test Expense',
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

      expect(result.current.error?.message).toContain('Circuit breaker is OPEN');
    });

    it('should handle optimistic update failures gracefully', async () => {
      const cacheError = new Error('Cache update failed');
      vi.mocked(circuitBreakers.cacheUpdate.executeSync).mockImplementation(() => {
        throw cacheError;
      });

      const { result } = renderHook(() => useCreateFixedExpenses(), { wrapper });

      const optimisticExpense = { ...mockExpense, id: -1 };
      vi.mocked(optimisticUpdateUtils.createOptimisticExpense).mockReturnValue(optimisticExpense);
      vi.mocked(expenseCacheUtils.getCurrentExpenses).mockReturnValue([]);

      // Should not throw during onMutate even if cache update fails
      result.current.mutate({
        json: {
          name: 'Test Expense',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 1,
          userId: 'user-123',
        },
      });

      // The mutation should still proceed despite optimistic update failure
      expect(result.current.isPending).toBe(true);
    });

    it('should handle rollback failures by falling back to invalidation', async () => {
      const networkError = new Error('Network error');
      const rollbackError = new Error('Rollback failed');

      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'].$post).mockRejectedValue(networkError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(networkError);

      // Mock rollback to fail
      vi.mocked(circuitBreakers.cacheUpdate.executeSync).mockImplementation((fn) => {
        if (fn.toString().includes('removeExpense')) {
          throw rollbackError;
        }
        return fn();
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateFixedExpenses(), { wrapper });

      const optimisticExpense = { ...mockExpense, id: -1 };
      vi.mocked(optimisticUpdateUtils.createOptimisticExpense).mockReturnValue(optimisticExpense);
      vi.mocked(expenseCacheUtils.getCurrentExpenses).mockReturnValue([]);

      result.current.mutate({
        json: {
          name: 'Test Expense',
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
  });

  describe('useUpdateFixedExpense Error Scenarios', () => {
    it('should handle update errors with proper rollback', async () => {
      const updateError = new Error('Update failed');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'][':id'].$patch).mockRejectedValue(updateError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(updateError);

      const { result } = renderHook(() => useUpdateFixedExpense(), { wrapper });

      const queryKey = reactQueryKeys.fixedExpenses.byUserId('user-123');
      const previousExpenses = [mockExpense];
      queryClient.setQueryData(queryKey, previousExpenses);

      vi.mocked(expenseCacheUtils.getExpense).mockReturnValue(mockExpense);

      result.current.mutate({
        json: {
          name: 'Updated Expense',
          userId: 'user-123',
        },
        param: { id: '1' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify rollback was attempted
      expect(circuitBreakers.cacheUpdate.executeSync).toHaveBeenCalled();
    });

    it('should handle non-existent expense updates', async () => {
      const { result } = renderHook(() => useUpdateFixedExpense(), { wrapper });

      // Mock expense not found
      vi.mocked(expenseCacheUtils.getExpense).mockReturnValue(undefined);

      const queryKey = reactQueryKeys.fixedExpenses.byUserId('user-123');
      queryClient.setQueryData(queryKey, []);

      result.current.mutate({
        json: {
          name: 'Updated Expense',
          userId: 'user-123',
        },
        param: { id: '999' },
      });

      // Should handle gracefully without throwing
      expect(result.current.isPending).toBe(true);
    });
  });

  describe('useDeleteFixedExpenses Error Scenarios', () => {
    it('should handle delete errors with proper rollback', async () => {
      const deleteError = new Error('Delete failed');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'][':userId'][':id'].$delete).mockRejectedValue(deleteError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(deleteError);

      const { result } = renderHook(() => useDeleteFixedExpenses(), { wrapper });

      const queryKey = reactQueryKeys.fixedExpenses.byUserId('user-123');
      const previousExpenses = [mockExpense];
      queryClient.setQueryData(queryKey, previousExpenses);

      result.current.mutate({
        param: { id: '1', userId: 'user-123' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify optimistic delete was attempted
      expect(expenseCacheUtils.removeExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        1
      );

      // Verify rollback was attempted
      expect(circuitBreakers.cacheUpdate.executeSync).toHaveBeenCalled();
    });

    it('should handle delete of non-existent expense', async () => {
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'][':userId'][':id'].$delete).mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      } as any);

      const { result } = renderHook(() => useDeleteFixedExpenses(), { wrapper });

      const queryKey = reactQueryKeys.fixedExpenses.byUserId('user-123');
      queryClient.setQueryData(queryKey, []);

      result.current.mutate({
        param: { id: '999', userId: 'user-123' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should handle gracefully
      expect(expenseCacheUtils.removeExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        999
      );
    });
  });

  describe('useUpdateBatchFixedExpense Error Scenarios', () => {
    it('should handle batch update errors', async () => {
      const batchError = new Error('Batch update failed');
      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['fixed-costs'].$put).mockRejectedValue(batchError);

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff).mockRejectedValue(batchError);

      const { result } = renderHook(() => useUpdateBatchFixedExpense(), { wrapper });

      vi.mocked(expenseCacheUtils.getCurrentExpenses).mockReturnValue([mockExpense]);

      result.current.mutate({
        json: {
          userId: 'user-123',
          updates: [
            {
              id: 1,
              data: { amount: 200 },
            },
          ],
        },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(batchError);
    });

    it('should handle empty batch updates', async () => {
      const { result } = renderHook(() => useUpdateBatchFixedExpense(), { wrapper });

      vi.mocked(expenseCacheUtils.getCurrentExpenses).mockReturnValue([]);

      result.current.mutate({
        json: {
          userId: 'user-123',
          updates: [],
        },
      });

      // Should handle gracefully
      expect(result.current.isPending).toBe(true);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should respect circuit breaker state across mutations', async () => {
      // Mock circuit breaker to be open for all operations
      vi.mocked(circuitBreakers.createExpense.execute).mockRejectedValue(
        new Error('Circuit breaker is OPEN')
      );
      vi.mocked(circuitBreakers.updateExpense.execute).mockRejectedValue(
        new Error('Circuit breaker is OPEN')
      );
      vi.mocked(circuitBreakers.deleteExpense.execute).mockRejectedValue(
        new Error('Circuit breaker is OPEN')
      );

      const createHook = renderHook(() => useCreateFixedExpenses(), { wrapper });
      const updateHook = renderHook(() => useUpdateFixedExpense(), { wrapper });
      const deleteHook = renderHook(() => useDeleteFixedExpenses(), { wrapper });

      // All mutations should fail due to circuit breaker
      createHook.result.current.mutate({
        json: {
          name: 'Test',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 1,
          userId: 'user-123',
        },
      });

      updateHook.result.current.mutate({
        json: { name: 'Updated', userId: 'user-123' },
        param: { id: '1' },
      });

      deleteHook.result.current.mutate({
        param: { id: '1', userId: 'user-123' },
      });

      await waitFor(() => {
        expect(createHook.result.current.isError).toBe(true);
        expect(updateHook.result.current.isError).toBe(true);
        expect(deleteHook.result.current.isError).toBe(true);
      });

      expect(createHook.result.current.error?.message).toContain('Circuit breaker is OPEN');
      expect(updateHook.result.current.error?.message).toContain('Circuit breaker is OPEN');
      expect(deleteHook.result.current.error?.message).toContain('Circuit breaker is OPEN');
    });
  });

  describe('Concurrent Mutation Error Handling', () => {
    it('should handle concurrent mutations with proper isolation', async () => {
      const { client } = await import('@repo/design-system/lib/rpc');

      // Mock first mutation to succeed, second to fail
      vi.mocked(client.api.expenses['fixed-costs'].$post)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            success: true,
            data: { ...mockExpense, id: 2 },
          }),
        } as any)
        .mockRejectedValueOnce(new Error('Second mutation failed'));

      const { retryWithBackoff } = await import('@/utils/retry-with-backoff');
      vi.mocked(retryWithBackoff)
        .mockResolvedValueOnce({
          success: true,
          data: { ...mockExpense, id: 2 },
        })
        .mockRejectedValueOnce(new Error('Second mutation failed'));

      const hook1 = renderHook(() => useCreateFixedExpenses(), { wrapper });
      const hook2 = renderHook(() => useCreateFixedExpenses(), { wrapper });

      vi.mocked(optimisticUpdateUtils.createOptimisticExpense)
        .mockReturnValueOnce({ ...mockExpense, id: -1 })
        .mockReturnValueOnce({ ...mockExpense, id: -2 });

      vi.mocked(expenseCacheUtils.getCurrentExpenses).mockReturnValue([]);

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

      // First mutation should succeed
      expect(optimisticUpdateUtils.replaceTempExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        -1,
        expect.objectContaining({ id: 2 })
      );

      // Second mutation should rollback
      expect(expenseCacheUtils.removeExpense).toHaveBeenCalledWith(
        queryClient,
        'user-123',
        -2
      );
    });
  });
});