import React from 'react';

/**
 * Performance monitoring utilities for tracking component re-renders and detecting performance issues
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

interface PerformanceAlert {
  type: 'excessive_renders' | 'slow_render' | 'memory_leak';
  componentName: string;
  message: string;
  timestamp: number;
  metrics: Partial<RenderMetrics>;
}

class PerformanceMonitor {
  private metrics = new Map<string, RenderMetrics>();
  private alerts: PerformanceAlert[] = [];

  private get isEnabled(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  }

  // Thresholds for performance alerts
  private readonly EXCESSIVE_RENDERS_THRESHOLD = 50; // renders per minute
  private readonly SLOW_RENDER_THRESHOLD = 16; // ms (60fps = 16.67ms per frame)
  private readonly MAX_ALERTS = 100;

  /**
   * Track a component render
   */
  trackRender(componentName: string, renderStartTime?: number): void {
    if (!this.isEnabled) return;

    const renderTime = renderStartTime ? performance.now() - renderStartTime : 0;
    const now = Date.now();

    const existing = this.metrics.get(componentName);

    if (existing) {
      const newRenderCount = existing.renderCount + 1;
      const newTotalTime = existing.totalRenderTime + renderTime;

      this.metrics.set(componentName, {
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
          metrics: { renderCount: newRenderCount, averageRenderTime: newTotalTime / newRenderCount }
        });
      }

      // Check for slow renders
      if (renderTime > this.SLOW_RENDER_THRESHOLD) {
        this.addAlert({
          type: 'slow_render',
          componentName,
          message: `Component ${componentName} took ${renderTime.toFixed(2)}ms to render (threshold: ${this.SLOW_RENDER_THRESHOLD}ms)`,
          timestamp: now,
          metrics: { maxRenderTime: renderTime }
        });
      }
    } else {
      this.metrics.set(componentName, {
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
   * Get metrics for a specific component
   */
  getMetrics(componentName: string): RenderMetrics | undefined {
    return this.metrics.get(componentName);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): RenderMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 10): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear metrics for a component
   */
  clearMetrics(componentName: string): void {
    this.metrics.delete(componentName);
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): void {
    this.metrics.clear();
    this.alerts = [];
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    if (!this.isEnabled) return;

    const metrics = this.getAllMetrics();
    if (metrics.length === 0) return;

    console.group('🔍 Performance Monitor Summary');

    metrics
      .sort((a, b) => b.renderCount - a.renderCount)
      .forEach(metric => {
        const isProblematic = metric.renderCount > 20 || metric.averageRenderTime > this.SLOW_RENDER_THRESHOLD;
        const icon = isProblematic ? '⚠️' : '✅';

        console.log(
          `${icon} ${metric.componentName}: ${metric.renderCount} renders, ` +
          `avg: ${metric.averageRenderTime.toFixed(2)}ms, ` +
          `max: ${metric.maxRenderTime.toFixed(2)}ms`
        );
      });

    if (this.alerts.length > 0) {
      console.group('🚨 Recent Alerts');
      this.getAlerts(5).forEach(alert => {
        console.warn(`[${alert.type}] ${alert.message}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);

    // Keep only the most recent alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }

    // Log alert in development
    if (this.isEnabled) {
      console.warn(`🚨 Performance Alert [${alert.type}]: ${alert.message}`);
    }
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

// Auto-log summary every 30 seconds in development (but not in tests)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && process.env.VITEST !== 'true') {
  setInterval(() => {
    performanceMonitor.logSummary();
  }, 30000);
}