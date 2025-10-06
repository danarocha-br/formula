/**
 * Performance monitoring integration utilities
 * Provides seamless integration between cache operations and performance monitoring
 */

import type { QueryClient } from '@tanstack/react-query';
import { performanceMonitor, measurePerformance, measurePerformanceAsync } from './performance-monitor';

/**
 * Enhanced cache operation wrapper that automatically tracks performance
 */
export function withPerformanceTracking<T extends any[], R>(
  fn: (...args: T) => R,
  operation: string,
  feature: string
): (...args: T) => R {
  return (...args: T): R => {
    return measurePerformance(() => fn(...args), operation, feature);
  };
}

/**
 * Enhanced async cache operation wrapper that automatically tracks performance
 */
export function withAsyncPerformanceTracking<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string,
  feature: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return measurePerformanceAsync(() => fn(...args), operation, feature);
  };
}

/**
 * Cache utilities factory with built-in performance monitoring
 */
export function createMonitoredCacheUtils<T>(
  baseCacheUtils: T,
  feature: string
): T {
  const monitoredUtils = {} as T;

  // Wrap all methods with performance tracking
  for (const [key, value] of Object.entries(baseCacheUtils as any)) {
    if (typeof value === 'function') {
      (monitoredUtils as any)[key] = withPerformanceTracking(
        value.bind(baseCacheUtils),
        key,
        feature
      );
    } else {
      (monitoredUtils as any)[key] = value;
    }
  }

  return monitoredUtils;
}

/**
 * Query client wrapper that tracks cache size and query count
 */
export class MonitoredQueryClient {
  constructor(private queryClient: QueryClient) {}

  /**
   * Track cache metrics and update performance monitor
   */
  trackCacheMetrics(): void {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();

    const cacheSize = queries.reduce((total, query) => {
      const data = query.state.data;
      if (Array.isArray(data)) {
        return total + data.length;
      }
      return data ? total + 1 : total;
    }, 0);

    const queryCount = queries.length;
    const componentCount = this.estimateComponentCount();

    performanceMonitor.trackMemoryUsage(cacheSize, queryCount, componentCount);
  }

  /**
   * Estimate component count based on render metrics
   */
  private estimateComponentCount(): number {
    return performanceMonitor.getAllRenderMetrics().length;
  }

  /**
   * Get the underlying query client
   */
  getQueryClient(): QueryClient {
    return this.queryClient;
  }

  /**
   * Wrapper methods that track performance
   */
  setQueryData<T>(queryKey: any, updater: T | ((oldData: T | undefined) => T)): void {
    measurePerformance(
      () => this.queryClient.setQueryData(queryKey, updater),
      'setQueryData',
      'react-query'
    );
    this.trackCacheMetrics();
  }

  getQueryData<T>(queryKey: any): T | undefined {
    return measurePerformance(
      () => this.queryClient.getQueryData<T>(queryKey),
      'getQueryData',
      'react-query'
    );
  }

  invalidateQueries(filters?: any): Promise<void> {
    return measurePerformanceAsync(
      () => this.queryClient.invalidateQueries(filters),
      'invalidateQueries',
      'react-query'
    );
  }

  removeQueries(filters?: any): void {
    measurePerformance(
      () => this.queryClient.removeQueries(filters),
      'removeQueries',
      'react-query'
    );
    this.trackCacheMetrics();
  }

  clear(): void {
    measurePerformance(
      () => this.queryClient.clear(),
      'clear',
      'react-query'
    );
    this.trackCacheMetrics();
  }
}

/**
 * Performance monitoring middleware for mutation hooks
 */
export function withMutationPerformanceTracking<TData, TError, TVariables>(
  mutationConfig: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    onMutate?: (variables: TVariables) => Promise<any> | any;
    onSuccess?: (data: TData, variables: TVariables, context: any) => Promise<void> | void;
    onError?: (error: TError, variables: TVariables, context: any) => Promise<void> | void;
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: any) => Promise<void> | void;
  },
  operation: string,
  feature: string
) {
  return {
    ...mutationConfig,
    mutationFn: withAsyncPerformanceTracking(mutationConfig.mutationFn, operation, feature),
    onMutate: mutationConfig.onMutate ? withPerformanceTracking(mutationConfig.onMutate, `${operation}-onMutate`, feature) : undefined,
    onSuccess: mutationConfig.onSuccess ? withPerformanceTracking(mutationConfig.onSuccess, `${operation}-onSuccess`, feature) : undefined,
    onError: mutationConfig.onError ? withPerformanceTracking(mutationConfig.onError, `${operation}-onError`, feature) : undefined,
    onSettled: mutationConfig.onSettled ? withPerformanceTracking(mutationConfig.onSettled, `${operation}-onSettled`, feature) : undefined,
  };
}

/**
 * Performance monitoring middleware for query hooks
 */
export function withQueryPerformanceTracking<TData>(
  queryConfig: {
    queryFn: () => Promise<TData>;
    select?: (data: TData) => any;
    onSuccess?: (data: TData) => void;
    onError?: (error: any) => void;
  },
  operation: string,
  feature: string
) {
  return {
    ...queryConfig,
    queryFn: withAsyncPerformanceTracking(queryConfig.queryFn, operation, feature),
    select: queryConfig.select ? withPerformanceTracking(queryConfig.select, `${operation}-select`, feature) : undefined,
    onSuccess: queryConfig.onSuccess ? withPerformanceTracking(queryConfig.onSuccess, `${operation}-onSuccess`, feature) : undefined,
    onError: queryConfig.onError ? withPerformanceTracking(queryConfig.onError, `${operation}-onError`, feature) : undefined,
  };
}

/**
 * Automatic performance regression detection for cache operations
 */
export class PerformanceRegressionDetector {
  private baselineMetrics = new Map<string, number>();
  private readonly REGRESSION_THRESHOLD = 1.5; // 50% increase
  private readonly MIN_SAMPLES = 5;

  /**
   * Record baseline performance for an operation
   */
  recordBaseline(operation: string, feature: string, duration: number): void {
    const key = `${feature}-${operation}`;
    const existing = this.baselineMetrics.get(key);

    if (!existing) {
      this.baselineMetrics.set(key, duration);
    } else {
      // Update baseline with moving average
      const newBaseline = (existing + duration) / 2;
      this.baselineMetrics.set(key, newBaseline);
    }
  }

  /**
   * Check for performance regression
   */
  checkRegression(operation: string, feature: string, currentDuration: number): boolean {
    const key = `${feature}-${operation}`;
    const baseline = this.baselineMetrics.get(key);

    if (!baseline) {
      this.recordBaseline(operation, feature, currentDuration);
      return false;
    }

    const regressionRatio = currentDuration / baseline;
    return regressionRatio > this.REGRESSION_THRESHOLD;
  }

  /**
   * Get all baselines
   */
  getBaselines(): Map<string, number> {
    return new Map(this.baselineMetrics);
  }

  /**
   * Reset baselines
   */
  resetBaselines(): void {
    this.baselineMetrics.clear();
  }
}

/**
 * Global performance regression detector instance
 */
export const performanceRegressionDetector = new PerformanceRegressionDetector();

/**
 * Utility to create performance-aware cache operation wrappers
 */
export function createPerformanceAwareCacheOperation<T extends any[], R>(
  operation: (...args: T) => R,
  operationName: string,
  feature: string,
  options: {
    trackRegression?: boolean;
    alertOnSlow?: boolean;
    slowThreshold?: number;
  } = {}
): (...args: T) => R {
  const { trackRegression = true, alertOnSlow = true, slowThreshold = 50 } = options;

  return (...args: T): R => {
    const startTime = performance.now();
    let success = true;
    let result: R;

    try {
      result = operation(...args);
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;

      // Track with performance monitor
      performanceMonitor.trackCacheOperation(operationName, feature, duration, success);

      // Check for regression
      if (trackRegression) {
        const hasRegression = performanceRegressionDetector.checkRegression(operationName, feature, duration);
        if (hasRegression) {
          console.warn(`⚠️ Performance regression detected in ${feature}-${operationName}: ${duration.toFixed(2)}ms`);
        }
      }

      // Alert on slow operations
      if (alertOnSlow && duration > slowThreshold) {
        console.warn(`🐌 Slow cache operation detected: ${feature}-${operationName} took ${duration.toFixed(2)}ms`);
      }
    }
  };
}

/**
 * Initialize performance monitoring for all cache operations
 */
export function initializePerformanceMonitoring(): void {
  // Start memory tracking
  performanceMonitor.initialize();

  // Set up periodic cache metrics tracking
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    setInterval(() => {
      // This will be called by MonitoredQueryClient instances
      console.log('📊 Performance monitoring active');
    }, 60000); // Every minute
  }
}

/**
 * Export performance monitoring utilities for easy access
 */
export {
  performanceMonitor,
  measurePerformance,
  measurePerformanceAsync,
} from './performance-monitor';