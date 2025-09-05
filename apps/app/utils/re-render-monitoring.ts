/**
 * Re-render frequency monitoring utilities for expense features
 * Tracks component re-render patterns and detects excessive re-rendering
 */

import { useRef, useEffect, useCallback } from 'react';
import { performanceMonitor } from './performance-monitor';

interface RenderFrequencyMetrics {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  renderTimes: number[];
  averageInterval: number;
  maxInterval: number;
  minInterval: number;
  rendersPerSecond: number;
  isExcessive: boolean;
}

interface RenderPattern {
  componentName: string;
  pattern: 'stable' | 'burst' | 'excessive' | 'irregular';
  confidence: number;
  recommendation: string;
}

class RenderFrequencyMonitor {
  private renderMetrics = new Map<string, RenderFrequencyMetrics>();
  private readonly MAX_RENDER_HISTORY = 50;
  private readonly EXCESSIVE_RENDERS_THRESHOLD = 30; // renders per second
  private readonly BURST_THRESHOLD = 10; // renders in 100ms
  private readonly MONITORING_WINDOW = 5000; // 5 seconds

  /**
   * Track a component render and analyze frequency
   */
  trackRender(componentName: string): RenderFrequencyMetrics {
    const now = performance.now();
    const existing = this.renderMetrics.get(componentName);

    if (!existing) {
      const metrics: RenderFrequencyMetrics = {
        componentName,
        renderCount: 1,
        lastRenderTime: now,
        renderTimes: [now],
        averageInterval: 0,
        maxInterval: 0,
        minInterval: 0,
        rendersPerSecond: 0,
        isExcessive: false,
      };

      this.renderMetrics.set(componentName, metrics);
      return metrics;
    }

    // Update render times
    const newRenderTimes = [...existing.renderTimes, now];
    if (newRenderTimes.length > this.MAX_RENDER_HISTORY) {
      newRenderTimes.shift();
    }

    // Calculate intervals
    const intervals = newRenderTimes.slice(1).map((time, index) =>
      time - newRenderTimes[index]
    );

    const averageInterval = intervals.length > 0
      ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      : 0;

    const maxInterval = intervals.length > 0 ? Math.max(...intervals) : 0;
    const minInterval = intervals.length > 0 ? Math.min(...intervals) : 0;

    // Calculate renders per second over monitoring window
    const recentRenders = newRenderTimes.filter(time =>
      now - time <= this.MONITORING_WINDOW
    );
    const rendersPerSecond = recentRenders.length / (this.MONITORING_WINDOW / 1000);

    // Check for excessive rendering
    const isExcessive = rendersPerSecond > this.EXCESSIVE_RENDERS_THRESHOLD;

    const updatedMetrics: RenderFrequencyMetrics = {
      componentName,
      renderCount: existing.renderCount + 1,
      lastRenderTime: now,
      renderTimes: newRenderTimes,
      averageInterval,
      maxInterval,
      minInterval,
      rendersPerSecond,
      isExcessive,
    };

    this.renderMetrics.set(componentName, updatedMetrics);

    // Alert on excessive rendering
    if (isExcessive && !existing.isExcessive) {
      console.warn(
        `🚨 Excessive re-rendering detected in ${componentName}: ` +
        `${rendersPerSecond.toFixed(1)} renders/second (threshold: ${this.EXCESSIVE_RENDERS_THRESHOLD})`
      );

      // Also track with performance monitor
      performanceMonitor.trackRender(componentName, 0);
    }

    // Check for burst rendering
    const recentBurst = newRenderTimes.filter(time => now - time <= 100);
    if (recentBurst.length >= this.BURST_THRESHOLD) {
      console.warn(
        `⚡ Render burst detected in ${componentName}: ` +
        `${recentBurst.length} renders in 100ms`
      );
    }

    return updatedMetrics;
  }

  /**
   * Analyze render patterns for a component
   */
  analyzeRenderPattern(componentName: string): RenderPattern | null {
    const metrics = this.renderMetrics.get(componentName);
    if (!metrics || metrics.renderTimes.length < 5) {
      return null;
    }

    const { renderTimes, averageInterval, rendersPerSecond } = metrics;

    // Calculate variance in render intervals
    const intervals = renderTimes.slice(1).map((time, index) =>
      time - renderTimes[index]
    );

    const variance = intervals.length > 1
      ? intervals.reduce((sum, interval) => {
          const diff = interval - averageInterval;
          return sum + diff * diff;
        }, 0) / intervals.length
      : 0;

    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = averageInterval > 0
      ? standardDeviation / averageInterval
      : 0;

    // Determine pattern
    let pattern: RenderPattern['pattern'];
    let confidence: number;
    let recommendation: string;

    if (rendersPerSecond > this.EXCESSIVE_RENDERS_THRESHOLD) {
      pattern = 'excessive';
      confidence = Math.min(rendersPerSecond / this.EXCESSIVE_RENDERS_THRESHOLD, 2);
      recommendation = 'Optimize component to reduce re-renders. Check dependencies and memoization.';
    } else if (coefficientOfVariation > 1.5) {
      pattern = 'irregular';
      confidence = Math.min(coefficientOfVariation / 1.5, 2);
      recommendation = 'Render timing is irregular. Check for conditional rendering or async state updates.';
    } else if (rendersPerSecond > 5) {
      pattern = 'burst';
      confidence = rendersPerSecond / 10;
      recommendation = 'Component renders in bursts. Consider debouncing state updates.';
    } else {
      pattern = 'stable';
      confidence = 1 - coefficientOfVariation;
      recommendation = 'Render pattern is stable and healthy.';
    }

    return {
      componentName,
      pattern,
      confidence: Math.min(confidence, 1),
      recommendation,
    };
  }

  /**
   * Get render metrics for a component
   */
  getMetrics(componentName: string): RenderFrequencyMetrics | undefined {
    return this.renderMetrics.get(componentName);
  }

  /**
   * Get all render metrics
   */
  getAllMetrics(): RenderFrequencyMetrics[] {
    return Array.from(this.renderMetrics.values());
  }

  /**
   * Get components with excessive rendering
   */
  getExcessiveComponents(): RenderFrequencyMetrics[] {
    return Array.from(this.renderMetrics.values()).filter(m => m.isExcessive);
  }

  /**
   * Clear metrics for a component
   */
  clearMetrics(componentName: string): void {
    this.renderMetrics.delete(componentName);
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): void {
    this.renderMetrics.clear();
  }

  /**
   * Generate render frequency report
   */
  generateReport(): {
    summary: {
      totalComponents: number;
      excessiveComponents: number;
      averageRendersPerSecond: number;
      totalRenders: number;
    };
    components: Array<RenderFrequencyMetrics & { pattern?: RenderPattern }>;
  } {
    const allMetrics = this.getAllMetrics();
    const excessiveComponents = this.getExcessiveComponents();

    const totalRenders = allMetrics.reduce((sum, m) => sum + m.renderCount, 0);
    const averageRendersPerSecond = allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + m.rendersPerSecond, 0) / allMetrics.length
      : 0;

    const components = allMetrics.map(metrics => ({
      ...metrics,
      pattern: this.analyzeRenderPattern(metrics.componentName) || undefined,
    }));

    return {
      summary: {
        totalComponents: allMetrics.length,
        excessiveComponents: excessiveComponents.length,
        averageRendersPerSecond,
        totalRenders,
      },
      components,
    };
  }
}

// Singleton instance
export const renderFrequencyMonitor = new RenderFrequencyMonitor();

/**
 * Hook to monitor component re-render frequency
 */
export function useRenderFrequencyMonitor(componentName: string): {
  metrics: RenderFrequencyMetrics | undefined;
  pattern: RenderPattern | null;
  isExcessive: boolean;
} {
  const metricsRef = useRef<RenderFrequencyMetrics>();
  const patternRef = useRef<RenderPattern | null>(null);

  // Track this render
  useEffect(() => {
    metricsRef.current = renderFrequencyMonitor.trackRender(componentName);
  });

  // Analyze pattern periodically
  useEffect(() => {
    const interval = setInterval(() => {
      patternRef.current = renderFrequencyMonitor.analyzeRenderPattern(componentName);
    }, 2000);

    return () => clearInterval(interval);
  }, [componentName]);

  return {
    metrics: metricsRef.current,
    pattern: patternRef.current,
    isExcessive: metricsRef.current?.isExcessive || false,
  };
}

/**
 * Hook to detect and prevent render loops
 */
export function useRenderLoopDetection(
  componentName: string,
  dependencies: React.DependencyList,
  maxRendersPerSecond = 20
): {
  shouldRender: boolean;
  renderCount: number;
  warning: string | null;
} {
  const renderCountRef = useRef(0);
  const lastResetRef = useRef(Date.now());
  const warningRef = useRef<string | null>(null);

  // Reset counter every second
  const now = Date.now();
  if (now - lastResetRef.current >= 1000) {
    renderCountRef.current = 0;
    lastResetRef.current = now;
    warningRef.current = null;
  }

  renderCountRef.current += 1;

  // Check for excessive renders
  const shouldRender = renderCountRef.current <= maxRendersPerSecond;

  if (!shouldRender && !warningRef.current) {
    warningRef.current = `Render loop detected in ${componentName}: ${renderCountRef.current} renders/second`;
    console.error(warningRef.current);
  }

  // Track with render frequency monitor
  useEffect(() => {
    renderFrequencyMonitor.trackRender(componentName);
  });

  return {
    shouldRender,
    renderCount: renderCountRef.current,
    warning: warningRef.current,
  };
}

/**
 * Higher-order component to add render frequency monitoring
 */
export function withRenderFrequencyMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const MonitoredComponent = (props: P) => {
    const { isExcessive, pattern } = useRenderFrequencyMonitor(displayName);

    // Log pattern changes in development
    useEffect(() => {
      if (process.env.NODE_ENV === 'development' && pattern) {
        if (pattern.pattern !== 'stable') {
          console.log(`🔍 Render pattern for ${displayName}:`, pattern);
        }
      }
    }, [pattern?.pattern, pattern?.confidence]);

    // Warn about excessive rendering
    useEffect(() => {
      if (isExcessive) {
        console.warn(`⚠️ Component ${displayName} is re-rendering excessively`);
      }
    }, [isExcessive]);

    return React.createElement(WrappedComponent, props);
  };

  MonitoredComponent.displayName = `withRenderFrequencyMonitoring(${displayName})`;
  return MonitoredComponent;
}

/**
 * Utility to create render-optimized components for expense features
 */
export function createRenderOptimizedComponent<P extends object>(
  component: React.ComponentType<P>,
  options: {
    componentName?: string;
    maxRendersPerSecond?: number;
    enablePatternAnalysis?: boolean;
  } = {}
): React.ComponentType<P> {
  const {
    componentName,
    maxRendersPerSecond = 20,
    enablePatternAnalysis = true,
  } = options;

  const displayName = componentName || component.displayName || component.name || 'Component';

  const OptimizedComponent = React.memo((props: P) => {
    const { shouldRender, warning } = useRenderLoopDetection(
      displayName,
      Object.values(props as any),
      maxRendersPerSecond
    );

    if (enablePatternAnalysis) {
      useRenderFrequencyMonitor(displayName);
    }

    // Block rendering if loop detected
    if (!shouldRender) {
      console.error(`🚫 Blocking render for ${displayName} due to excessive re-rendering`);
      return null;
    }

    if (warning) {
      console.warn(warning);
    }

    return React.createElement(component, props);
  });

  OptimizedComponent.displayName = `RenderOptimized(${displayName})`;
  return OptimizedComponent;
}