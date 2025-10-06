import type { ExpenseItem } from '@/app/types';
import { circuitBreakers } from '@/utils/circuit-breaker';
import { expenseCacheUtils, optimisticUpdateUtils } from '@/utils/query-cache-utils';
import { retryWithBackoff, RetryConfigs } from '@/utils/retry-with-backoff';
import { reactQueryKeys } from '@repo/database/cache-keys/react-query-keys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateFixedExpenses } from '../server/create-fixed-expenses';

// Mock the RPC client
const mockApiPost = vi.fn();
vi.mock('@repo/design-system/lib/rpc', () => ({
  client: {
    api: {
      expenses: {
        'fixed-costs': {
          $post: mockApiPost,
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
        'network-error': 'Network error occurred',
        'server-error': 'Server error occurred',
      },
    },
  }),
}));

// Mock utilities with real implementations for integration testing
vi.mock('@/utils/circuit-breaker');
vi.mock('@/utils/retry-with-backoff');
vi.mock('@/utils/query-cache-utils');

// Test component that uses the create mutation
const AddExpenseForm: React.FC<{ userId: string; onSuccess?: (expense: ExpenseItem) => void }> = ({
  userId,
  onSuccess
}) => {
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState('office');
  const [period, setPeriod] = React.useState<'monthly' | 'yearly'>('monthly');

  const createMutation = useCreateFixedExpenses();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate({
      json: {
        name,
        amount: parseFloat(amount),
        category,
        period,
        rank: 1,
        userId,
      },
    }, {
      onSuccess: (data) => {
        if (data.success && 'data' in data) {
          const expense: ExpenseItem = {
            id: data.data.id,
            name: data.data.name,
            amount: data.data.amount,
            category: data.data.category,
            period: data.data.period as 'monthly' | 'yearly',
            rank: data.data.rank,
            userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onSuccess?.(expense);
        }
      },
    });
  };

  return (
    <div>
      <form onSubmit={handleSubmit} data-testid="add-expense-form">
        <input
          data-testid="expense-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Expense name"
        />
        <input
          data-testid="expense-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
        />
        <select
          data-testid="expense-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="office">Office</option>
          <option value="rent">Rent</option>
          <option value="utilities">Utilities</option>
        </select>
        <select
          data-testid="expense-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'monthly' | 'yearly')}
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <button
          type="submit"
          disabled={createMutation.isPending}
          data-testid="submit-button"
        >
          {createMutation.isPending ? 'Adding...' : 'Add Expense'}
        </button>
      </form>

      {createMutation.isError && (
        <div data-testid="error-message" role="alert">
          Error: {createMutation.error?.message}
        </div>
      )}

      {createMutation.isSuccess && (
        <div data-testid="success-message">
          Expense added successfully!
        </div>
      )}

      <div data-testid="mutation-status">
        Status: {createMutation.status}
      </div>
    </div>
  );
};

// Component to display current expenses from cache
const ExpensesList: React.FC<{ userId: string }> = ({ userId }) => {
  const queryClient = new QueryClient();
  const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);
  const expenses = queryClient.getQueryData<ExpenseItem[]>(queryKey) || [];

  return (
    <div data-testid="expenses-list">
      {expenses.length === 0 ? (
        <div data-testid="no-expenses">No expenses</div>
      ) : (
        <ul>
          {expenses.map((expense) => (
            <li key={expense.id} data-testid={`expense-${expense.id}`}>
              {expense.name} - ${expense.amount} ({expense.period})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

describe('Add Expense Integration Tests', () => {
  let queryClient: QueryClient;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(circuitBreakers.createExpense.execute).mockImplementation(async (fn) => fn());
    vi.mocked(circuitBreakers.cacheUpdate.executeSync).mockImplementation((fn) => fn());
    vi.mocked(retryWithBackoff).mockImplementation(async (fn) => fn());

    // Setup cache utils mocks
    const mockExpenses: ExpenseItem[] = [];
    vi.mocked(expenseCacheUtils.getCurrentExpenses).mockReturnValue(mockExpenses);
    vi.mocked(expenseCacheUtils.addExpense).mockImplementation((client, userId, expense) => {
      mockExpenses.push(expense);
    });
    vi.mocked(expenseCacheUtils.removeExpense).mockImplementation((client, userId, id) => {
      const index = mockExpenses.findIndex(e => e.id === id);
      if (index > -1) mockExpenses.splice(index, 1);
    });
    vi.mocked(expenseCacheUtils.replaceAllExpenses).mockImplementation((client, userId, expenses) => {
      mockExpenses.length = 0;
      mockExpenses.push(...expenses);
    });

    vi.mocked(optimisticUpdateUtils.createOptimisticExpense).mockImplementation((data, userId) => ({
      id: -Math.floor(Math.random() * 1000),
      name: data.name,
      amount: data.amount,
      category: data.category,
      period: data.period,
      rank: data.rank,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    vi.mocked(optimisticUpdateUtils.replaceTempExpense).mockImplementation((client, userId, tempId, realExpense) => {
      const index = mockExpenses.findIndex(e => e.id === tempId);
      if (index > -1) {
        mockExpenses[index] = realExpense;
      } else {
        mockExpenses.push(realExpense);
      }
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Successful Add Expense Workflow', () => {
    it('should complete full add expense workflow successfully', async () => {
      // Mock successful API response
      const successResponse = {
        success: true,
        data: {
          id: 123,
          name: 'Test Expense',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 1,
        },
      };

      mockApiPost.mockResolvedValue({
        json: () => Promise.resolve(successResponse),
      });

      vi.mocked(retryWithBackoff).mockResolvedValue(successResponse);

      const onSuccess = vi.fn();
      renderWithQueryClient(<AddExpenseForm userId={mockUserId} onSuccess={onSuccess} />);

      // Fill out the form
      fireEvent.change(screen.getByTestId('expense-name'), {
        target: { value: 'Test Expense' },
      });
      fireEvent.change(screen.getByTestId('expense-amount'), {
        target: { value: '100' },
      });
      fireEvent.change(screen.getByTestId('expense-category'), {
        target: { value: 'office' },
      });

      // Submit the form
      fireEvent.click(screen.getByTestId('submit-button'));

      // Verify loading state
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Adding...');
      expect(screen.getByTestId('mutation-status')).toHaveTextContent('Status: pending');

      // Wait for success
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });

      // Verify final state
      expect(screen.getByTestId('mutation-status')).toHaveTextContent('Status: success');
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Add Expense');
      expect(screen.getByTestId('submit-button')).not.toBeDisabled();

      // Verify API was called correctly
      expect(mockApiPost).toHaveBeenCalledWith({
        json: {
          name: 'Test Expense',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 1,
          userId: mockUserId,
        },
      });

      // Verify retry was used
      expect(retryWithBackoff).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          ...RetryConfigs.api,
          name: 'createFixedExpense',
        })
      );

      // Verify circuit breaker was used
      expect(circuitBreakers.createExpense.execute).toHaveBeenCalled();

      // Verify optimistic update flow
      expect(optimisticUpdateUtils.createOptimisticExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Expense',
          amount: 100,
          category: 'office',
          period: 'monthly',
          rank: 1,
        }),
        mockUserId
      );

      expect(expenseCacheUtils.addExpense).toHaveBeenCalled();
      expect(optimisticUpdateUtils.replaceTempExpense).toHaveBeenCalledWith(
        queryClient,
        mockUserId,
        expect.any(Number),
        expect.objectContaining({
          id: 123,
          name: 'Test Expense',
          amount: 100,
        })
      );

      // Verify success callback
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 123,
          name: 'Test Expense',
          amount: 100,
          userId: mockUserId,
        })
      );
    });

    it('should handle optimistic updates correctly during successful workflow', async () => {
      const successResponse = {
        success: true,
        data: {
          id: 456,
          name: 'Optimistic Test',
          amount: 200,
          category: 'rent',
          period: 'yearly',
          rank: 1,
        },
      };

      mockApiPost.mockResolvedValue({
        json: () => Promise.resolve(successResponse),
      });

      vi.mocked(retryWithBackoff).mockResolvedValue(successResponse);

      renderWithQueryClient(<AddExpenseForm userId={mockUserId} />);

      // Fill and submit form
      fireEvent.change(screen.getByTestId('expense-name'), {
        target: { value: 'Optimistic Test' },
      });
      fireEvent.change(screen.getByTestId('expense-amount'), {
        target: { value: '200' },
      });
      fireEvent.change(screen.getByTestId('expense-category'), {
        target: { value: 'rent' },
      });
      fireEvent.change(screen.getByTestId('expense-period'), {
        target: { value: 'yearly' },
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });

      // Verify optimistic update was created and then replaced
      expect(optimisticUpdateUtils.createOptimisticExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Optimistic Test',
          amount: 200,
          category: 'rent',
          period: 'yearly',
        }),
        mockUserId
      );

      expect(optimisticUpdateUtils.replaceTempExpense).toHaveBeenCalledWith(
        queryClient,
        mockUserId,
        expect.any(Number), // temp ID
        expect.objectContaining({
          id: 456,
          name: 'Optimistic Test',
          amount: 200,
        })
      );
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle network errors with proper rollback', async () => {
      const networkError = new Error('Network error');
      mockApiPost.mockRejectedValue(networkError);
      vi.mocked(retryWithBackoff).mockRejectedValue(networkError);

      renderWithQueryClient(<AddExpenseForm userId={mockUserId} />);

      // Fill and submit form
      fireEvent.change(screen.getByTestId('expense-name'), {
        target: { value: 'Failed Expense' },
      });
      fireEvent.change(screen.getByTestId('expense-amount'), {
        target: { value: '300' },
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Verify error is displayed
      expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
      expect(screen.getByTestId('mutation-status')).toHaveTextContent('Status: error');

      // Verify optimistic update was attempted and then rolled back
      expect(optimisticUpdateUtils.createOptimisticExpense).toHaveBeenCalled();
      expect(expenseCacheUtils.addExpense).toHaveBeenCalled();
      expect(expenseCacheUtils.removeExpense).toHaveBeenCalled();
      expect(expenseCacheUtils.replaceAllExpenses).toHaveBeenCalled();

      // Verify retry was attempted
      expect(retryWithBackoff).toHaveBeenCalled();
    });

    it('should handle validation errors without retry', async () => {
      const validationError = new Error('400: Validation failed');
      mockApiPost.mockRejectedValue(validationError);
      vi.mocked(retryWithBackoff).mockRejectedValue(validationError);

      renderWithQueryClient(<AddExpenseForm userId={mockUserId} />);

      // Submit form with invalid data
      fireEvent.change(screen.getByTestId('expense-name'), {
        target: { value: '' }, // Empty name
      });
      fireEvent.change(screen.getByTestId('expense-amount'), {
        target: { value: '-100' }, // Negative amount
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('400: Validation failed');
      expect(screen.getByTestId('mutation-status')).toHaveTextContent('Status: error');

      // Verify rollback occurred
      expect(expenseCacheUtils.removeExpense).toHaveBeenCalled();
    });

    it('should handle circuit breaker open state', async () => {
      const circuitBreakerError = new Error('Circuit breaker is OPEN for createExpense');
      vi.mocked(circuitBreakers.createExpense.execute).mockRejectedValue(circuitBreakerError);

      renderWithQueryClient(<AddExpenseForm userId={mockUserId} />);

      fireEvent.change(screen.getByTestId('expense-name'), {
        target: { value: 'Circuit Breaker Test' },
      });
      fireEvent.change(screen.getByTestId('expense-amount'), {
        target: { value: '100' },
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Circuit breaker is OPEN');
      expect(mockApiPost).not.toHaveBeenCalled(); // Should not reach API
    });

    it('should handle cache update failures gracefully', async () => {
      const successResponse = {
        success: true,
        data: {
          id: 789,
          name: 'Cache Error Test',
          amount: 150,
          category: 'utilities',
          period: 'monthly',
          rank: 1,
        },
      };

      mockApiPost.mockResolvedValue({
        json: () => Promise.resolve(successResponse),
      });
      vi.mocked(retryWithBackoff).mockResolvedValue(successResponse);

      // Mock cache update to fail
      const cacheError = new Error('Cache update failed');
      vi.mocked(circuitBreakers.cacheUpdate.executeSync).mockImplementation(() => {
        throw cacheError;
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderWithQueryClient(<AddExpenseForm userId={mockUserId} />);

      fireEvent.change(screen.getByTestId('expense-name'), {
        target: { value: 'Cache Error Test' },
      });
      fireEvent.change(screen.getByTestId('expense-amount'), {
        target: { value: '150' },
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });

      // Should still succeed but fall back to invalidation
      expect(screen.getByTestId('mutation-status')).toHaveTextContent('Status: success');
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent add operations', async () => {
      const responses = [
        {
          success: true,
          data: { id: 100, name: 'First', amount: 100, category: 'office', period: 'monthly', rank: 1 },
        },
        {
          success: true,
          data: { id: 200, name: 'Second', amount: 200, category: 'rent', period: 'yearly', rank: 2 },
        },
      ];

      mockApiPost
        .mockResolvedValueOnce({ json: () => Promise.resolve(responses[0]) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(responses[1]) });

      vi.mocked(retryWithBackoff)
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1]);

      const onSuccess1 = vi.fn();
      const onSuccess2 = vi.fn();

      const { rerender } = renderWithQueryClient(
        <div>
          <AddExpenseForm userId={mockUserId} onSuccess={onSuccess1} />
          <AddExpenseForm userId={mockUserId} onSuccess={onSuccess2} />
        </div>
      );

      const forms = screen.getAllByTestId('add-expense-form');
      const nameInputs = screen.getAllByTestId('expense-name');
      const amountInputs = screen.getAllByTestId('expense-amount');
      const submitButtons = screen.getAllByTestId('submit-button');

      // Fill out both forms
      fireEvent.change(nameInputs[0], { target: { value: 'First' } });
      fireEvent.change(amountInputs[0], { target: { value: '100' } });
      fireEvent.change(nameInputs[1], { target: { value: 'Second' } });
      fireEvent.change(amountInputs[1], { target: { value: '200' } });

      // Submit both forms concurrently
      fireEvent.click(submitButtons[0]);
      fireEvent.click(submitButtons[1]);

      // Wait for both to complete
      await waitFor(() => {
        const successMessages = screen.getAllByTestId('success-message');
        expect(successMessages).toHaveLength(2);
      });

      // Verify both succeeded
      expect(onSuccess1).toHaveBeenCalledWith(
        expect.objectContaining({ id: 100, name: 'First' })
      );
      expect(onSuccess2).toHaveBeenCalledWith(
        expect.objectContaining({ id: 200, name: 'Second' })
      );

      // Verify both API calls were made
      expect(mockApiPost).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success/failure in concurrent operations', async () => {
      const successResponse = {
        success: true,
        data: { id: 300, name: 'Success', amount: 100, category: 'office', period: 'monthly', rank: 1 },
      };
      const errorResponse = new Error('Second operation failed');

      mockApiPost
        .mockResolvedValueOnce({ json: () => Promise.resolve(successResponse) })
        .mockRejectedValueOnce(errorResponse);

      vi.mocked(retryWithBackoff)
        .mockResolvedValueOnce(successResponse)
        .mockRejectedValueOnce(errorResponse);

      renderWithQueryClient(
        <div>
          <AddExpenseForm userId={mockUserId} />
          <AddExpenseForm userId={mockUserId} />
        </div>
      );

      const nameInputs = screen.getAllByTestId('expense-name');
      const amountInputs = screen.getAllByTestId('expense-amount');
      const submitButtons = screen.getAllByTestId('submit-button');

      // Fill and submit both forms
      fireEvent.change(nameInputs[0], { target: { value: 'Success' } });
      fireEvent.change(amountInputs[0], { target: { value: '100' } });
      fireEvent.change(nameInputs[1], { target: { value: 'Failure' } });
      fireEvent.change(amountInputs[1], { target: { value: '200' } });

      fireEvent.click(submitButtons[0]);
      fireEvent.click(submitButtons[1]);

      // Wait for both to complete
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Verify mixed results
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Second operation failed');

      // Verify cache operations for both scenarios
      expect(optimisticUpdateUtils.replaceTempExpense).toHaveBeenCalledWith(
        queryClient,
        mockUserId,
        expect.any(Number),
        expect.objectContaining({ id: 300 })
      );
      expect(expenseCacheUtils.removeExpense).toHaveBeenCalled(); // For failed operation rollback
    });
  });

  describe('Form Validation and User Experience', () => {
    it('should prevent submission with empty required fields', async () => {
      renderWithQueryClient(<AddExpenseForm userId={mockUserId} />);

      // Try to submit empty form
      fireEvent.click(screen.getByTestId('submit-button'));

      // Form should not submit (browser validation)
      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('should handle form reset after successful submission', async () => {
      const successResponse = {
        success: true,
        data: {
          id: 999,
          name: 'Reset Test',
          amount: 50,
          category: 'office',
          period: 'monthly',
          rank: 1,
        },
      };

      mockApiPost.mockResolvedValue({
        json: () => Promise.resolve(successResponse),
      });
      vi.mocked(retryWithBackoff).mockResolvedValue(successResponse);

      renderWithQueryClient(<AddExpenseForm userId={mockUserId} />);

      // Fill and submit form
      fireEvent.change(screen.getByTestId('expense-name'), {
        target: { value: 'Reset Test' },
      });
      fireEvent.change(screen.getByTestId('expense-amount'), {
        target: { value: '50' },
      });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });

      // Form should be ready for next submission
      expect(screen.getByTestId('submit-button')).not.toBeDisabled();
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Add Expense');
    });
  });
});