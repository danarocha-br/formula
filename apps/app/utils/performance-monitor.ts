import React from 'react';

/**
 * Enhanced performance monitoring utilities for tracking component re-renders,
 * cache operations, memory usage, and detecting performance issues across all features
 */

interface RenderMetrics {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  totalRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
}

interface CacheOperationMetrics {
  operation: string;
  feature: string;
  operationCount: number;
  totalDuration: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  successCount: number;
  failureCount: number;
  lastOperationTime: number;
}

interface MemoryMetrics {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  cacheSize: number;
  queryCount: number;
  componentCount: number;
}

interface PerformanceBenchmark {
  name: string;
  category: 'render' | 'cache' | 'memory' | 'network';
  baseline: number;
  current: number;
  threshold: number;
  regression: boolean;
  timestamp: number;
}

interface PerformanceAlert {
  type: 'excessive_renders' | 'slow_render' | 'memory_leak' | 'cache_slow' | 'cache_failure' | 'regression';
  componentName?: string;
  feature?: string;
  operation?: string;
  message: string;
  timestamp: number;
  metrics: Partial<RenderMetrics | CacheOperationMetrics | MemoryMetrics>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class PerformanceMonitor {
  private renderMetrics = new Map<string, RenderMetrics>();
  private cacheMetrics = new Map<string, CacheOperationMetrics>();
  private memoryHistory: MemoryMetrics[] = [];
  private benchmarks = new Map<string, PerformanceBenchmark>();
  private alerts: PerformanceAlert[] = [];
  private memoryTrackingInterval?: NodeJS.Timeout;

  private get isEnabled(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  }

  // Thresholds for performance alerts
  private readonly EXCESSIVE_RENDERS_THRESHOLD = 50; // renders per minute
  private readonly SLOW_RENDER_THRESHOLD = 16; // ms (60fps = 16.67ms per frame)
  private readonly SLOW_CACHE_THRESHOLD = 50; // ms for cache operations
  private readonly MEMORY_LEAK_THRESHOLD = 50 * 1024 * 1024; // 50MB increase
  private readonly REGRESSION_THRESHOLD = 1.5; // 50% performance degradation
  private readonly MAX_ALERTS = 200;
  private readonly MAX_MEMORY_HISTORY = 100;
  private readonly MEMORY_TRACKING_INTERVAL = 30000; // 30 seconds

  /**
   * Track a component render
   */
  trackRender(componentName: string, renderStartTime?: number): void {
    if (!this.isEnabled) return;

    const renderTime = renderStartTime ? performance.now() - renderStartTime : 0;
    const now = Date.now();

    const existing = this.renderMetrics.get(componentName);

    if (existing) {
      const newRenderCount = existing.renderCount + 1;
      const newTotalTime = existing.totalRenderTime + renderTime;

      this.renderMetrics.set(componentName, {
        ...existing,
        renderCount: newRenderCount,
        lastRenderTime: now,
        averageRenderTime: newTotalTime / newRenderCount,
        totalRenderTime: newTotalTime,
        maxRenderTime: Math.max(existing.maxRenderTime, renderTime),
        minRenderTime: existing.minRenderTime === 0 ? renderTime : Math.min(existing.minRenderTime, renderTime),
      });

      // Check for excessive renders (more than threshold per minute)
      const timeSinceFirstRender = now - (now - (existing.renderCount * 1000)); // Approximate
      const rendersPerMinute = (newRenderCount / Math.max(timeSinceFirstRender / 60000, 1));

      if (rendersPerMinute > this.EXCESSIVE_RENDERS_THRESHOLD) {
        this.addAlert({
          type: 'excessive_renders',
          componentName,
          message: `Component ${componentName} has rendered ${newRenderCount} times (${rendersPerMinute.toFixed(1)} renders/min)`,
          timestamp: now,
          metrics: { renderCount: newRenderCount, averageRenderTime: newTotalTime / newRenderCount },
          severity: 'high'
        });
      }

      // Check for slow renders
      if (renderTime > this.SLOW_RENDER_THRESHOLD) {
        this.addAlert({
          type: 'slow_render',
          componentName,
          message: `Component ${componentName} took ${renderTime.toFixed(2)}ms to render (threshold: ${this.SLOW_RENDER_THRESHOLD}ms)`,
          timestamp: now,
          metrics: { maxRenderTime: renderTime },
          severity: renderTime > this.SLOW_RENDER_THRESHOLD * 2 ? 'high' : 'medium'
        });
      }

      // Update benchmark for render performance
      this.updateBenchmark(`render-${componentName}`, 'render', newTotalTime / newRenderCount);
    } else {
      this.renderMetrics.set(componentName, {
        componentName,
        renderCount: 1,
        lastRenderTime: now,
        averageRenderTime: renderTime,
        totalRenderTime: renderTime,
        maxRenderTime: renderTime,
        minRenderTime: renderTime,
      });
    }
  }

  /**
   * Track cache operations across all features
   */
  trackCacheOperation(
    operation: string,
    feature: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const now = Date.now();
    const key = `${feature}-${operation}`;
    const existing = this.cacheMetrics.get(key);

    if (existing) {
      const newOperationCount = existing.operationCount + 1;
      const newTotalDuration = existing.totalDuration + duration;
      const newSuccessCount = existing.successCount + (success ? 1 : 0);
      const newFailureCount = existing.failureCount + (success ? 0 : 1);

      this.cacheMetrics.set(key, {
        ...existing,
        operationCount: newOperationCount,
        totalDuration: newTotalDuration,
        averageDuration: newTotalDuration / newOperationCount,
        maxDuration: Math.max(existing.maxDuration, duration),
        minDuration: existing.minDuration === 0 ? duration : Math.min(existing.minDuration, duration),
        successCount: newSuccessCount,
        failureCount: newFailureCount,
        lastOperationTime: now,
      });

      // Check for slow cache operations
      if (duration > this.SLOW_CACHE_THRESHOLD) {
        this.addAlert({
          type: 'cache_slow',
          feature,
          operation,
          message: `Cache operation ${operation} in ${feature} took ${duration.toFixed(2)}ms (threshold: ${this.SLOW_CACHE_THRESHOLD}ms)`,
          timestamp: now,
          metrics: { maxDuration: duration },
          severity: duration > this.SLOW_CACHE_THRESHOLD * 2 ? 'high' : 'medium'
        });
      }

      // Check for high failure rate
      const failureRate = newFailureCount / newOperationCount;
      if (failureRate > 0.1 && newOperationCount > 10) { // More than 10% failure rate with at least 10 operations
        this.addAlert({
          type: 'cache_failure',
          feature,
          operation,
          message: `Cache operation ${operation} in ${feature} has high failure rate: ${(failureRate * 100).toFixed(1)}%`,
          timestamp: now,
          metrics: { successCount: newSuccessCount, failureCount: newFailureCount },
          severity: failureRate > 0.25 ? 'critical' : 'high'
        });
      }

      // Update benchmark for cache performance
      this.updateBenchmark(`cache-${key}`, 'cache', newTotalDuration / newOperationCount);
    } else {
      this.cacheMetrics.set(key, {
        operation,
        feature,
        operationCount: 1,
        totalDuration: duration,
        averageDuration: duration,
        maxDuration: duration,
        minDuration: duration,
        successCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
        lastOperationTime: now,
      });
    }
  }

  /**
   * Track memory usage and detect potential leaks
   */
  trackMemoryUsage(cacheSize?: number, queryCount?: number, componentCount?: number): void {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Get memory info if available (Chrome/Edge)
    const memoryInfo = (performance as any).memory;
    if (!memoryInfo) return;

    const memoryMetric: MemoryMetrics = {
      timestamp: Date.now(),
      heapUsed: memoryInfo.usedJSHeapSize || 0,
      heapTotal: memoryInfo.totalJSHeapSize || 0,
      external: 0, // Not available in browser
      arrayBuffers: 0, // Not available in browser
      cacheSize: cacheSize || 0,
      queryCount: queryCount || 0,
      componentCount: componentCount || 0,
    };

    this.memoryHistory.push(memoryMetric);

    // Keep only recent memory history
    if (this.memoryHistory.length > this.MAX_MEMORY_HISTORY) {
      this.memoryHistory = this.memoryHistory.slice(-this.MAX_MEMORY_HISTORY);
    }

    // Check for memory leaks (significant increase over time)
    if (this.memoryHistory.length >= 10) {
      const recent = this.memoryHistory.slice(-5);
      const older = this.memoryHistory.slice(-10, -5);

      const recentAvg = recent.reduce((sum, m) => sum + m.heapUsed, 0) / recent.length;
      const olderAvg = older.reduce((sum, m) => sum + m.heapUsed, 0) / older.length;

      const increase = recentAvg - olderAvg;

      if (increase > this.MEMORY_LEAK_THRESHOLD) {
        this.addAlert({
          type: 'memory_leak',
          message: `Potential memory leak detected: ${(increase / 1024 / 1024).toFixed(2)}MB increase in heap usage`,
          timestamp: Date.now(),
          metrics: { heapUsed: recentAvg, heapTotal: memoryMetric.heapTotal },
          severity: increase > this.MEMORY_LEAK_THRESHOLD * 2 ? 'critical' : 'high'
        });
      }
    }

    // Update memory benchmark
    this.updateBenchmark('memory-heap-used', 'memory', memoryMetric.heapUsed);
  }

  /**
   * Update performance benchmark and detect regressions
   */
  private updateBenchmark(name: string, category: PerformanceBenchmark['category'], currentValue: number): void {
    const existing = this.benchmarks.get(name);
    const now = Date.now();

    if (existing) {
      // Only detect regression if baseline is meaningful (> 0.001) and current value is significantly higher
      const hasValidBaseline = existing.baseline > 0.001;
      const regression = hasValidBaseline && currentValue > existing.baseline * this.REGRESSION_THRESHOLD;

      this.benchmarks.set(name, {
        ...existing,
        current: currentValue,
        regression,
        timestamp: now,
      });

      // Alert on performance regression
      if (regression && !existing.regression) {
        // Calculate percentage increase safely (avoid division by zero)
        const percentageIncrease = existing.baseline > 0
          ? ((currentValue / existing.baseline - 1) * 100).toFixed(1)
          : 'N/A';

        this.addAlert({
          type: 'regression',
          message: `Performance regression detected in ${name}: ${currentValue.toFixed(2)} vs baseline ${existing.baseline.toFixed(2)} (${percentageIncrease}% increase)`,
          timestamp: now,
          metrics: { current: currentValue, baseline: existing.baseline },
          severity: currentValue > existing.baseline * 2 ? 'critical' : 'high'
        });
      }
    } else {
      // Set initial baseline
      this.benchmarks.set(name, {
        name,
        category,
        baseline: currentValue,
        current: currentValue,
        threshold: currentValue * this.REGRESSION_THRESHOLD,
        regression: false,
        timestamp: now,
      });
    }
  }

  /**
   * Start automatic memory tracking
   */
  startMemoryTracking(): void {
    if (!this.isEnabled || this.memoryTrackingInterval) return;

    this.memoryTrackingInterval = setInterval(() => {
      this.trackMemoryUsage();
    }, this.MEMORY_TRACKING_INTERVAL);
  }

  /**
   * Stop automatic memory tracking
   */
  stopMemoryTracking(): void {
    if (this.memoryTrackingInterval) {
      clearInterval(this.memoryTrackingInterval);
      this.memoryTrackingInterval = undefined;
    }
  }

  /**
   * Get render metrics for a specific component
   */
  getRenderMetrics(componentName: string): RenderMetrics | undefined {
    return this.renderMetrics.get(componentName);
  }

  /**
   * Get cache metrics for a specific operation
   */
  getCacheMetrics(feature: string, operation: string): CacheOperationMetrics | undefined {
    return this.cacheMetrics.get(`${feature}-${operation}`);
  }

  /**
   * Get all render metrics
   */
  getAllRenderMetrics(): RenderMetrics[] {
    return Array.from(this.renderMetrics.values());
  }

  /**
   * Get all cache metrics
   */
  getAllCacheMetrics(): CacheOperationMetrics[] {
    return Array.from(this.cacheMetrics.values());
  }

  /**
   * Get memory usage history
   */
  getMemoryHistory(limit = 50): MemoryMetrics[] {
    return this.memoryHistory.slice(-limit);
  }

  /**
   * Get performance benchmarks
   */
  getBenchmarks(): PerformanceBenchmark[] {
    return Array.from(this.benchmarks.values());
  }

  /**
   * Get benchmarks with regressions
   */
  getRegressions(): PerformanceBenchmark[] {
    return Array.from(this.benchmarks.values()).filter(b => b.regression);
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 10): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: PerformanceAlert['severity']): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: PerformanceAlert['type']): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  /**
   * Clear render metrics for a component
   */
  clearRenderMetrics(componentName: string): void {
    this.renderMetrics.delete(componentName);
  }

  /**
   * Clear cache metrics for a feature/operation
   */
  clearCacheMetrics(feature: string, operation?: string): void {
    if (operation) {
      this.cacheMetrics.delete(`${feature}-${operation}`);
    } else {
      // Clear all metrics for the feature
      const keysToDelete = Array.from(this.cacheMetrics.keys()).filter(key => key.startsWith(`${feature}-`));
      keysToDelete.forEach(key => this.cacheMetrics.delete(key));
    }
  }

  /**
   * Clear all metrics and history
   */
  clearAllMetrics(): void {
    this.renderMetrics.clear();
    this.cacheMetrics.clear();
    this.memoryHistory = [];
    this.benchmarks.clear();
    this.alerts = [];
  }

  /**
   * Reset benchmarks (useful for testing or after major changes)
   */
  resetBenchmarks(): void {
    this.benchmarks.clear();
  }

  /**
   * Log comprehensive performance summary to console
   */
  logSummary(): void {
    if (!this.isEnabled) return;

    console.group('🔍 Enhanced Performance Monitor Summary');

    // Render metrics summary
    const renderMetrics = this.getAllRenderMetrics();
    if (renderMetrics.length > 0) {
      console.group('🎨 Render Performance');
      renderMetrics
        .sort((a, b) => b.renderCount - a.renderCount)
        .slice(0, 10) // Top 10 most active components
        .forEach(metric => {
          const isProblematic = metric.renderCount > 20 || metric.averageRenderTime > this.SLOW_RENDER_THRESHOLD;
          const icon = isProblematic ? '⚠️' : '✅';

          console.log(
            `${icon} ${metric.componentName}: ${metric.renderCount} renders, ` +
            `avg: ${metric.averageRenderTime.toFixed(2)}ms, ` +
            `max: ${metric.maxRenderTime.toFixed(2)}ms`
          );
        });
      console.groupEnd();
    }

    // Cache metrics summary
    const cacheMetrics = this.getAllCacheMetrics();
    if (cacheMetrics.length > 0) {
      console.group('💾 Cache Performance');
      cacheMetrics
        .sort((a, b) => b.operationCount - a.operationCount)
        .slice(0, 10) // Top 10 most active operations
        .forEach(metric => {
          const failureRate = metric.failureCount / metric.operationCount;
          const isProblematic = metric.averageDuration > this.SLOW_CACHE_THRESHOLD || failureRate > 0.1;
          const icon = isProblematic ? '⚠️' : '✅';

          console.log(
            `${icon} ${metric.feature}-${metric.operation}: ${metric.operationCount} ops, ` +
            `avg: ${metric.averageDuration.toFixed(2)}ms, ` +
            `success: ${((metric.successCount / metric.operationCount) * 100).toFixed(1)}%`
          );
        });
      console.groupEnd();
    }

    // Memory usage summary
    if (this.memoryHistory.length > 0) {
      const latest = this.memoryHistory[this.memoryHistory.length - 1];
      const oldest = this.memoryHistory[0];
      const memoryIncrease = latest.heapUsed - oldest.heapUsed;

      console.group('🧠 Memory Usage');
      console.log(`Current heap: ${(latest.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Total heap: ${(latest.heapTotal / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory change: ${memoryIncrease >= 0 ? '+' : ''}${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      if (latest.cacheSize > 0) {
        console.log(`Cache size: ${latest.cacheSize} items`);
      }
      if (latest.queryCount > 0) {
        console.log(`Query count: ${latest.queryCount}`);
      }
      console.groupEnd();
    }

    // Performance regressions
    const regressions = this.getRegressions();
    if (regressions.length > 0) {
      console.group('📉 Performance Regressions');
      regressions.forEach(regression => {
        const increase = regression.baseline > 0
          ? ((regression.current / regression.baseline - 1) * 100).toFixed(1)
          : 'N/A';
        console.warn(`${regression.name}: +${increase}% (${regression.current.toFixed(2)} vs ${regression.baseline.toFixed(2)})`);
      });
      console.groupEnd();
    }

    // Recent alerts
    const recentAlerts = this.getAlerts(5);
    if (recentAlerts.length > 0) {
      console.group('🚨 Recent Alerts');
      recentAlerts.forEach(alert => {
        const severityIcon = {
          low: '🟡',
          medium: '🟠',
          high: '🔴',
          critical: '🚨'
        }[alert.severity];
        console.warn(`${severityIcon} [${alert.type}] ${alert.message}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Generate detailed performance report
   */
  generateReport(): {
    summary: {
      totalComponents: number;
      totalCacheOperations: number;
      totalAlerts: number;
      criticalAlerts: number;
      memoryUsage: number;
      regressions: number;
    };
    renderMetrics: RenderMetrics[];
    cacheMetrics: CacheOperationMetrics[];
    memoryMetrics: MemoryMetrics[];
    benchmarks: PerformanceBenchmark[];
    alerts: PerformanceAlert[];
  } {
    const criticalAlerts = this.getAlertsBySeverity('critical').length;
    const latestMemory = this.memoryHistory[this.memoryHistory.length - 1];

    return {
      summary: {
        totalComponents: this.renderMetrics.size,
        totalCacheOperations: Array.from(this.cacheMetrics.values()).reduce((sum, m) => sum + m.operationCount, 0),
        totalAlerts: this.alerts.length,
        criticalAlerts,
        memoryUsage: latestMemory?.heapUsed || 0,
        regressions: this.getRegressions().length,
      },
      renderMetrics: this.getAllRenderMetrics(),
      cacheMetrics: this.getAllCacheMetrics(),
      memoryMetrics: this.getMemoryHistory(),
      benchmarks: this.getBenchmarks(),
      alerts: this.alerts,
    };
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);

    // Keep only the most recent alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }

    // Log alert in development with severity-based styling
    if (this.isEnabled) {
      const severityIcon = {
        low: '🟡',
        medium: '🟠',
        high: '🔴',
        critical: '🚨'
      }[alert.severity];

      const logMethod = alert.severity === 'critical' ? console.error : console.warn;
      logMethod(`${severityIcon} Performance Alert [${alert.type}]: ${alert.message}`);
    }
  }

  /**
   * Initialize performance monitoring with automatic memory tracking
   */
  initialize(): void {
    if (!this.isEnabled) return;

    this.startMemoryTracking();

    // Log initialization
    console.log('🔍 Enhanced Performance Monitor initialized');
  }

  /**
   * Cleanup performance monitoring
   */
  cleanup(): void {
    this.stopMemoryTracking();
    this.clearAllMetrics();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook to track component renders
 */
export function useRenderTracker(componentName: string): void {
  const renderStartTime = performance.now();

  React.useEffect(() => {
    performanceMonitor.trackRender(componentName, renderStartTime);
  });
}

/**
 * React hook to track cache operations in components
 */
export function useCacheTracker(feature: string) {
  return React.useCallback((operation: string, duration: number, success: boolean, metadata?: Record<string, any>) => {
    performanceMonitor.trackCacheOperation(operation, feature, duration, success, metadata);
  }, [feature]);
}

/**
 * Higher-order component to automatically track renders
 */
export function withRenderTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const TrackedComponent = (props: P) => {
    useRenderTracker(displayName);
    return React.createElement(WrappedComponent, props);
  };

  TrackedComponent.displayName = `withRenderTracking(${displayName})`;
  return TrackedComponent;
}

/**
 * Higher-order component to track both renders and cache operations
 */
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: string,
  componentName?: string
): React.ComponentType<P> {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const TrackedComponent = (props: P) => {
    useRenderTracker(displayName);
    const trackCache = useCacheTracker(feature);

    // Pass cache tracker to component via props if it accepts it
    const enhancedProps = {
      ...props,
      trackCacheOperation: trackCache,
    } as P;

    return React.createElement(WrappedComponent, enhancedProps);
  };

  TrackedComponent.displayName = `withPerformanceTracking(${displayName})`;
  return TrackedComponent;
}

/**
 * Utility function to measure and track function execution time
 */
export function measurePerformance<T>(
  fn: () => T,
  operation: string,
  feature: string
): T {
  const startTime = performance.now();
  let success = true;
  let result: T;

  try {
    result = fn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = performance.now() - startTime;
    performanceMonitor.trackCacheOperation(operation, feature, duration, success);
  }
}

/**
 * Async version of measurePerformance
 */
export async function measurePerformanceAsync<T>(
  fn: () => Promise<T>,
  operation: string,
  feature: string
): Promise<T> {
  const startTime = performance.now();
  let success = true;
  let result: T;

  try {
    result = await fn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = performance.now() - startTime;
    performanceMonitor.trackCacheOperation(operation, feature, duration, success);
  }
}

// Initialize performance monitoring and auto-log summary
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && process.env.VITEST !== 'true') {
  // Initialize the performance monitor
  performanceMonitor.initialize();

  // Auto-log summary every 60 seconds in development
  setInterval(() => {
    performanceMonitor.logSummary();
  }, 60000);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.cleanup();
  });
}