/**
 * Equipment Cost Table Performance Monitor
 *
 * Specialized performance monitoring for the equipment cost table view
 * to track render frequency, memory usage, state updates, and detect
 * infinite loop scenarios as specified in requirements 3.3 and 4.2
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { performanceMonitor } from './performance-monitor';

interface EquipmentPerformanceMetrics {
  componentName: string;
  renderCount: number;
  stateUpdateCount: number;
  memoryUsage: number;
  lastRenderTime: number;
  averageRenderInterval: number;
  infiniteLoopDetected: boolean;
  performanceDegradation: boolean;
  alertLevel: 'none' | 'warning' | 'critical';
}

interface StateUpdateMetrics {
  operation: string;
  frequency: number;
  lastUpdate: number;
  consecutiveUpdates: number;
  isExcessive: boolean;
}

interface PerformanceAlert {
  type: 'render_frequency' | 'memory_leak' | 'infinite_loop' | 'state_thrashing' | 'performance_degradation';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  metrics: Partial<EquipmentPerformanceMetrics>;
  recommendations: string[];
}

class EquipmentPerformanceMonitor {
  private componentMetrics = new Map<string, EquipmentPerformanceMetrics>();
  private stateUpdateMetrics = new Map<string, StateUpdateMetrics>();
  private alerts: PerformanceAlert[] = [];
  private memoryBaseline: number = 0;
  private isMonitoring: boolean = false;

  // Performance thresholds based on requirements
  private readonly RENDER_FREQUENCY_THRESHOLD = 30; // renders per second
  private readonly MEMORY_INCREASE_THRESHOLD = 10 * 1024 * 1024; // 10MB
  private readonly INFINITE_LOOP_RENDER_THRESHOLD = 100; // renders in 5 seconds
  private readonly STATE_UPDATE_THRESHOLD = 50; // state updates per second
  private readonly PERFORMANCE_DEGRADATION_THRESHOLD = 2.0; // 2x slower than baseline
  private readonly MAX_ALERTS = 50;

  /**
   * Check if monitoring is enabled
   */
  private get isEnabled(): boolean {
    // Only enable in test environment or when explicitly needed for debugging
    return process.env.NODE_ENV === 'test' || process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
  }

  /**
   * Initialize performance monitoring for equipment cost table
   */
  initialize(): void {
    if (this.isMonitoring || !this.isEnabled) return;

    this.isMonitoring = true;
    this.memoryBaseline = this.getCurrentMemoryUsage();

    // Start periodic memory monitoring
    this.startMemoryMonitoring();

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Equipment Performance Monitor initialized');
    }
  }

  /**
   * Track component render with infinite loop detection
   */
  trackRender(componentName: string): void {
    if (!this.isMonitoring || !this.isEnabled) return;

    const now = performance.now();
    const existing = this.componentMetrics.get(componentName);

    if (existing) {
      const timeSinceLastRender = now - existing.lastRenderTime;
      const newRenderCount = existing.renderCount + 1;

      // Calculate average render interval
      const newAverageInterval = existing.averageRenderInterval
        ? (existing.averageRenderInterval + timeSinceLastRender) / 2
        : timeSinceLastRender;

      // Detect infinite loop scenario
      const isInfiniteLoop = this.detectInfiniteLoop(componentName, newRenderCount, timeSinceLastRender);

      // Detect performance degradation
      const isDegraded = this.detectPerformanceDegradation(componentName, newAverageInterval);

      const updatedMetrics: EquipmentPerformanceMetrics = {
        ...existing,
        renderCount: newRenderCount,
        lastRenderTime: now,
        averageRenderInterval: newAverageInterval,
        infiniteLoopDetected: isInfiniteLoop,
        performanceDegradation: isDegraded,
        alertLevel: this.calculateAlertLevel(isInfiniteLoop, isDegraded, newRenderCount)
      };

      this.componentMetrics.set(componentName, updatedMetrics);

      // Generate alerts if needed
      this.checkForAlerts(componentName, updatedMetrics);

      // Track with global performance monitor
      performanceMonitor.trackRender(componentName, now);
    } else {
      // Initialize metrics for new component
      const initialMetrics: EquipmentPerformanceMetrics = {
        componentName,
        renderCount: 1,
        stateUpdateCount: 0,
        memoryUsage: this.getCurrentMemoryUsage(),
        lastRenderTime: now,
        averageRenderInterval: 0,
        infiniteLoopDetected: false,
        performanceDegradation: false,
        alertLevel: 'none'
      };

      this.componentMetrics.set(componentName, initialMetrics);
      performanceMonitor.trackRender(componentName, now);
    }
  }

  /**
   * Track state updates to detect thrashing
   */
  trackStateUpdate(componentName: string, operation: string): void {
    if (!this.isMonitoring || !this.isEnabled) return;

    const now = performance.now();
    const key = `${componentName}-${operation}`;
    const existing = this.stateUpdateMetrics.get(key);

    if (existing) {
      const timeSinceLastUpdate = now - existing.lastUpdate;
      const isConsecutive = timeSinceLastUpdate < 50; // Less than 50ms apart

      const updatedMetrics: StateUpdateMetrics = {
        ...existing,
        frequency: existing.frequency + 1,
        lastUpdate: now,
        consecutiveUpdates: isConsecutive ? existing.consecutiveUpdates + 1 : 0,
        isExcessive: existing.consecutiveUpdates > 10 || existing.frequency > this.STATE_UPDATE_THRESHOLD
      };

      this.stateUpdateMetrics.set(key, updatedMetrics);

      // Update component metrics
      let componentMetrics = this.componentMetrics.get(componentName);
      if (componentMetrics) {
        componentMetrics.stateUpdateCount += 1;
        this.componentMetrics.set(componentName, componentMetrics);
      } else {
        // Create component metrics if it doesn't exist
        componentMetrics = {
          componentName,
          renderCount: 0,
          stateUpdateCount: 1,
          memoryUsage: this.getCurrentMemoryUsage(),
          lastRenderTime: now,
          averageRenderInterval: 0,
          infiniteLoopDetected: false,
          performanceDegradation: false,
          alertLevel: 'none'
        };
        this.componentMetrics.set(componentName, componentMetrics);
      }

      // Check for state thrashing
      if (updatedMetrics.isExcessive) {
        this.addAlert({
          type: 'state_thrashing',
          message: `Excessive state updates detected in ${componentName} for operation ${operation}`,
          severity: updatedMetrics.consecutiveUpdates > 20 ? 'critical' : 'high',
          timestamp: now,
          metrics: componentMetrics || {},
          recommendations: [
            'Consider batching state updates',
            'Use React.startTransition for non-urgent updates',
            'Implement debouncing for rapid state changes',
            'Review component dependencies and memoization'
          ]
        });
      }
    } else {
      this.stateUpdateMetrics.set(key, {
        operation,
        frequency: 1,
        lastUpdate: now,
        consecutiveUpdates: 0,
        isExcessive: false
      });

      // Update component metrics for new state update
      let componentMetrics = this.componentMetrics.get(componentName);
      if (componentMetrics) {
        componentMetrics.stateUpdateCount += 1;
        this.componentMetrics.set(componentName, componentMetrics);
      } else {
        // Create component metrics if it doesn't exist
        componentMetrics = {
          componentName,
          renderCount: 0,
          stateUpdateCount: 1,
          memoryUsage: this.getCurrentMemoryUsage(),
          lastRenderTime: now,
          averageRenderInterval: 0,
          infiniteLoopDetected: false,
          performanceDegradation: false,
          alertLevel: 'none'
        };
        this.componentMetrics.set(componentName, componentMetrics);
      }
    }
  }

  /**
   * Track memory usage during state updates
   */
  trackMemoryUsage(componentName: string): void {
    if (!this.isMonitoring || !this.isEnabled) return;

    const currentMemory = this.getCurrentMemoryUsage();
    const memoryIncrease = currentMemory - this.memoryBaseline;

    let componentMetrics = this.componentMetrics.get(componentName);
    if (componentMetrics) {
      componentMetrics.memoryUsage = currentMemory;
      this.componentMetrics.set(componentName, componentMetrics);
    } else {
      // Create component metrics if it doesn't exist
      componentMetrics = {
        componentName,
        renderCount: 0,
        stateUpdateCount: 0,
        memoryUsage: currentMemory,
        lastRenderTime: performance.now(),
        averageRenderInterval: 0,
        infiniteLoopDetected: false,
        performanceDegradation: false,
        alertLevel: 'none'
      };
      this.componentMetrics.set(componentName, componentMetrics);
    }

    // Check for memory leaks
    if (memoryIncrease > this.MEMORY_INCREASE_THRESHOLD) {
      this.addAlert({
        type: 'memory_leak',
        message: `Potential memory leak detected in ${componentName}: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`,
        severity: memoryIncrease > this.MEMORY_INCREASE_THRESHOLD * 2 ? 'critical' : 'high',
        timestamp: performance.now(),
        metrics: componentMetrics,
        recommendations: [
          'Check for memory leaks in event listeners',
          'Ensure proper cleanup in useEffect hooks',
          'Review large object references in state',
          'Consider implementing component unmounting cleanup'
        ]
      });
    }

    // Track with global performance monitor
    performanceMonitor.trackMemoryUsage(currentMemory);
  }

  /**
   * Detect infinite loop scenarios
   */
  private detectInfiniteLoop(componentName: string, renderCount: number, timeSinceLastRender: number): boolean {
    // Check if component has rendered too many times
    if (renderCount >= this.INFINITE_LOOP_RENDER_THRESHOLD) {
      // If we've had 100+ renders and the time between renders is very small
      if (timeSinceLastRender < 10) { // Less than 10ms between renders
        return true;
      }
    }

    return false;
  }

  /**
   * Detect performance degradation
   */
  private detectPerformanceDegradation(componentName: string, currentInterval: number): boolean {
    // Compare against baseline performance (first 10 renders)
    const existing = this.componentMetrics.get(componentName);
    if (!existing || existing.renderCount < 10) return false;

    // If current interval is significantly higher than average, it's degraded
    return currentInterval > existing.averageRenderInterval * this.PERFORMANCE_DEGRADATION_THRESHOLD;
  }

  /**
   * Calculate alert level based on metrics
   */
  private calculateAlertLevel(
    infiniteLoop: boolean,
    degraded: boolean,
    renderCount: number
  ): 'none' | 'warning' | 'critical' {
    if (infiniteLoop) return 'critical';
    if (degraded && renderCount > 50) return 'critical';
    if (degraded || renderCount > 30) return 'warning';
    return 'none';
  }

  /**
   * Check for performance alerts
   */
  private checkForAlerts(componentName: string, metrics: EquipmentPerformanceMetrics): void {
    const now = performance.now();

    // Infinite loop alert
    if (metrics.infiniteLoopDetected) {
      this.addAlert({
        type: 'infinite_loop',
        message: `Infinite loop detected in ${componentName}: ${metrics.renderCount} renders`,
        severity: 'critical',
        timestamp: now,
        metrics,
        recommendations: [
          'Check for circular dependencies in useEffect hooks',
          'Review state update logic for infinite loops',
          'Ensure proper dependency arrays in useMemo and useCallback',
          'Consider implementing circuit breaker pattern'
        ]
      });
    }

    // Render frequency alert
    const renderFrequency = 1000 / metrics.averageRenderInterval; // renders per second
    if (renderFrequency > this.RENDER_FREQUENCY_THRESHOLD) {
      this.addAlert({
        type: 'render_frequency',
        message: `High render frequency in ${componentName}: ${renderFrequency.toFixed(1)} renders/sec`,
        severity: renderFrequency > this.RENDER_FREQUENCY_THRESHOLD * 2 ? 'critical' : 'high',
        timestamp: now,
        metrics,
        recommendations: [
          'Implement proper memoization with useMemo and useCallback',
          'Review component dependencies and props',
          'Consider splitting component into smaller parts',
          'Use React.memo for expensive components'
        ]
      });
    }

    // Performance degradation alert
    if (metrics.performanceDegradation) {
      this.addAlert({
        type: 'performance_degradation',
        message: `Performance degradation detected in ${componentName}`,
        severity: 'medium',
        timestamp: now,
        metrics,
        recommendations: [
          'Profile component to identify bottlenecks',
          'Review recent changes that may have impacted performance',
          'Consider optimizing expensive operations',
          'Check for memory leaks or excessive object creation'
        ]
      });
    }
  }

  /**
   * Add performance alert
   */
  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);

    // Keep only recent alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }

    // Log alert in development
    if (process.env.NODE_ENV === 'development') {
      const severityIcon = {
        low: '🟡',
        medium: '🟠',
        high: '🔴',
        critical: '🚨'
      }[alert.severity];

      console.warn(`${severityIcon} Equipment Performance Alert [${alert.type}]: ${alert.message}`);
      if (alert.recommendations.length > 0) {
        console.log('💡 Recommendations:', alert.recommendations);
      }
    }
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  /**
   * Start periodic memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      const currentMemory = this.getCurrentMemoryUsage();
      const memoryIncrease = currentMemory - this.memoryBaseline;

      // Update baseline periodically to account for normal growth
      if (memoryIncrease > this.MEMORY_INCREASE_THRESHOLD * 3) {
        this.memoryBaseline = currentMemory;
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get performance metrics for a component
   */
  getMetrics(componentName: string): EquipmentPerformanceMetrics | undefined {
    return this.componentMetrics.get(componentName);
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics(): EquipmentPerformanceMetrics[] {
    return Array.from(this.componentMetrics.values());
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
   * Get critical alerts
   */
  getCriticalAlerts(): PerformanceAlert[] {
    return this.getAlertsBySeverity('critical');
  }

  /**
   * Clear metrics for a component
   */
  clearMetrics(componentName: string): void {
    this.componentMetrics.delete(componentName);

    // Clear related state update metrics
    const keysToDelete = Array.from(this.stateUpdateMetrics.keys())
      .filter(key => key.startsWith(`${componentName}-`));
    keysToDelete.forEach(key => this.stateUpdateMetrics.delete(key));
  }

  /**
   * Reset all metrics and alerts
   */
  reset(): void {
    this.componentMetrics.clear();
    this.stateUpdateMetrics.clear();
    this.alerts = [];
    this.memoryBaseline = this.getCurrentMemoryUsage();
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: {
      totalComponents: number;
      totalRenders: number;
      totalStateUpdates: number;
      criticalAlerts: number;
      memoryUsage: number;
      componentsWithIssues: number;
    };
    metrics: EquipmentPerformanceMetrics[];
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const metrics = this.getAllMetrics();
    const criticalAlerts = this.getCriticalAlerts();
    const componentsWithIssues = metrics.filter(m =>
      m.infiniteLoopDetected || m.performanceDegradation || m.alertLevel !== 'none'
    ).length;

    const recommendations = [
      ...new Set(
        this.alerts
          .slice(-10) // Recent alerts only
          .flatMap(alert => alert.recommendations)
      )
    ];

    return {
      summary: {
        totalComponents: this.componentMetrics.size,
        totalRenders: metrics.reduce((sum, m) => sum + m.renderCount, 0),
        totalStateUpdates: metrics.reduce((sum, m) => sum + m.stateUpdateCount, 0),
        criticalAlerts: criticalAlerts.length,
        memoryUsage: this.getCurrentMemoryUsage(),
        componentsWithIssues
      },
      metrics,
      alerts: this.getAlerts(20),
      recommendations
    };
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    if (process.env.NODE_ENV !== 'development') return;

    const report = this.generateReport();

    console.group('🔍 Equipment Performance Monitor Summary');

    console.log('📊 Summary:', report.summary);

    if (report.metrics.length > 0) {
      console.group('📈 Component Metrics');
      report.metrics
        .sort((a, b) => b.renderCount - a.renderCount)
        .forEach(metric => {
          const icon = metric.alertLevel === 'critical' ? '🚨' :
                      metric.alertLevel === 'warning' ? '⚠️' : '✅';
          console.log(
            `${icon} ${metric.componentName}: ${metric.renderCount} renders, ` +
            `${metric.stateUpdateCount} state updates, ` +
            `${(metric.memoryUsage / 1024 / 1024).toFixed(2)}MB`
          );
        });
      console.groupEnd();
    }

    if (report.alerts.length > 0) {
      console.group('🚨 Recent Alerts');
      report.alerts.slice(-5).forEach(alert => {
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

    if (report.recommendations.length > 0) {
      console.group('💡 Recommendations');
      report.recommendations.slice(0, 5).forEach(rec => {
        console.log(`• ${rec}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Cleanup monitoring
   */
  cleanup(): void {
    this.isMonitoring = false;
    this.reset();
  }
}

// Singleton instance
export const equipmentPerformanceMonitor = new EquipmentPerformanceMonitor();

/**
 * React hook for equipment performance monitoring
 */
export function useEquipmentPerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);

  // Track renders without causing infinite loops
  const trackRender = useCallback(() => {
    renderCountRef.current += 1;
    equipmentPerformanceMonitor.trackRender(componentName);
  }, [componentName]);

  // Call trackRender on every render but don't update state
  trackRender();

  // Get metrics function instead of storing in state
  const getMetrics = useCallback(() => {
    return equipmentPerformanceMonitor.getMetrics(componentName);
  }, [componentName]);

  // Track state updates
  const trackStateUpdate = useCallback((operation: string) => {
    equipmentPerformanceMonitor.trackStateUpdate(componentName, operation);
  }, [componentName]);

  // Track memory usage
  const trackMemoryUsage = useCallback(() => {
    equipmentPerformanceMonitor.trackMemoryUsage(componentName);
  }, [componentName]);

  // Initialize monitoring on mount
  useEffect(() => {
    equipmentPerformanceMonitor.initialize();

    return () => {
      // Cleanup on unmount
      equipmentPerformanceMonitor.clearMetrics(componentName);
    };
  }, [componentName]);

  return {
    getMetrics,
    trackStateUpdate,
    trackMemoryUsage,
    renderCount: renderCountRef.current
  };
}

/**
 * Higher-order component for automatic performance monitoring
 */
export function withEquipmentPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const MonitoredComponent = (props: P) => {
    const { trackStateUpdate, trackMemoryUsage } = useEquipmentPerformanceMonitor(displayName);

    // Pass monitoring functions to component if it accepts them
    const enhancedProps = {
      ...props,
      trackStateUpdate,
      trackMemoryUsage,
    } as P;

    return React.createElement(WrappedComponent, enhancedProps);
  };

  MonitoredComponent.displayName = `withEquipmentPerformanceMonitoring(${displayName})`;
  return MonitoredComponent;
}

// Initialize monitoring only when explicitly enabled
if (typeof window !== 'undefined' && process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
  equipmentPerformanceMonitor.initialize();

  // Auto-log summary every 2 minutes when monitoring is enabled
  setInterval(() => {
    equipmentPerformanceMonitor.logSummary();
  }, 120000);
}