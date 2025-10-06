import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { ExpenseItem, EquipmentExpenseItem } from "../app/types";

/**
 * Type-safe cache update utilities for React Query
 * These functions provide precise cache management for expense operations
 * to prevent stack overflow issues caused by broad cache invalidations
 */

/**
 * Generic cache operation types
 */
export type CacheOperation =
  | "add"
  | "update"
  | "remove"
  | "reorder"
  | "replace-all"
  | "replace-temp"
  | "batch-update"
  | "remove-multiple";

/**
 * Context information for cache operations
 */
export interface CacheOperationContext<T = any> {
  operation: CacheOperation;
  userId: string;
  itemId?: number | string;
  previousData?: T;
  newData?: T;
  metadata?: Record<string, any>;
}

/**
 * Base interface for items that can be cached
 */
export interface BaseCacheItem {
  id: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for items that can be ranked/ordered
 */
export interface RankableItem extends BaseCacheItem {
  rank?: number;
}

/**
 * Configuration for creating generic cache utilities
 */
export interface CacheUtilsConfig<T extends BaseCacheItem> {
  queryKeyFactory: (userId: string) => QueryKey;
  sortComparator: (a: T, b: T) => number;
  validateItem: (item: T) => string[];
  createOptimisticItem: (data: Partial<T>, userId: string) => T;
  itemName?: string; // For logging purposes
}

/**
 * Generic cache utilities interface that can work with any data type
 */
export interface GenericCacheUtils<T extends BaseCacheItem> {
  addItem: (queryClient: QueryClient, userId: string, item: T) => void;
  updateItem: (queryClient: QueryClient, userId: string, item: T) => void;
  removeItem: (queryClient: QueryClient, userId: string, itemId: number) => void;
  removeMultipleItems: (queryClient: QueryClient, userId: string, itemIds: number[]) => void;
  reorderItems: (queryClient: QueryClient, userId: string, items: T[]) => void;
  updateMultipleItems: (queryClient: QueryClient, userId: string, items: T[]) => void;
  replaceAllItems: (queryClient: QueryClient, userId: string, items: T[]) => void;
  getCurrentItems: (queryClient: QueryClient, userId: string) => T[];
  itemExists: (queryClient: QueryClient, userId: string, itemId: number) => boolean;
  getItem: (queryClient: QueryClient, userId: string, itemId: number) => T | undefined;
  replaceTempItem: (queryClient: QueryClient, userId: string, tempId: number, realItem: T) => void;
}

/**
 * Billable cost item type (single object, not array)
 */
export interface BillableCostItem extends BaseCacheItem {
  workDays: number;
  hoursPerDay: number;
  holidaysDays: number;
  vacationsDays: number;
  sickLeaveDays: number;
  monthlySalary: number;
  taxes: number;
  fees: number;
  margin: number;
  billableHours: number;
}

/**
 * Generic cache utilities for single-object cache management
 */
export interface SingleObjectCacheUtils<T extends BaseCacheItem> {
  updateObject: (queryClient: QueryClient, userId: string, item: T) => void;
  getCurrentObject: (queryClient: QueryClient, userId: string) => T | null;
  replaceObject: (queryClient: QueryClient, userId: string, item: T) => void;
  objectExists: (queryClient: QueryClient, userId: string) => boolean;
}

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

    const duration = performance.now() - startTime;
    const logEntry: CacheOperationLog = {
      operation,
      userId,
      timestamp: startTime,
      duration,
      success,
      error: error?.message,
      metadata,
    };

    this.logs.push(logEntry);

    // Keep only recent logs to prevent memory leaks
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Track with enhanced performance monitor
    const feature = this.extractFeatureFromMetadata(metadata) || 'cache';
    if (typeof window !== 'undefined') {
      // Import performance monitor dynamically to avoid circular dependencies
      import('./performance-monitor').then(({ performanceMonitor }) => {
        performanceMonitor.trackCacheOperation(operation, feature, duration, success, metadata);
      }).catch(() => {
        // Fallback to console logging if performance monitor is not available
        this.logToConsole(operation, userId, duration, success, error, metadata);
      });
    } else {
      this.logToConsole(operation, userId, duration, success, error, metadata);
    }
  }

  private extractFeatureFromMetadata(metadata?: Record<string, any>): string | undefined {
    if (!metadata) return undefined;

    // Try to extract feature from various metadata fields
    if (metadata.itemType) {
      if (metadata.itemType.includes('equipment')) return 'equipment';
      if (metadata.itemType.includes('billable')) return 'billable';
      if (metadata.itemType.includes('expense')) return 'fixed-expense';
    }

    if (metadata.queryKey) {
      const keyStr = Array.isArray(metadata.queryKey) ? metadata.queryKey.join(':') : metadata.queryKey;
      if (keyStr.includes('equipment')) return 'equipment';
      if (keyStr.includes('billable')) return 'billable';
      if (keyStr.includes('expense')) return 'fixed-expense';
    }

    return undefined;
  }

  private logToConsole(
    operation: string,
    userId: string,
    duration: number,
    success: boolean,
    error?: Error,
    metadata?: Record<string, any>
  ): void {
    const icon = success ? '✅' : '❌';
    const durationStr = `${duration.toFixed(2)}ms`;

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

/**
 * Generic cache error type
 */
export interface GenericCacheError extends Error {
  operation: CacheOperation;
  userId: string;
  itemId?: number;
  originalError?: Error;
}

/**
 * Creates a standardized error for generic cache operations
 */
const createGenericCacheError = (
  operation: CacheOperation,
  userId: string,
  originalError?: Error,
  itemId?: number
): GenericCacheError => {
  const error = new Error(
    `Cache ${operation} failed for user ${userId}${itemId ? ` and item ${itemId}` : ""}`
  ) as GenericCacheError;

  error.operation = operation;
  error.userId = userId;
  error.itemId = itemId;
  error.originalError = originalError;

  return error;
};

/**
 * Generic function to safely get current items from cache
 */
const getGenericCurrentItems = <T extends BaseCacheItem>(
  queryClient: QueryClient,
  userId: string,
  queryKeyFactory: (userId: string) => QueryKey
): T[] => {
  try {
    const queryKey = queryKeyFactory(userId);
    const currentData = queryClient.getQueryData<T[]>(queryKey);
    return currentData || [];
  } catch (error) {
    console.warn(`Failed to get current items for user ${userId}:`, error);
    return [];
  }
};

/**
 * Generic function to safely get current single object from cache
 */
const getGenericCurrentObject = <T extends BaseCacheItem>(
  queryClient: QueryClient,
  userId: string,
  queryKeyFactory: (userId: string) => QueryKey
): T | null => {
  try {
    const queryKey = queryKeyFactory(userId);
    const currentData = queryClient.getQueryData<T>(queryKey);
    return currentData || null;
  } catch (error) {
    console.warn(`Failed to get current object for user ${userId}:`, error);
    return null;
  }
};

/**
 * Generic function to safely update cache data for arrays
 */
const updateGenericCacheData = <T extends BaseCacheItem>(
  queryClient: QueryClient,
  userId: string,
  updater: (current: T[]) => T[],
  operation: CacheOperation,
  config: CacheUtilsConfig<T>,
  metadata?: Record<string, any>
): void => {
  const startTime = performance.now();

  try {
    const queryKey = config.queryKeyFactory(userId);
    const beforeCount = getGenericCurrentItems<T>(queryClient, userId, config.queryKeyFactory).length;

    queryClient.setQueryData<T[]>(queryKey, (current) => {
      const currentItems = current || [];
      const updatedItems = updater(currentItems);

      // Validate updated items
      const validationErrors = updatedItems.flatMap(item => config.validateItem(item));
      if (validationErrors.length > 0) {
        console.warn(`Validation errors for ${config.itemName || 'items'}:`, validationErrors);
      }

      return updatedItems.sort(config.sortComparator);
    });

    const afterCount = getGenericCurrentItems<T>(queryClient, userId, config.queryKeyFactory).length;

    cacheLogger.log(operation, userId, startTime, true, undefined, {
      ...metadata,
      beforeCount,
      afterCount,
      itemType: config.itemName || 'item',
      queryKey: queryKey.join(':'),
    });
  } catch (error) {
    cacheLogger.log(operation, userId, startTime, false, error as Error, {
      ...metadata,
      itemType: config.itemName || 'item',
    });
    throw createGenericCacheError(operation, userId, error as Error);
  }
};

/**
 * Generic function to safely update cache data for single objects
 */
const updateGenericObjectCacheData = <T extends BaseCacheItem>(
  queryClient: QueryClient,
  userId: string,
  updater: (current: T | null) => T,
  operation: CacheOperation,
  config: CacheUtilsConfig<T>,
  metadata?: Record<string, any>
): void => {
  const startTime = performance.now();

  try {
    const queryKey = config.queryKeyFactory(userId);

    queryClient.setQueryData<T>(queryKey, (current) => {
      const updatedItem = updater(current || null);

      // Validate updated item
      const validationErrors = config.validateItem(updatedItem);
      if (validationErrors.length > 0) {
        console.warn(`Validation errors for ${config.itemName || 'item'}:`, validationErrors);
      }

      return updatedItem;
    });

    cacheLogger.log(operation, userId, startTime, true, undefined, {
      ...metadata,
      itemType: config.itemName || 'item',
      queryKey: queryKey.join(':'),
    });
  } catch (error) {
    cacheLogger.log(operation, userId, startTime, false, error as Error, {
      ...metadata,
      itemType: config.itemName || 'item',
    });
    throw createGenericCacheError(operation, userId, error as Error);
  }
};

/**
 * Factory function to create generic cache utilities for array-based data
 */
export function createGenericCacheUtils<T extends BaseCacheItem>(
  config: CacheUtilsConfig<T>
): GenericCacheUtils<T> {
  return {
    addItem: (queryClient: QueryClient, userId: string, newItem: T): void => {
      updateGenericCacheData(
        queryClient,
        userId,
        (current) => {
          // Check if item already exists to prevent duplicates
          const existingIndex = current.findIndex(item => item.id === newItem.id);
          if (existingIndex !== -1) {
            // Replace existing item (useful for optimistic updates that get real IDs)
            const updated = [...current];
            updated[existingIndex] = newItem;
            return updated;
          }

          // Add new item
          return [...current, newItem];
        },
        "add",
        config,
        {
          itemId: newItem.id,
          itemName: (newItem as any).name || `${config.itemName || 'item'}-${newItem.id}`,
        }
      );
    },

    updateItem: (queryClient: QueryClient, userId: string, updatedItem: T): void => {
      updateGenericCacheData(
        queryClient,
        userId,
        (current) => {
          const itemIndex = current.findIndex(item => item.id === updatedItem.id);

          if (itemIndex === -1) {
            throw createGenericCacheError("update", userId, new Error("Item not found"), updatedItem.id);
          }

          const updated = [...current];
          updated[itemIndex] = updatedItem;
          return updated;
        },
        "update",
        config,
        { itemId: updatedItem.id }
      );
    },

    removeItem: (queryClient: QueryClient, userId: string, itemId: number): void => {
      updateGenericCacheData(
        queryClient,
        userId,
        (current) => current.filter(item => item.id !== itemId),
        "remove",
        config,
        { itemId }
      );
    },

    removeMultipleItems: (queryClient: QueryClient, userId: string, itemIds: number[]): void => {
      updateGenericCacheData(
        queryClient,
        userId,
        (current) => current.filter(item => !itemIds.includes(item.id)),
        "remove-multiple",
        config,
        { itemIds, count: itemIds.length }
      );
    },

    reorderItems: (queryClient: QueryClient, userId: string, reorderedItems: T[]): void => {
      updateGenericCacheData(
        queryClient,
        userId,
        () => reorderedItems,
        "reorder",
        config,
        { count: reorderedItems.length }
      );
    },

    updateMultipleItems: (queryClient: QueryClient, userId: string, updatedItems: T[]): void => {
      updateGenericCacheData(
        queryClient,
        userId,
        (current) => {
          const updatedMap = new Map(updatedItems.map(item => [item.id, item]));
          return current.map(item => updatedMap.get(item.id) || item);
        },
        "batch-update",
        config,
        { count: updatedItems.length }
      );
    },

    replaceAllItems: (queryClient: QueryClient, userId: string, newItems: T[]): void => {
      updateGenericCacheData(
        queryClient,
        userId,
        () => newItems,
        "replace-all",
        config,
        { count: newItems.length }
      );
    },

    getCurrentItems: (queryClient: QueryClient, userId: string): T[] => {
      return getGenericCurrentItems<T>(queryClient, userId, config.queryKeyFactory);
    },

    itemExists: (queryClient: QueryClient, userId: string, itemId: number): boolean => {
      const current = getGenericCurrentItems<T>(queryClient, userId, config.queryKeyFactory);
      return current.some(item => item.id === itemId);
    },

    getItem: (queryClient: QueryClient, userId: string, itemId: number): T | undefined => {
      const current = getGenericCurrentItems<T>(queryClient, userId, config.queryKeyFactory);
      return current.find(item => item.id === itemId);
    },

    replaceTempItem: (queryClient: QueryClient, userId: string, tempId: number, realItem: T): void => {
      updateGenericCacheData(
        queryClient,
        userId,
        (current) => {
          const tempIndex = current.findIndex(item => item.id === tempId);
          if (tempIndex === -1) return current;

          const updated = [...current];
          updated[tempIndex] = realItem;
          return updated;
        },
        "replace-temp",
        config,
        { tempId, realId: realItem.id }
      );
    },
  };
}

/**
 * Factory function to create cache utilities for single-object data
 */
export function createSingleObjectCacheUtils<T extends BaseCacheItem>(
  config: CacheUtilsConfig<T>
): SingleObjectCacheUtils<T> {
  return {
    updateObject: (queryClient: QueryClient, userId: string, item: T): void => {
      updateGenericObjectCacheData(
        queryClient,
        userId,
        () => item,
        "update",
        config,
        { itemId: item.id }
      );
    },

    getCurrentObject: (queryClient: QueryClient, userId: string): T | null => {
      return getGenericCurrentObject<T>(queryClient, userId, config.queryKeyFactory);
    },

    replaceObject: (queryClient: QueryClient, userId: string, item: T): void => {
      updateGenericObjectCacheData(
        queryClient,
        userId,
        () => item,
        "replace-all",
        config,
        { itemId: item.id }
      );
    },

    objectExists: (queryClient: QueryClient, userId: string): boolean => {
      const current = getGenericCurrentObject<T>(queryClient, userId, config.queryKeyFactory);
      return current !== null;
    },
  };
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
 * Generic optimistic update utilities for mutations
 * These help with creating temporary IDs and handling rollbacks for any item type
 */
export const genericOptimisticUpdateUtils = {
  /**
   * Creates a temporary ID for optimistic updates
   * @param prefix - Optional prefix for the temp ID
   * @returns Temporary ID as number
   */
  createTempId: (prefix = "temp"): number => {
    // Create a negative number to distinguish from real IDs
    return -Math.abs(Date.now() + Math.floor(Math.random() * 1000));
  },

  /**
   * Creates an optimistic item for immediate UI updates
   * @param itemData - Partial item data
   * @param userId - User ID
   * @param createFn - Function to create the complete item
   * @returns Complete item with temporary ID
   */
  createOptimisticItem: <T extends BaseCacheItem>(
    itemData: Omit<T, "id" | "createdAt" | "updatedAt">,
    userId: string,
    createFn: (data: Omit<T, "id" | "createdAt" | "updatedAt">, userId: string, tempId: number) => T
  ): T => {
    const tempId = genericOptimisticUpdateUtils.createTempId();
    return createFn(itemData, userId, tempId);
  },

  /**
   * Checks if an item has a temporary ID
   * @param item - Item to check
   * @returns True if item has temporary ID
   */
  isTempItem: <T extends BaseCacheItem>(item: T): boolean => {
    return item.id < 0;
  },

  /**
   * Gets all temporary items from a list
   * @param items - Items to filter
   * @returns Array of temporary items
   */
  getTempItems: <T extends BaseCacheItem>(items: T[]): T[] => {
    return items.filter(item => genericOptimisticUpdateUtils.isTempItem(item));
  },

  /**
   * Gets all real (non-temporary) items from a list
   * @param items - Items to filter
   * @returns Array of real items
   */
  getRealItems: <T extends BaseCacheItem>(items: T[]): T[] => {
    return items.filter(item => !genericOptimisticUpdateUtils.isTempItem(item));
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
 * Generic cache validation utilities
 * These help ensure cache consistency and detect issues for any item type
 */
export const genericCacheValidationUtils = {
  /**
   * Validates that items in cache are properly sorted
   * @param items - Items array to validate
   * @param sortComparator - Function to compare items for sorting
   * @returns True if properly sorted
   */
  isProperlysorted: <T>(items: T[], sortComparator: (a: T, b: T) => number): boolean => {
    for (let i = 1; i < items.length; i++) {
      if (sortComparator(items[i - 1], items[i]) > 0) {
        return false;
      }
    }
    return true;
  },

  /**
   * Validates that all items have required base fields
   * @param items - Items array to validate
   * @param additionalValidator - Optional additional validation function
   * @returns Array of validation errors, empty if valid
   */
  validateItems: <T extends BaseCacheItem>(
    items: T[],
    additionalValidator?: (item: T, index: number) => string[]
  ): string[] => {
    const errors: string[] = [];

    items.forEach((item, index) => {
      // Base validation
      if (!item.id) errors.push(`Item at index ${index} missing ID`);
      if (!item.userId) errors.push(`Item at index ${index} missing userId`);
      if (!item.createdAt) errors.push(`Item at index ${index} missing createdAt`);
      if (!item.updatedAt) errors.push(`Item at index ${index} missing updatedAt`);

      // Additional validation if provided
      if (additionalValidator) {
        const additionalErrors = additionalValidator(item, index);
        errors.push(...additionalErrors);
      }
    });

    return errors;
  },

  /**
   * Checks for duplicate items in cache
   * @param items - Items array to check
   * @returns Array of duplicate IDs
   */
  findDuplicates: <T extends BaseCacheItem>(items: T[]): number[] => {
    const seen = new Set<number>();
    const duplicates = new Set<number>();

    items.forEach(item => {
      if (seen.has(item.id)) {
        duplicates.add(item.id);
      } else {
        seen.add(item.id);
      }
    });

    return Array.from(duplicates);
  },

  /**
   * Validates that rankable items have consistent ranks
   * @param items - Rankable items to validate
   * @returns Array of validation errors
   */
  validateRanks: <T extends RankableItem>(items: T[]): string[] => {
    const errors: string[] = [];
    const ranks = items.map(item => item.rank).filter(rank => rank !== undefined) as number[];

    if (ranks.length !== items.length) {
      errors.push("Some items are missing rank values");
    }

    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size !== ranks.length) {
      errors.push("Duplicate rank values found");
    }

    return errors;
  },

  /**
   * Validates cache consistency for a specific user
   * @param items - Items to validate
   * @param userId - Expected user ID
   * @returns Array of validation errors
   */
  validateUserConsistency: <T extends BaseCacheItem>(items: T[], userId: string): string[] => {
    const errors: string[] = [];

    items.forEach((item, index) => {
      if (item.userId !== userId) {
        errors.push(`Item at index ${index} has incorrect userId: expected ${userId}, got ${item.userId}`);
      }
    });

    return errors;
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

/**
 * Pre-configured cache utilities for different expense types
 */

// Configuration for fixed expenses (existing ExpenseItem type)
const fixedExpenseConfig: CacheUtilsConfig<ExpenseItem> = {
  queryKeyFactory: (userId: string) => reactQueryKeys.fixedExpenses.byUserId(userId),
  sortComparator: (a: ExpenseItem, b: ExpenseItem) => (a.rank ?? 0) - (b.rank ?? 0),
  validateItem: (item: ExpenseItem): string[] => {
    const errors: string[] = [];
    if (!item.name) errors.push("Missing name");
    if (item.amount === undefined || item.amount === null) errors.push("Missing amount");
    if (!item.period) errors.push("Missing period");
    if (!item.category) errors.push("Missing category");
    return errors;
  },
  createOptimisticItem: (data: Partial<ExpenseItem>, userId: string): ExpenseItem => {
    const now = new Date().toISOString();
    const tempId = genericOptimisticUpdateUtils.createTempId();
    return {
      name: data.name || "",
      amount: data.amount || 0,
      period: data.period || "monthly",
      category: data.category || "other",
      rank: data.rank || 0,
      ...data,
      id: tempId,
      userId,
      createdAt: now,
      updatedAt: now,
    } as ExpenseItem;
  },
  itemName: "expense",
};

// Configuration for equipment expenses
const equipmentExpenseConfig: CacheUtilsConfig<EquipmentExpenseItem> = {
  queryKeyFactory: (userId: string) => reactQueryKeys.equipmentExpenses.byUserId(userId),
  sortComparator: (a: EquipmentExpenseItem, b: EquipmentExpenseItem) => (a.rank ?? 0) - (b.rank ?? 0),
  validateItem: (item: EquipmentExpenseItem): string[] => {
    const errors: string[] = [];
    if (!item.name) errors.push("Missing name");
    if (item.amount === undefined || item.amount === null) errors.push("Missing amount");
    if (!item.category) errors.push("Missing category");
    if (!item.purchaseDate) errors.push("Missing purchase date");
    if (item.usage === undefined || item.usage === null) errors.push("Missing usage");
    if (item.lifeSpan === undefined || item.lifeSpan === null) errors.push("Missing life span");
    return errors;
  },
  createOptimisticItem: (data: Partial<EquipmentExpenseItem>, userId: string): EquipmentExpenseItem => {
    const now = new Date().toISOString();
    const tempId = genericOptimisticUpdateUtils.createTempId();
    return {
      name: data.name || "",
      amount: data.amount || 0,
      category: data.category || "other",
      purchaseDate: data.purchaseDate || new Date(),
      usage: data.usage || 0,
      lifeSpan: data.lifeSpan || 12,
      rank: data.rank || 0,
      ...data,
      id: tempId,
      userId,
      createdAt: now,
      updatedAt: now,
    } as EquipmentExpenseItem;
  },
  itemName: "equipment",
};

// Configuration for billable costs (single object)
const billableCostConfig: CacheUtilsConfig<BillableCostItem> = {
  queryKeyFactory: (userId: string) => reactQueryKeys.billableExpenses.byUserId(userId),
  sortComparator: () => 0, // Single object, no sorting needed
  validateItem: (item: BillableCostItem): string[] => {
    const errors: string[] = [];
    if (item.workDays === undefined || item.workDays === null) errors.push("Missing work days");
    if (item.hoursPerDay === undefined || item.hoursPerDay === null) errors.push("Missing hours per day");
    if (item.monthlySalary === undefined || item.monthlySalary === null) errors.push("Missing monthly salary");
    if (item.billableHours === undefined || item.billableHours === null) errors.push("Missing billable hours");
    return errors;
  },
  createOptimisticItem: (data: Partial<BillableCostItem>, userId: string): BillableCostItem => {
    const now = new Date().toISOString();
    const tempId = genericOptimisticUpdateUtils.createTempId();
    return {
      workDays: data.workDays || 22,
      hoursPerDay: data.hoursPerDay || 8,
      holidaysDays: data.holidaysDays || 0,
      vacationsDays: data.vacationsDays || 0,
      sickLeaveDays: data.sickLeaveDays || 0,
      monthlySalary: data.monthlySalary || 0,
      taxes: data.taxes || 0,
      fees: data.fees || 0,
      margin: data.margin || 0,
      billableHours: data.billableHours || 0,
      ...data,
      id: tempId,
      userId,
      createdAt: now,
      updatedAt: now,
    } as BillableCostItem;
  },
  itemName: "billable-cost",
};

/**
 * Pre-configured cache utilities for different expense types
 */
export const fixedExpenseCacheUtils = createGenericCacheUtils(fixedExpenseConfig);
export const equipmentExpenseCacheUtils = createGenericCacheUtils(equipmentExpenseConfig);
export const billableCostCacheUtils = createSingleObjectCacheUtils(billableCostConfig);

/**
 * Specialized billable cost cache utilities with form data transformation
 * These utilities handle the specific needs of billable cost management including
 * form-to-cache data transformations and optimistic updates
 */
export const billableCostSpecializedUtils = {
  /**
   * Updates billable cost data with form data transformation
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param formData - Form data from the billable cost form
   * @param calculatedBillableHours - Pre-calculated billable hours
   */
  updateFromFormData: (
    queryClient: QueryClient,
    userId: string,
    formData: {
      work_days: number;
      hours_per_day: number;
      holiday_days: number;
      vacation_days: number;
      sick_leave: number;
      monthly_salary: number;
      taxes: number;
      fees: number;
      margin: number;
    },
    calculatedBillableHours: number
  ): void => {
    const transformedData: BillableCostItem = {
      id: Date.now(), // Temporary ID for optimistic updates
      userId,
      workDays: formData.work_days,
      hoursPerDay: formData.hours_per_day,
      holidaysDays: formData.holiday_days,
      vacationsDays: formData.vacation_days,
      sickLeaveDays: formData.sick_leave,
      monthlySalary: formData.monthly_salary,
      taxes: formData.taxes,
      fees: formData.fees,
      margin: formData.margin,
      billableHours: calculatedBillableHours,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    billableCostCacheUtils.updateObject(queryClient, userId, transformedData);
  },

  /**
   * Creates optimistic billable cost update for immediate UI feedback
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param partialData - Partial billable cost data for optimistic update
   * @returns Context object for rollback on error
   */
  createOptimisticUpdate: (
    queryClient: QueryClient,
    userId: string,
    partialData: Partial<BillableCostItem>
  ): { previousData: BillableCostItem | null; queryKey: QueryKey } => {
    const queryKey = reactQueryKeys.billableExpenses.byUserId(userId);
    const previousData = billableCostCacheUtils.getCurrentObject(queryClient, userId);

    if (previousData) {
      const optimisticData: BillableCostItem = {
        ...previousData,
        ...partialData,
        updatedAt: new Date().toISOString(),
      };
      billableCostCacheUtils.updateObject(queryClient, userId, optimisticData);
    }

    return { previousData, queryKey };
  },

  /**
   * Rolls back optimistic update on mutation failure
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param previousData - Previous data to restore
   */
  rollbackOptimisticUpdate: (
    queryClient: QueryClient,
    userId: string,
    previousData: BillableCostItem | null
  ): void => {
    const queryKey = reactQueryKeys.billableExpenses.byUserId(userId);
    if (previousData) {
      billableCostCacheUtils.updateObject(queryClient, userId, previousData);
    } else {
      // If there was no previous data, clear the cache
      queryClient.setQueryData(queryKey, null);
    }
  },

  /**
   * Validates billable cost form data before cache update
   * @param formData - Form data to validate
   * @returns Array of validation errors (empty if valid)
   */
  validateFormData: (formData: {
    work_days: number;
    hours_per_day: number;
    holiday_days: number;
    vacation_days: number;
    sick_leave: number;
    monthly_salary: number;
    taxes: number;
    fees: number;
    margin: number;
  }): string[] => {
    const errors: string[] = [];

    if (!formData.work_days || formData.work_days < 1 || formData.work_days > 7) {
      errors.push("Work days must be between 1 and 7");
    }
    if (!formData.hours_per_day || formData.hours_per_day < 1 || formData.hours_per_day > 24) {
      errors.push("Hours per day must be between 1 and 24");
    }
    if (formData.holiday_days < 0 || formData.holiday_days > 365) {
      errors.push("Holiday days must be between 0 and 365");
    }
    if (formData.vacation_days < 0 || formData.vacation_days > 365) {
      errors.push("Vacation days must be between 0 and 365");
    }
    if (formData.sick_leave < 0 || formData.sick_leave > 180) {
      errors.push("Sick leave days must be between 0 and 180");
    }
    if (formData.monthly_salary < 0) {
      errors.push("Monthly salary cannot be negative");
    }
    if (formData.taxes < 0 || formData.taxes > 100) {
      errors.push("Taxes must be between 0 and 100 percent");
    }
    if (formData.fees < 0 || formData.fees > 100) {
      errors.push("Fees must be between 0 and 100 percent");
    }
    if (formData.margin < 0 || formData.margin > 100) {
      errors.push("Margin must be between 0 and 100 percent");
    }

    return errors;
  },

  /**
   * Transforms server response to cache format
   * @param serverData - Data from server response
   * @returns Transformed data for cache
   */
  transformServerResponse: (serverData: any): BillableCostItem => {
    return {
      id: serverData.id,
      userId: serverData.userId,
      workDays: serverData.workDays,
      hoursPerDay: serverData.hoursPerDay,
      holidaysDays: serverData.holidaysDays,
      vacationsDays: serverData.vacationsDays,
      sickLeaveDays: serverData.sickLeaveDays,
      monthlySalary: serverData.monthlySalary,
      taxes: serverData.taxes,
      fees: serverData.fees,
      margin: serverData.margin,
      billableHours: serverData.billableHours,
      createdAt: serverData.createdAt,
      updatedAt: serverData.updatedAt,
    };
  },

  /**
   * Transforms cache data to form format
   * @param cacheData - Data from cache
   * @returns Transformed data for form
   */
  transformToFormData: (cacheData: BillableCostItem) => {
    return {
      work_days: cacheData.workDays,
      hours_per_day: cacheData.hoursPerDay,
      holiday_days: cacheData.holidaysDays,
      vacation_days: cacheData.vacationsDays,
      sick_leave: cacheData.sickLeaveDays,
      monthly_salary: cacheData.monthlySalary,
      taxes: cacheData.taxes,
      fees: cacheData.fees,
      margin: cacheData.margin,
    };
  },

  /**
   * Calculates billable hours from form data
   * @param formData - Form data containing work parameters
   * @returns Calculated billable hours
   */
  calculateBillableHours: (formData: {
    work_days: number;
    hours_per_day: number;
    holiday_days: number;
    vacation_days: number;
    sick_leave: number;
  }): number => {
    const timeOff = formData.holiday_days + formData.vacation_days + formData.sick_leave;
    const workDaysPerYear = formData.work_days * 52;
    const actualWorkDays = Math.max(0, workDaysPerYear - timeOff);
    const billableHours = Math.max(0, actualWorkDays * formData.hours_per_day);
    return billableHours;
  },

  /**
   * Gets current billable cost data with error handling
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @returns Current billable cost data or null
   */
  getCurrentBillableCost: (
    queryClient: QueryClient,
    userId: string
  ): BillableCostItem | null => {
    return billableCostCacheUtils.getCurrentObject(queryClient, userId);
  },

  /**
   * Checks if billable cost data exists for user
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @returns True if data exists, false otherwise
   */
  billableCostExists: (
    queryClient: QueryClient,
    userId: string
  ): boolean => {
    return billableCostCacheUtils.objectExists(queryClient, userId);
  },

  /**
   * Creates a complete billable cost item from partial form data
   * @param userId - User ID
   * @param formData - Form data
   * @param existingData - Existing data to merge with (optional)
   * @returns Complete billable cost item
   */
  createBillableCostItem: (
    userId: string,
    formData: {
      work_days: number;
      hours_per_day: number;
      holiday_days: number;
      vacation_days: number;
      sick_leave: number;
      monthly_salary: number;
      taxes: number;
      fees: number;
      margin: number;
    },
    existingData?: BillableCostItem | null
  ): BillableCostItem => {
    const now = new Date().toISOString();
    const billableHours = billableCostSpecializedUtils.calculateBillableHours(formData);

    return {
      id: existingData?.id || Date.now(),
      userId,
      workDays: formData.work_days,
      hoursPerDay: formData.hours_per_day,
      holidaysDays: formData.holiday_days,
      vacationsDays: formData.vacation_days,
      sickLeaveDays: formData.sick_leave,
      monthlySalary: formData.monthly_salary,
      taxes: formData.taxes,
      fees: formData.fees,
      margin: formData.margin,
      billableHours,
      createdAt: existingData?.createdAt || now,
      updatedAt: now,
    };
  },
};

/**
 * Factory function to create cache utilities for custom item types
 */
export function createCacheUtilsForType<T extends BaseCacheItem>(
  config: CacheUtilsConfig<T>
): GenericCacheUtils<T> {
  return createGenericCacheUtils(config);
}

/**
 * Factory function to create single-object cache utilities for custom item types
 */
export function createSingleObjectCacheUtilsForType<T extends BaseCacheItem>(
  config: CacheUtilsConfig<T>
): SingleObjectCacheUtils<T> {
  return createSingleObjectCacheUtils(config);
}

// Export all utilities as a single object for convenience
export const queryCacheUtils = {
  expenses: expenseCacheUtils,
  fixedExpenses: fixedExpenseCacheUtils,
  equipmentExpenses: equipmentExpenseCacheUtils,
  billableCost: billableCostCacheUtils,
  billableCostSpecialized: billableCostSpecializedUtils,
  optimistic: optimisticUpdateUtils,
  genericOptimistic: genericOptimisticUpdateUtils,
  validation: cacheValidationUtils,
  genericValidation: genericCacheValidationUtils,
  logger: cacheLogger,
  createForType: createCacheUtilsForType,
  createSingleObjectForType: createSingleObjectCacheUtilsForType,
};

// Export cache logger for direct access
export { cacheLogger };

// Default export for backward compatibility
export default queryCacheUtils;