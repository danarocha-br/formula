/**
 * Integration utilities for seamless error handling with existing cache utilities
 * Provides wrappers and enhanced versions of cache operations with comprehensive error handling
 */

import type { QueryClient } from '@tanstack/react-query';
import {
  CacheError,
  CacheErrorType,
  CacheErrorSeverity,
  cacheErrorManager,
  ErrorHandlingUtils,
  type RetryConfig,
} from './cache-error-handling';
import type {
  GenericCacheUtils,
  SingleObjectCacheUtils,
  BaseCacheItem,
  CacheUtilsConfig
} from './query-cache-utils';

/**
 * Enhanced cache utilities with comprehensive error handling
 */
export interface ErrorHandledCacheUtils<T extends BaseCacheItem> extends GenericCacheUtils<T> {
  // All methods from GenericCacheUtils are automatically error-handled

  // Additional error handling methods
  validateCacheIntegrity: (queryClient: QueryClient, userId: string) => Promise<boolean>;
  recoverFromCorruption: (queryClient: QueryClient, userId: string) => Promise<void>;
  getErrorStatistics: () => any;
  resetErrorHandling: () => void;
}

/**
 * Enhanced single object cache utilities with error handling
 */
export interface ErrorHandledSingleObjectCacheUtils<T extends BaseCacheItem> extends SingleObjectCacheUtils<T> {
  // All methods from SingleObjectCacheUtils are automatically error-handled

  // Additional error handling methods
  validateCacheIntegrity: (queryClient: QueryClient, userId: string) => Promise<boolean>;
  recoverFromCorruption: (queryClient: QueryClient, userId: string) => Promise<void>;
  getErrorStatistics: () => any;
  resetErrorHandling: () => void;
}

/**
 * Configuration for error-handled cache utilities
 */
interface ErrorHandlingConfig {
  useCircuitBreaker?: boolean;
  useRetry?: boolean;
  retryConfig?: Partial<RetryConfig>;
  customRetryLogic?: (error: Error) => boolean;
  enableCorruptionDetection?: boolean;
  enableAutoRecovery?: boolean;
}

/**
 * Create error-handled cache utilities for array-based data
 */
export function createErrorHandledCacheUtils<T extends BaseCacheItem>(
  baseCacheUtils: GenericCacheUtils<T>,
  config: CacheUtilsConfig<T>,
  errorConfig: ErrorHandlingConfig = {}
): ErrorHandledCacheUtils<T> {
  const {
    useCircuitBreaker = true,
    useRetry = true,
    retryConfig,
    customRetryLogic,
    enableCorruptionDetection = true,
    enableAutoRecovery = true,
  } = errorConfig;

  const feature = config.itemName || 'cache';
  const recoveryManager = cacheErrorManager.getRecoveryManager(feature);

  // Setup corruption detection if enabled
  if (enableCorruptionDetection) {
    setupCorruptionDetection(recoveryManager, baseCacheUtils, config);
  }

  /**
   * Wrap cache operation with error handling
   */
  const wrapCacheOperation = <Args extends any[], Return>(
    operation: (...args: Args) => Return,
    operationName: string
  ) => {
    return async (...args: Args): Promise<Return> => {
      return cacheErrorManager.executeWithErrorHandling(
        async () => {
          try {
            return operation(...args);
          } catch (error) {
            throw ErrorHandlingUtils.createCacheError(
              error as Error,
              operationName,
              feature,
              {
                type: classifyOperationError(error as Error, operationName),
                severity: ErrorHandlingUtils.getErrorSeverity(error as Error),
                userId: extractUserIdFromArgs(args),
                itemId: extractItemIdFromArgs(args),
                metadata: { args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg) },
              }
            );
          }
        },
        {
          operationName,
          feature,
          useCircuitBreaker,
          useRetry,
          retryConfig,
          shouldRetry: customRetryLogic,
        }
      );
    };
  };

  /**
   * Wrap synchronous cache operation
   */
  const wrapSyncCacheOperation = <Args extends any[], Return>(
    operation: (...args: Args) => Return,
    operationName: string
  ) => {
    return (...args: Args): Return => {
      try {
        return operation(...args);
      } catch (error) {
        const cacheError = ErrorHandlingUtils.createCacheError(
          error as Error,
          operationName,
          feature,
          {
            type: classifyOperationError(error as Error, operationName),
            severity: ErrorHandlingUtils.getErrorSeverity(error as Error),
            userId: extractUserIdFromArgs(args),
            itemId: extractItemIdFromArgs(args),
            metadata: { args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg) },
          }
        );

        // Log error but don't use async error handling for sync operations
        console.error('Sync cache operation error:', cacheError.toJSON());
        throw cacheError;
      }
    };
  };

  return {
    // Wrap all base cache utility methods with error handling
    addItem: wrapSyncCacheOperation(baseCacheUtils.addItem, 'addItem'),
    updateItem: wrapSyncCacheOperation(baseCacheUtils.updateItem, 'updateItem'),
    removeItem: wrapSyncCacheOperation(baseCacheUtils.removeItem, 'removeItem'),
    removeMultipleItems: wrapSyncCacheOperation(baseCacheUtils.removeMultipleItems, 'removeMultipleItems'),
    reorderItems: wrapSyncCacheOperation(baseCacheUtils.reorderItems, 'reorderItems'),
    updateMultipleItems: wrapSyncCacheOperation(baseCacheUtils.updateMultipleItems, 'updateMultipleItems'),
    replaceAllItems: wrapSyncCacheOperation(baseCacheUtils.replaceAllItems, 'replaceAllItems'),
    getCurrentItems: wrapSyncCacheOperation(baseCacheUtils.getCurrentItems, 'getCurrentItems'),
    itemExists: wrapSyncCacheOperation(baseCacheUtils.itemExists, 'itemExists'),
    getItem: wrapSyncCacheOperation(baseCacheUtils.getItem, 'getItem'),
    replaceTempItem: wrapSyncCacheOperation(baseCacheUtils.replaceTempItem, 'replaceTempItem'),

    // Additional error handling methods
    validateCacheIntegrity: async (queryClient: QueryClient, userId: string): Promise<boolean> => {
      try {
        const currentItems = baseCacheUtils.getCurrentItems(queryClient, userId);

        // Validate each item
        const validationErrors = currentItems.flatMap(item => config.validateItem(item));

        if (validationErrors.length > 0) {
          console.warn(`Cache integrity issues found for ${feature}:`, validationErrors);
          return false;
        }

        return true;
      } catch (error) {
        throw ErrorHandlingUtils.createCacheError(
          error as Error,
          'validateCacheIntegrity',
          feature,
          {
            type: CacheErrorType.CACHE_CORRUPTION,
            severity: CacheErrorSeverity.HIGH,
            userId,
          }
        );
      }
    },

    recoverFromCorruption: async (queryClient: QueryClient, userId: string): Promise<void> => {
      if (!enableAutoRecovery) {
        throw new CacheError({
          type: CacheErrorType.CACHE_CORRUPTION,
          severity: CacheErrorSeverity.HIGH,
          operation: 'recoverFromCorruption',
          feature,
          message: 'Auto-recovery is disabled for this cache',
          userId,
        });
      }

      try {
        // Clear corrupted cache
        baseCacheUtils.replaceAllItems(queryClient, userId, []);

        // Trigger cache recovery through React Query invalidation
        const queryKey = config.queryKeyFactory(userId);
        await queryClient.invalidateQueries({ queryKey });

        console.log(`Cache recovery completed for ${feature} user ${userId}`);
      } catch (error) {
        throw ErrorHandlingUtils.createCacheError(
          error as Error,
          'recoverFromCorruption',
          feature,
          {
            type: CacheErrorType.CACHE_CORRUPTION,
            severity: CacheErrorSeverity.CRITICAL,
            userId,
          }
        );
      }
    },

    getErrorStatistics: () => {
      return cacheErrorManager.getErrorStatistics();
    },

    resetErrorHandling: () => {
      cacheErrorManager.clearErrorLog();
      cacheErrorManager.resetCircuitBreakers();
    },
  };
}

/**
 * Create error-handled cache utilities for single-object data
 */
export function createErrorHandledSingleObjectCacheUtils<T extends BaseCacheItem>(
  baseCacheUtils: SingleObjectCacheUtils<T>,
  config: CacheUtilsConfig<T>,
  errorConfig: ErrorHandlingConfig = {}
): ErrorHandledSingleObjectCacheUtils<T> {
  const {
    useCircuitBreaker = true,
    useRetry = true,
    retryConfig,
    customRetryLogic,
    enableCorruptionDetection = true,
    enableAutoRecovery = true,
  } = errorConfig;

  const feature = config.itemName || 'cache';

  /**
   * Wrap synchronous cache operation
   */
  const wrapSyncCacheOperation = <Args extends any[], Return>(
    operation: (...args: Args) => Return,
    operationName: string
  ) => {
    return (...args: Args): Return => {
      try {
        return operation(...args);
      } catch (error) {
        const cacheError = ErrorHandlingUtils.createCacheError(
          error as Error,
          operationName,
          feature,
          {
            type: classifyOperationError(error as Error, operationName),
            severity: ErrorHandlingUtils.getErrorSeverity(error as Error),
            userId: extractUserIdFromArgs(args),
            metadata: { args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg) },
          }
        );

        console.error('Sync cache operation error:', cacheError.toJSON());
        throw cacheError;
      }
    };
  };

  return {
    // Wrap all base cache utility methods with error handling
    updateObject: wrapSyncCacheOperation(baseCacheUtils.updateObject, 'updateObject'),
    getCurrentObject: wrapSyncCacheOperation(baseCacheUtils.getCurrentObject, 'getCurrentObject'),
    replaceObject: wrapSyncCacheOperation(baseCacheUtils.replaceObject, 'replaceObject'),
    objectExists: wrapSyncCacheOperation(baseCacheUtils.objectExists, 'objectExists'),

    // Additional error handling methods
    validateCacheIntegrity: async (queryClient: QueryClient, userId: string): Promise<boolean> => {
      try {
        const currentObject = baseCacheUtils.getCurrentObject(queryClient, userId);

        if (!currentObject) {
          return true; // No object to validate
        }

        // Validate the object
        const validationErrors = config.validateItem(currentObject);

        if (validationErrors.length > 0) {
          console.warn(`Cache integrity issues found for ${feature}:`, validationErrors);
          return false;
        }

        return true;
      } catch (error) {
        throw ErrorHandlingUtils.createCacheError(
          error as Error,
          'validateCacheIntegrity',
          feature,
          {
            type: CacheErrorType.CACHE_CORRUPTION,
            severity: CacheErrorSeverity.HIGH,
            userId,
          }
        );
      }
    },

    recoverFromCorruption: async (queryClient: QueryClient, userId: string): Promise<void> => {
      if (!enableAutoRecovery) {
        throw new CacheError({
          type: CacheErrorType.CACHE_CORRUPTION,
          severity: CacheErrorSeverity.HIGH,
          operation: 'recoverFromCorruption',
          feature,
          message: 'Auto-recovery is disabled for this cache',
          userId,
        });
      }

      try {
        // Clear corrupted cache
        const queryKey = config.queryKeyFactory(userId);
        queryClient.removeQueries({ queryKey });

        // Trigger cache recovery through React Query invalidation
        await queryClient.invalidateQueries({ queryKey });

        console.log(`Cache recovery completed for ${feature} user ${userId}`);
      } catch (error) {
        throw ErrorHandlingUtils.createCacheError(
          error as Error,
          'recoverFromCorruption',
          feature,
          {
            type: CacheErrorType.CACHE_CORRUPTION,
            severity: CacheErrorSeverity.CRITICAL,
            userId,
          }
        );
      }
    },

    getErrorStatistics: () => {
      return cacheErrorManager.getErrorStatistics();
    },

    resetErrorHandling: () => {
      cacheErrorManager.clearErrorLog();
      cacheErrorManager.resetCircuitBreakers();
    },
  };
}

/**
 * Setup corruption detection for cache utilities
 */
function setupCorruptionDetection<T extends BaseCacheItem>(
  recoveryManager: any,
  baseCacheUtils: GenericCacheUtils<T> | SingleObjectCacheUtils<T>,
  config: CacheUtilsConfig<T>
): void {
  const feature = config.itemName || 'cache';
  const cacheKey = `${feature}-cache`;

  // Register corruption check
  recoveryManager.registerCorruptionCheck(cacheKey, () => {
    try {
      // This is a basic check - can be enhanced based on specific requirements
      if ('getCurrentItems' in baseCacheUtils) {
        // Array-based cache
        const items = (baseCacheUtils as any).getCurrentItems({} as any, 'test');
        return Array.isArray(items);
      } else {
        // Single object cache
        const obj = (baseCacheUtils as any).getCurrentObject({} as any, 'test');
        return obj === null || typeof obj === 'object';
      }
    } catch {
      return false;
    }
  });

  // Register recovery strategy
  recoveryManager.registerRecoveryStrategy(cacheKey, async () => {
    console.log(`Recovering cache for ${feature}`);
    // Recovery logic would be implemented here
    // For now, just log the recovery attempt
  });
}

/**
 * Classify error based on operation and error details
 */
function classifyOperationError(error: Error, operation: string): CacheErrorType {
  const message = error.message.toLowerCase();

  // Network-related errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return CacheErrorType.NETWORK_ERROR;
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('abort')) {
    return CacheErrorType.TIMEOUT_ERROR;
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return CacheErrorType.VALIDATION_ERROR;
  }

  // Permission errors
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return CacheErrorType.PERMISSION_ERROR;
  }

  // Quota errors
  if (message.includes('quota') || message.includes('limit') || message.includes('exceeded')) {
    return CacheErrorType.QUOTA_EXCEEDED;
  }

  // Cache corruption
  if (message.includes('corrupt') || message.includes('invalid state') || operation.includes('validate')) {
    return CacheErrorType.CACHE_CORRUPTION;
  }

  // Concurrent modification
  if (message.includes('concurrent') || message.includes('conflict') || message.includes('version')) {
    return CacheErrorType.CONCURRENT_MODIFICATION;
  }

  return CacheErrorType.UNKNOWN_ERROR;
}

/**
 * Extract user ID from operation arguments
 */
function extractUserIdFromArgs(args: any[]): string | undefined {
  // Look for userId in the arguments
  for (const arg of args) {
    if (typeof arg === 'string' && arg.includes('user')) {
      return arg;
    }
    if (typeof arg === 'object' && arg?.userId) {
      return arg.userId;
    }
  }

  // Check if second argument is typically userId (common pattern)
  if (args.length >= 2 && typeof args[1] === 'string') {
    return args[1];
  }

  return undefined;
}

/**
 * Extract item ID from operation arguments
 */
function extractItemIdFromArgs(args: any[]): number | string | undefined {
  // Look for item ID in the arguments
  for (const arg of args) {
    if (typeof arg === 'number') {
      return arg;
    }
    if (typeof arg === 'object' && arg?.id) {
      return arg.id;
    }
  }

  return undefined;
}

/**
 * Mutation wrapper with comprehensive error handling
 */
export function withMutationErrorHandling<TData, TError, TVariables>(
  mutationConfig: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    onMutate?: (variables: TVariables) => Promise<any> | any;
    onSuccess?: (data: TData, variables: TVariables, context: any) => Promise<void> | void;
    onError?: (error: TError, variables: TVariables, context: any) => Promise<void> | void;
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: any) => Promise<void> | void;
  },
  operation: string,
  feature: string,
  errorConfig: ErrorHandlingConfig = {}
) {
  const {
    useCircuitBreaker = true,
    useRetry = true,
    retryConfig,
    customRetryLogic,
  } = errorConfig;

  return {
    ...mutationConfig,
    mutationFn: async (variables: TVariables): Promise<TData> => {
      return cacheErrorManager.executeWithErrorHandling(
        () => mutationConfig.mutationFn(variables),
        {
          operationName: operation,
          feature,
          useCircuitBreaker,
          useRetry,
          retryConfig,
          shouldRetry: customRetryLogic,
        }
      );
    },
    onError: (error: TError, variables: TVariables, context: any) => {
      // Log the error
      if (!(error instanceof CacheError)) {
        const cacheError = ErrorHandlingUtils.createCacheError(
          error as any,
          operation,
          feature,
          {
            type: CacheErrorType.UNKNOWN_ERROR,
            severity: CacheErrorSeverity.HIGH,
            metadata: { variables, context },
          }
        );
        console.error('Mutation error:', cacheError.toJSON());
      }

      // Call original onError if provided
      if (mutationConfig.onError) {
        mutationConfig.onError(error, variables, context);
      }
    },
  };
}

/**
 * Query wrapper with comprehensive error handling
 */
export function withQueryErrorHandling<TData>(
  queryConfig: {
    queryFn: () => Promise<TData>;
    onError?: (error: any) => void;
    retry?: boolean | number | ((failureCount: number, error: any) => boolean);
  },
  operation: string,
  feature: string,
  errorConfig: ErrorHandlingConfig = {}
) {
  const { customRetryLogic } = errorConfig;

  return {
    ...queryConfig,
    queryFn: async (): Promise<TData> => {
      try {
        return await queryConfig.queryFn();
      } catch (error) {
        const cacheError = ErrorHandlingUtils.createCacheError(
          error as Error,
          operation,
          feature,
          {
            type: CacheErrorType.NETWORK_ERROR,
            severity: CacheErrorSeverity.MEDIUM,
          }
        );

        console.error('Query error:', cacheError.toJSON());
        throw cacheError;
      }
    },
    retry: customRetryLogic || queryConfig.retry,
    onError: (error: any) => {
      // Log the error
      if (!(error instanceof CacheError)) {
        const cacheError = ErrorHandlingUtils.createCacheError(
          error,
          operation,
          feature,
          {
            type: CacheErrorType.NETWORK_ERROR,
            severity: CacheErrorSeverity.MEDIUM,
          }
        );
        console.error('Query error:', cacheError.toJSON());
      }

      // Call original onError if provided
      if (queryConfig.onError) {
        queryConfig.onError(error);
      }
    },
  };
}