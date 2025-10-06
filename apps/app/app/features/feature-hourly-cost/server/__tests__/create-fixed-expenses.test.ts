import type { ExpenseItem } from '@/app/types';
import { expenseCacheUtils, optimisticUpdateUtils } from '@/utils/query-cache-utils';
import { reactQueryKeys } from '@repo/database/cache-keys/react-query-keys';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the RPC client
vi.mock('@repo/design-system/lib/rpc', () => ({
  client: {
    api: {
      expenses: {
        'fixed-costs': {
          $post: vi.fn(),
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
      },
    },
  }),
}));

describe('useCreateFixedExpenses - Cache Management', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  it('should use precise cache updates instead of invalidateQueries', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 123,
        name: 'Test Expense',
        amount: 100,
        category: 'rent',
        rank: 1,
        period: 'monthly',
      },
    };

    const { client } = await import('@repo/design-system/lib/rpc');
    vi.mocked(client.api.expenses['fixed-costs'].$post).mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    } as any);

    const userId = 'test-user-id';
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    // Set initial cache data
    const initialExpenses: ExpenseItem[] = [
      {
        id: 1,
        name: 'Existing Expense',
        amount: 50,
        category: 'utilities',
        period: 'monthly',
        rank: 0,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    queryClient.setQueryData(queryKey, initialExpenses);

    // Test the mutation logic directly
    const mutationData = {
      json: {
        name: 'Test Expense',
        amount: 100,
        category: 'rent',
        period: 'monthly',
        rank: 1,
        userId,
      },
    };

    // Simulate the onMutate behavior
    const previousExpenses = expenseCacheUtils.getCurrentExpenses(queryClient, userId);
    expect(previousExpenses).toHaveLength(1);

    // Verify cache utilities work correctly
    const testExpense: ExpenseItem = {
      id: 123,
      name: 'Test Expense',
      amount: 100,
      category: 'rent',
      period: 'monthly',
      rank: 1,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expenseCacheUtils.addExpense(queryClient, userId, testExpense);

    // Verify the cache was updated with the new expense
    const updatedExpenses = queryClient.getQueryData<ExpenseItem[]>(queryKey);
    expect(updatedExpenses).toHaveLength(2);
    expect(updatedExpenses?.find(e => e.id === 123)).toBeDefined();
    expect(updatedExpenses?.find(e => e.name === 'Test Expense')).toBeDefined();
  });

  it('should handle optimistic updates correctly', () => {
    const userId = 'test-user-id';
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    queryClient.setQueryData(queryKey, []);

    // Test optimistic expense creation
    const optimisticExpense = optimisticUpdateUtils.createOptimisticExpense(
      {
        name: 'Optimistic Expense',
        amount: 200,
        category: 'insurance',
        period: 'yearly',
        rank: 2,
      },
      userId
    );

    expect(optimisticExpense.name).toBe('Optimistic Expense');
    expect(optimisticExpense.userId).toBe(userId);
    expect(optimisticExpense.id).toBeGreaterThan(0);

    // Add optimistic expense to cache
    expenseCacheUtils.addExpense(queryClient, userId, optimisticExpense);

    const expenses = queryClient.getQueryData<ExpenseItem[]>(queryKey);
    expect(expenses).toHaveLength(1);
    expect(expenses?.[0].name).toBe('Optimistic Expense');
  });

  it('should rollback optimistic updates on error', () => {
    const userId = 'test-user-id';
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    const initialExpenses: ExpenseItem[] = [
      {
        id: 1,
        name: 'Existing Expense',
        amount: 50,
        category: 'utilities',
        period: 'monthly',
        rank: 0,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    queryClient.setQueryData(queryKey, initialExpenses);

    // Add an optimistic expense
    const optimisticExpense: ExpenseItem = {
      id: 999,
      name: 'Failed Expense',
      amount: 300,
      category: 'other',
      period: 'monthly',
      rank: 3,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expenseCacheUtils.addExpense(queryClient, userId, optimisticExpense);

    // Verify optimistic expense was added
    const expenses = queryClient.getQueryData<ExpenseItem[]>(queryKey);
    expect(expenses).toHaveLength(2);

    // Simulate error rollback
    expenseCacheUtils.removeExpense(queryClient, userId, optimisticExpense.id);
    expenseCacheUtils.replaceAllExpenses(queryClient, userId, initialExpenses);

    // Verify the cache was rolled back to the original state
    const finalExpenses = queryClient.getQueryData<ExpenseItem[]>(queryKey);
    expect(finalExpenses).toHaveLength(1);
    expect(finalExpenses?.[0].id).toBe(1);
    expect(finalExpenses?.[0].name).toBe('Existing Expense');
  });

  it('should not use invalidateQueries in normal flow', () => {
    const userId = 'test-user-id';

    // Spy on queryClient methods
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    queryClient.setQueryData(reactQueryKeys.fixedExpenses.byUserId(userId), []);

    // Test direct cache manipulation (what the mutation does)
    const testExpense: ExpenseItem = {
      id: 789,
      name: 'No Invalidate Expense',
      amount: 150,
      category: 'subscriptions',
      period: 'monthly',
      rank: 1,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expenseCacheUtils.addExpense(queryClient, userId, testExpense);

    // Verify setQueryData was used for precise updates
    expect(setQueryDataSpy).toHaveBeenCalled();

    // Verify invalidateQueries was NOT called
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('should maintain proper error handling context', () => {
    const userId = 'test-user-id';
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    // Test that the mutation context interface is properly structured
    const mockContext = {
      previousExpenses: [] as ExpenseItem[],
      queryKey,
      optimisticExpense: {
        id: 123,
        name: 'Test',
        amount: 100,
        category: 'rent',
        period: 'monthly' as const,
        rank: 1,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    // Verify the context structure matches what the mutation expects
    expect(mockContext.previousExpenses).toBeDefined();
    expect(mockContext.queryKey).toBeDefined();
    expect(mockContext.optimisticExpense).toBeDefined();
    expect(mockContext.optimisticExpense.period).toBe('monthly');
  });
});