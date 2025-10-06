/**
 * Example usage of query-cache-utils.ts
 *
 * This file demonstrates how to use the cache utilities in React Query mutations
 * to prevent stack overflow issues and improve performance.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExpenseItem } from "../app/types";
import { expenseCacheUtils, optimisticUpdateUtils } from "./query-cache-utils";

/**
 * Example: Create expense mutation with precise cache updates
 * This replaces the pattern of using invalidateQueries which can cause stack overflow
 */
export const useCreateExpenseWithCacheUtils = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newExpense: Omit<ExpenseItem, "id" | "createdAt" | "updatedAt">) => {
      // Simulate API call
      const response = await fetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify(newExpense),
      });
      return response.json();
    },

    onMutate: async (newExpense) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({
        queryKey: ["fixed-expenses-list", newExpense.userId],
      });

      // Snapshot the previous value for rollback
      const previousExpenses = expenseCacheUtils.getCurrentExpenses(
        queryClient,
        newExpense.userId
      );

      // Create optimistic expense with temporary ID
      const optimisticExpense = optimisticUpdateUtils.createOptimisticExpense(
        newExpense,
        newExpense.userId
      );

      // Optimistically update the cache using our utility
      try {
        expenseCacheUtils.addExpense(queryClient, newExpense.userId, optimisticExpense);
      } catch (error) {
        console.error("Failed to add optimistic expense:", error);
        // Continue with mutation even if optimistic update fails
      }

      return { previousExpenses, optimisticExpense };
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousExpenses) {
        try {
          expenseCacheUtils.replaceAllExpenses(
            queryClient,
            variables.userId,
            context.previousExpenses
          );
        } catch (rollbackError) {
          console.error("Failed to rollback optimistic update:", rollbackError);
        }
      }
    },

    onSuccess: (data, variables, context) => {
      // Replace optimistic expense with real data from server
      if (context?.optimisticExpense && data.expense) {
        try {
          // Remove the optimistic expense and add the real one
          expenseCacheUtils.removeExpense(
            queryClient,
            variables.userId,
            context.optimisticExpense.id
          );
          expenseCacheUtils.addExpense(queryClient, variables.userId, data.expense);
        } catch (error) {
          console.error("Failed to update cache with real expense:", error);
          // Fallback to invalidation if cache update fails
          queryClient.invalidateQueries({
            queryKey: ["fixed-expenses-list", variables.userId],
          });
        }
      }
    },

    // Note: No onSettled with invalidateQueries - this prevents the stack overflow!
  });
};

/**
 * Example: Update expense mutation with precise cache updates
 */
export const useUpdateExpenseWithCacheUtils = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedExpense: ExpenseItem) => {
      const response = await fetch(`/api/expenses/${updatedExpense.id}`, {
        method: "PUT",
        body: JSON.stringify(updatedExpense),
      });
      return response.json();
    },

    onMutate: async (updatedExpense) => {
      await queryClient.cancelQueries({
        queryKey: ["fixed-expenses-list", updatedExpense.userId],
      });

      // Get the current expense for rollback
      const previousExpense = expenseCacheUtils.getExpense(
        queryClient,
        updatedExpense.userId,
        updatedExpense.id
      );

      // Optimistically update the cache
      if (previousExpense) {
        try {
          expenseCacheUtils.updateExpense(queryClient, updatedExpense.userId, updatedExpense);
        } catch (error) {
          console.error("Failed to update expense optimistically:", error);
        }
      }

      return { previousExpense };
    },

    onError: (error, variables, context) => {
      // Rollback to previous expense on error
      if (context?.previousExpense) {
        try {
          expenseCacheUtils.updateExpense(
            queryClient,
            variables.userId,
            context.previousExpense
          );
        } catch (rollbackError) {
          console.error("Failed to rollback expense update:", rollbackError);
        }
      }
    },

    onSuccess: (data, variables) => {
      // Update cache with server response if different from optimistic update
      if (data.expense) {
        try {
          expenseCacheUtils.updateExpense(queryClient, variables.userId, data.expense);
        } catch (error) {
          console.error("Failed to update cache with server response:", error);
        }
      }
    },
  });
};

/**
 * Example: Delete expense mutation with precise cache updates
 */
export const useDeleteExpenseWithCacheUtils = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, expenseId }: { userId: string; expenseId: number }) => {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });
      return response.json();
    },

    onMutate: async ({ userId, expenseId }) => {
      await queryClient.cancelQueries({
        queryKey: ["fixed-expenses-list", userId],
      });

      // Get the expense being deleted for rollback
      const deletedExpense = expenseCacheUtils.getExpense(queryClient, userId, expenseId);

      // Optimistically remove from cache
      if (deletedExpense) {
        try {
          expenseCacheUtils.removeExpense(queryClient, userId, expenseId);
        } catch (error) {
          console.error("Failed to remove expense optimistically:", error);
        }
      }

      return { deletedExpense };
    },

    onError: (error, variables, context) => {
      // Restore deleted expense on error
      if (context?.deletedExpense) {
        try {
          expenseCacheUtils.addExpense(queryClient, variables.userId, context.deletedExpense);
        } catch (rollbackError) {
          console.error("Failed to restore deleted expense:", rollbackError);
        }
      }
    },

    // No onSuccess needed - optimistic update is sufficient for delete
  });
};

/**
 * Example: Batch reorder mutation for drag-and-drop
 */
export const useReorderExpensesWithCacheUtils = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      reorderedExpenses,
    }: {
      userId: string;
      reorderedExpenses: ExpenseItem[];
    }) => {
      const response = await fetch("/api/expenses/reorder", {
        method: "PUT",
        body: JSON.stringify({ expenses: reorderedExpenses }),
      });
      return response.json();
    },

    onMutate: async ({ userId, reorderedExpenses }) => {
      await queryClient.cancelQueries({
        queryKey: ["fixed-expenses-list", userId],
      });

      // Get current order for rollback
      const previousExpenses = expenseCacheUtils.getCurrentExpenses(queryClient, userId);

      // Optimistically update the order
      try {
        expenseCacheUtils.reorderExpenses(queryClient, userId, reorderedExpenses);
      } catch (error) {
        console.error("Failed to reorder expenses optimistically:", error);
      }

      return { previousExpenses };
    },

    onError: (error, variables, context) => {
      // Restore previous order on error
      if (context?.previousExpenses) {
        try {
          expenseCacheUtils.replaceAllExpenses(
            queryClient,
            variables.userId,
            context.previousExpenses
          );
        } catch (rollbackError) {
          console.error("Failed to restore expense order:", rollbackError);
        }
      }
    },

    onSuccess: (data, variables) => {
      // Update with server response if needed
      if (data.expenses) {
        try {
          expenseCacheUtils.replaceAllExpenses(queryClient, variables.userId, data.expenses);
        } catch (error) {
          console.error("Failed to update cache with server order:", error);
        }
      }
    },
  });
};

/**
 * Example: How to use validation utilities
 */
export const validateExpenseCache = (userId: string, queryClient: QueryClient) => {
  const expenses = expenseCacheUtils.getCurrentExpenses(queryClient, userId);

  // Check if expenses are properly sorted
  const isSorted = expenseCacheUtils.validation.isProperlysorted(expenses);
  if (!isSorted) {
    console.warn("Expenses are not properly sorted by rank");
  }

  // Validate expense data integrity
  const validationErrors = expenseCacheUtils.validation.validateExpenses(expenses);
  if (validationErrors.length > 0) {
    console.error("Expense validation errors:", validationErrors);
  }

  // Check for duplicates
  const duplicates = expenseCacheUtils.validation.findDuplicates(expenses);
  if (duplicates.length > 0) {
    console.error("Duplicate expenses found:", duplicates);
  }

  return {
    isSorted,
    validationErrors,
    duplicates,
    isValid: isSorted && validationErrors.length === 0 && duplicates.length === 0,
  };
};

/**
 * Key Benefits of Using These Utilities:
 *
 * 1. **Prevents Stack Overflow**: No more broad invalidateQueries calls that cause infinite loops
 * 2. **Better Performance**: Precise cache updates instead of full refetches
 * 3. **Type Safety**: Full TypeScript support with proper error handling
 * 4. **Consistent Sorting**: Automatic sorting by rank to maintain UI consistency
 * 5. **Robust Error Handling**: Proper rollback mechanisms for failed operations
 * 6. **Validation**: Built-in validation to catch cache inconsistencies
 * 7. **Optimistic Updates**: Smooth UX with proper optimistic update patterns
 */