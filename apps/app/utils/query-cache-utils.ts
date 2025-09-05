import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import type { QueryClient } from "@tanstack/react-query";
import type { ExpenseItem } from "../app/types";

/**
 * Type-safe cache update utilities for React Query
 * These functions provide precise cache management for expense operations
 * to prevent stack overflow issues caused by broad cache invalidations
 */

/**
 * Cache operation logger for debugging and monitoring
 */
interface CacheOperationLog {
  operation: string;
  userId: string;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

class CacheLogger {
  private logs: CacheOperationLog[] = [];
  private readonly MAX_LOGS = 1000;
  private isEnabled = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  log(
    operation: string,
    userId: string,
    startTime: number,
    success: boolean,
    error?: Error,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const logEntry: CacheOperationLog = {
      operation,
      userId,
      timestamp: startTime,
      duration: performance.now() - startTime,
      success,
      error: error?.message,
      metadata,
    };

    this.logs.push(logEntry);

    // Keep only recent logs to prevent memory leaks
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Log to console in development
    const icon = success ? '✅' : '❌';
    const durationStr = `${logEntry.duration.toFixed(2)}ms`;

    if (success) {
      console.log(`${icon} Cache ${operation} for user ${userId} (${durationStr})`, metadata);
    } else {
      console.error(`${icon} Cache ${operation} failed for user ${userId} (${durationStr}):`, error?.message, metadata);
    }
  }

  getLogs(limit = 50): CacheOperationLog[] {
    return this.logs.slice(-limit);
  }

  getLogsByUser(userId: string, limit = 20): CacheOperationLog[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit);
  }

  getFailedOperations(limit = 10): CacheOperationLog[] {
    return this.logs
      .filter(log => !log.success)
      .slice(-limit);
  }

  getSlowOperations(thresholdMs = 10, limit = 10): CacheOperationLog[] {
    return this.logs
      .filter(log => log.duration > thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  clearLogs(): void {
    this.logs = [];
  }

  logSummary(): void {
    if (!this.isEnabled || this.logs.length === 0) return;

    const recentLogs = this.getLogs(100);
    const successCount = recentLogs.filter(log => log.success).length;
    const failureCount = recentLogs.length - successCount;
    const avgDuration = recentLogs.reduce((sum, log) => sum + log.duration, 0) / recentLogs.length;

    console.group('🔍 Cache Operations Summary (last 100 operations)');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`⏱️ Average duration: ${avgDuration.toFixed(2)}ms`);

    const slowOps = this.getSlowOperations(5, 5);
    if (slowOps.length > 0) {
      console.group('🐌 Slowest operations:');
      slowOps.forEach(log => {
        console.log(`${log.operation} (${log.duration.toFixed(2)}ms) - User: ${log.userId}`);
      });
      console.groupEnd();
    }

    const failedOps = this.getFailedOperations(5);
    if (failedOps.length > 0) {
      console.group('❌ Recent failures:');
      failedOps.forEach(log => {
        console.log(`${log.operation} - ${log.error} - User: ${log.userId}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }
}

const cacheLogger = new CacheLogger();

// Auto-log summary every 60 seconds in development (but not in tests)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && process.env.VITEST !== 'true') {
  setInterval(() => {
    cacheLogger.logSummary();
  }, 60000);
}

export interface CacheUpdateError extends Error {
  operation: string;
  userId: string;
  expenseId?: number;
  originalError?: Error;
}

/**
 * Creates a standardized error for cache operations
 */
const createCacheError = (
  operation: string,
  userId: string,
  originalError?: Error,
  expenseId?: number
): CacheUpdateError => {
  const error = new Error(
    `Cache ${operation} failed for user ${userId}${expenseId ? ` and expense ${expenseId}` : ""}`
  ) as CacheUpdateError;

  error.operation = operation;
  error.userId = userId;
  error.expenseId = expenseId;
  error.originalError = originalError;

  return error;
};

/**
 * Safely gets current expenses from cache with error handling
 */
const getCurrentExpenses = (
  queryClient: QueryClient,
  userId: string
): ExpenseItem[] => {
  try {
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);
    const currentData = queryClient.getQueryData<ExpenseItem[]>(queryKey);
    return currentData || [];
  } catch (error) {
    console.warn(`Failed to get current expenses for user ${userId}:`, error);
    return [];
  }
};

/**
 * Safely updates the cache with new data and error handling
 */
const updateCacheData = (
  queryClient: QueryClient,
  userId: string,
  updater: (current: ExpenseItem[]) => ExpenseItem[],
  operation: string,
  metadata?: Record<string, any>
): void => {
  const startTime = performance.now();

  try {
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);
    const beforeCount = getCurrentExpenses(queryClient, userId).length;

    queryClient.setQueryData<ExpenseItem[]>(queryKey, (current) => {
      const currentExpenses = current || [];
      return updater(currentExpenses);
    });

    const afterCount = getCurrentExpenses(queryClient, userId).length;

    cacheLogger.log(operation, userId, startTime, true, undefined, {
      ...metadata,
      beforeCount,
      afterCount,
      queryKey: queryKey.join(':'),
    });
  } catch (error) {
    cacheLogger.log(operation, userId, startTime, false, error as Error, metadata);
    throw createCacheError(operation, userId, error as Error);
  }
};

/**
 * Cache update utilities for expense operations
 */
export const expenseCacheUtils = {
  /**
   * Adds a new expense to the cache
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param newExpense - New expense to add
   * @throws CacheUpdateError if the operation fails
   */
  addExpense: (
    queryClient: QueryClient,
    userId: string,
    newExpense: ExpenseItem
  ): void => {
    updateCacheData(
      queryClient,
      userId,
      (current) => {
        // Check if expense already exists to prevent duplicates
        const existingIndex = current.findIndex(expense => expense.id === newExpense.id);
        if (existingIndex !== -1) {
          // Replace existing expense (useful for optimistic updates that get real IDs)
          const updated = [...current];
          updated[existingIndex] = newExpense;
          return updated.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
        }

        // Add new expense and sort by rank
        return [...current, newExpense].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
      },
      "add",
      {
        expenseId: newExpense.id,
        expenseName: newExpense.name,
        amount: newExpense.amount,
        category: newExpense.category,
      }
    );
  },

  /**
   * Updates an existing expense in the cache
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param updatedExpense - Updated expense data
   * @throws CacheUpdateError if the operation fails or expense not found
   */
  updateExpense: (
    queryClient: QueryClient,
    userId: string,
    updatedExpense: ExpenseItem
  ): void => {
    updateCacheData(
      queryClient,
      userId,
      (current) => {
        const expenseIndex = current.findIndex(expense => expense.id === updatedExpense.id);

        if (expenseIndex === -1) {
          throw createCacheError("update", userId, new Error("Expense not found"), updatedExpense.id);
        }

        const updated = [...current];
        updated[expenseIndex] = updatedExpense;
        return updated.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
      },
      "update"
    );
  },

  /**
   * Removes an expense from the cache
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param expenseId - ID of expense to remove
   * @throws CacheUpdateError if the operation fails
   */
  removeExpense: (
    queryClient: QueryClient,
    userId: string,
    expenseId: number
  ): void => {
    updateCacheData(
      queryClient,
      userId,
      (current) => current.filter(expense => expense.id !== expenseId),
      "remove",
      { expenseId }
    );
  },

  /**
   * Removes multiple expenses from the cache
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param expenseIds - Array of expense IDs to remove
   * @throws CacheUpdateError if the operation fails
   */
  removeMultipleExpenses: (
    queryClient: QueryClient,
    userId: string,
    expenseIds: number[]
  ): void => {
    updateCacheData(
      queryClient,
      userId,
      (current) => current.filter(expense => !expenseIds.includes(expense.id)),
      "remove-multiple"
    );
  },

  /**
   * Reorders expenses in the cache (useful for drag-and-drop)
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param reorderedExpenses - Array of expenses in new order with updated ranks
   * @throws CacheUpdateError if the operation fails
   */
  reorderExpenses: (
    queryClient: QueryClient,
    userId: string,
    reorderedExpenses: ExpenseItem[]
  ): void => {
    updateCacheData(
      queryClient,
      userId,
      () => reorderedExpenses.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
      "reorder"
    );
  },

  /**
   * Updates multiple expenses at once (batch operation)
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param updatedExpenses - Array of updated expenses
   * @throws CacheUpdateError if the operation fails
   */
  updateMultipleExpenses: (
    queryClient: QueryClient,
    userId: string,
    updatedExpenses: ExpenseItem[]
  ): void => {
    updateCacheData(
      queryClient,
      userId,
      (current) => {
        const updatedMap = new Map(updatedExpenses.map(expense => [expense.id, expense]));

        return current
          .map(expense => updatedMap.get(expense.id) || expense)
          .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
      },
      "update-multiple"
    );
  },

  /**
   * Replaces the entire expenses list in cache (use with caution)
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param newExpenses - Complete new expenses array
   * @throws CacheUpdateError if the operation fails
   */
  replaceAllExpenses: (
    queryClient: QueryClient,
    userId: string,
    newExpenses: ExpenseItem[]
  ): void => {
    updateCacheData(
      queryClient,
      userId,
      () => newExpenses.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
      "replace-all"
    );
  },

  /**
   * Gets current expenses from cache (read-only operation)
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @returns Current expenses array or empty array if not found
   */
  getCurrentExpenses: (
    queryClient: QueryClient,
    userId: string
  ): ExpenseItem[] => {
    return getCurrentExpenses(queryClient, userId);
  },

  /**
   * Checks if an expense exists in the cache
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param expenseId - ID of expense to check
   * @returns True if expense exists, false otherwise
   */
  expenseExists: (
    queryClient: QueryClient,
    userId: string,
    expenseId: number
  ): boolean => {
    const current = getCurrentExpenses(queryClient, userId);
    return current.some(expense => expense.id === expenseId);
  },

  /**
   * Gets a specific expense from cache
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param expenseId - ID of expense to get
   * @returns Expense if found, undefined otherwise
   */
  getExpense: (
    queryClient: QueryClient,
    userId: string,
    expenseId: number
  ): ExpenseItem | undefined => {
    const current = getCurrentExpenses(queryClient, userId);
    return current.find(expense => expense.id === expenseId);
  },
};

/**
 * Optimistic update utilities for mutations
 * These help with creating temporary IDs and handling rollbacks
 */
export const optimisticUpdateUtils = {
  /**
   * Creates a temporary ID for optimistic updates
   * @param prefix - Optional prefix for the temp ID
   * @returns Temporary ID string
   */
  createTempId: (prefix = "temp"): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Creates an optimistic expense for immediate UI updates
   * @param expenseData - Partial expense data
   * @param userId - User ID
   * @returns Complete expense item with temporary ID
   */
  createOptimisticExpense: (
    expenseData: Omit<ExpenseItem, "id" | "createdAt" | "updatedAt">,
    userId: string
  ): ExpenseItem => {
    const now = new Date().toISOString();
    return {
      ...expenseData,
      id: Number.parseInt(optimisticUpdateUtils.createTempId().replace(/\D/g, "").slice(0, 10)) || Date.now(),
      userId,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Checks if an expense has a temporary ID
   * @param expense - Expense to check
   * @returns True if expense has temporary ID
   */
  isTempExpense: (expense: ExpenseItem): boolean => {
    return expense.id.toString().includes("temp") || expense.id < 0;
  },

  /**
   * Replaces temporary expense with real expense data
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param tempId - Temporary ID to replace
   * @param realExpense - Real expense data from server
   */
  replaceTempExpense: (
    queryClient: QueryClient,
    userId: string,
    tempId: number,
    realExpense: ExpenseItem
  ): void => {
    updateCacheData(
      queryClient,
      userId,
      (current) => {
        const tempIndex = current.findIndex(expense => expense.id === tempId);
        if (tempIndex === -1) return current;

        const updated = [...current];
        updated[tempIndex] = realExpense;
        return updated.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
      },
      "replace-temp"
    );
  },
};

/**
 * Cache validation utilities
 * These help ensure cache consistency and detect issues
 */
export const cacheValidationUtils = {
  /**
   * Validates that expenses in cache are properly sorted
   * @param expenses - Expenses array to validate
   * @returns True if properly sorted by rank
   */
  isProperlysorted: (expenses: ExpenseItem[]): boolean => {
    for (let i = 1; i < expenses.length; i++) {
      if ((expenses[i - 1].rank ?? 0) > (expenses[i].rank ?? 0)) {
        return false;
      }
    }
    return true;
  },

  /**
   * Validates that all expenses have required fields
   * @param expenses - Expenses array to validate
   * @returns Array of validation errors, empty if valid
   */
  validateExpenses: (expenses: ExpenseItem[]): string[] => {
    const errors: string[] = [];

    expenses.forEach((expense, index) => {
      if (!expense.id) errors.push(`Expense at index ${index} missing ID`);
      if (!expense.name) errors.push(`Expense at index ${index} missing name`);
      if (!expense.userId) errors.push(`Expense at index ${index} missing userId`);
      if (expense.amount === undefined || expense.amount === null) {
        errors.push(`Expense at index ${index} missing amount`);
      }
      if (!expense.period) errors.push(`Expense at index ${index} missing period`);
      if (!expense.category) errors.push(`Expense at index ${index} missing category`);
    });

    return errors;
  },

  /**
   * Checks for duplicate expenses in cache
   * @param expenses - Expenses array to check
   * @returns Array of duplicate IDs
   */
  findDuplicates: (expenses: ExpenseItem[]): number[] => {
    const seen = new Set<number>();
    const duplicates = new Set<number>();

    expenses.forEach(expense => {
      if (seen.has(expense.id)) {
        duplicates.add(expense.id);
      } else {
        seen.add(expense.id);
      }
    });

    return Array.from(duplicates);
  },
};

// Export all utilities as a single object for convenience
export const queryCacheUtils = {
  expenses: expenseCacheUtils,
  optimistic: optimisticUpdateUtils,
  validation: cacheValidationUtils,
  logger: cacheLogger,
};

// Export cache logger for direct access
export { cacheLogger };

// Default export for backward compatibility
export default queryCacheUtils;