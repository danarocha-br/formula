/**
 * Development-time debugging tools for infinite loop detection and prevention
 * Provides render count monitoring, excessive re-render warnings, and state change logging
 */

import React, { useRef, useEffect, useCallback } from 'react';

interface RenderCountMetrics {
  componentName: string;
  renderCount: number;
  firstRenderTime: number;
  lastRenderTime: number;
  rendersPerSecond: number;
  isExcessive: boolean;
  warningCount: number;
}

interface StateChangeLog {
  timestamp: number;
  componentName: string;
  stateName: string;
  oldValue: any;
  newValue: any;
  stackTrace?: string;
}

interface DevelopmentDebuggingConfig {
  maxRendersPerSecond: number;
  warningThreshold: number;
  errorThreshold: number;
  logStateChanges: boolean;
  logStackTraces: boolean;
  enableConsoleWarnings: boolean;
  monitoringWindow: number; // milliseconds
}

class DevelopmentDebuggingTools {
  private renderMetrics = new Map<string, RenderCountMetrics>();
  private stateChangeLogs: StateChangeLog[] = [];
  private config: DevelopmentDebuggingConfig = {
    maxRendersPerSecond: 30,
    warningThreshold: 20,
    errorThreshold: 50,
    logStateChanges: true,
    logStackTraces: false,
    enableConsoleWarnings: true,
    monitoringWindow: 5000, // 5 seconds
  };

  private readonly MAX_STATE_LOGS = 1000;
  private readonly RENDER_RESET_INTERVAL = 1000; // 1 second

  /**
   * Configure debugging tools
   */
  configure(config: Partial<DevelopmentDebuggingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Track component render and detect excessive re-rendering
   */
  trackRender(componentName: string): RenderCountMetrics {
    if (process.env.NODE_ENV !== 'development') {
      return this.createEmptyMetrics(componentName);
    }

    const now = performance.now();
    const existing = this.renderMetrics.get(componentName);

    if (!existing) {
      const metrics: RenderCountMetrics = {
        componentName,
        renderCount: 1,
        firstRenderTime: now,
        lastRenderTime: now,
        rendersPerSecond: 0,
        isExcessive: false,
        warningCount: 0,
      };

      this.renderMetrics.set(componentName, metrics);
      return metrics;
    }

    // Reset render count if enough time has passed
    const timeSinceFirst = now - existing.firstRenderTime;
    if (timeSinceFirst >= this.RENDER_RESET_INTERVAL) {
      const rendersPerSecond = existing.renderCount / (timeSinceFirst / 1000);
      const isExcessive = rendersPerSecond > this.config.warningThreshold;

      const updatedMetrics: RenderCountMetrics = {
        ...existing,
        renderCount: existing.renderCount + 1,
        lastRenderTime: now,
        rendersPerSecond,
        isExcessive,
      };

      // Check for excessive rendering and log warnings
      if (this.config.enableConsoleWarnings) {
        this.checkAndWarnExcessiveRendering(updatedMetrics);
      }

      // Reset metrics if monitoring window exceeded
      if (timeSinceFirst >= this.config.monitoringWindow) {
        updatedMetrics.renderCount = 1;
        updatedMetrics.firstRenderTime = now;
        updatedMetrics.rendersPerSecond = 0;
        updatedMetrics.isExcessive = false;
      }

      this.renderMetrics.set(componentName, updatedMetrics);
      return updatedMetrics;
    }

    // Update existing metrics
    const updatedMetrics: RenderCountMetrics = {
      ...existing,
      renderCount: existing.renderCount + 1,
      lastRenderTime: now,
      rendersPerSecond: existing.renderCount / (timeSinceFirst / 1000),
    };

    updatedMetrics.isExcessive = updatedMetrics.rendersPerSecond > this.config.warningThreshold;

    if (this.config.enableConsoleWarnings) {
      this.checkAndWarnExcessiveRendering(updatedMetrics);
    }

    this.renderMetrics.set(componentName, updatedMetrics);
    return updatedMetrics;
  }

  /**
   * Log state changes for debugging
   */
  logStateChange(
    componentName: string,
    stateName: string,
    oldValue: any,
    newValue: any
  ): void {
    if (process.env.NODE_ENV !== 'development' || !this.config.logStateChanges) {
      return;
    }

    const log: StateChangeLog = {
      timestamp: performance.now(),
      componentName,
      stateName,
      oldValue: this.serializeValue(oldValue),
      newValue: this.serializeValue(newValue),
    };

    if (this.config.logStackTraces) {
      log.stackTrace = new Error().stack;
    }

    this.stateChangeLogs.push(log);

    // Limit log size
    if (this.stateChangeLogs.length > this.MAX_STATE_LOGS) {
      this.stateChangeLogs.shift();
    }

    // Console log for immediate debugging
    console.log(
      `🔄 State change in ${componentName}.${stateName}:`,
      {
        from: oldValue,
        to: newValue,
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Check for excessive rendering and log appropriate warnings
   */
  private checkAndWarnExcessiveRendering(metrics: RenderCountMetrics): void {
    const { componentName, rendersPerSecond, renderCount, warningCount } = metrics;

    // Warning threshold
    if (rendersPerSecond > this.config.warningThreshold && rendersPerSecond <= this.config.errorThreshold) {
      if (warningCount === 0 || renderCount % 10 === 0) {
        console.warn(
          `⚠️ Excessive re-rendering detected in ${componentName}:\n` +
          `  • ${rendersPerSecond.toFixed(1)} renders/second (threshold: ${this.config.warningThreshold})\n` +
          `  • Total renders: ${renderCount}\n` +
          `  • Consider optimizing dependencies, memoization, or state updates`
        );
        metrics.warningCount++;
      }
    }

    // Error threshold
    if (rendersPerSecond > this.config.errorThreshold) {
      console.error(
        `🚨 CRITICAL: Infinite loop detected in ${componentName}!\n` +
        `  • ${rendersPerSecond.toFixed(1)} renders/second (error threshold: ${this.config.errorThreshold})\n` +
        `  • Total renders: ${renderCount}\n` +
        `  • This may cause browser freezing and should be fixed immediately\n` +
        `  • Check for:\n` +
        `    - Unstable dependencies in useEffect/useMemo\n` +
        `    - State updates in render functions\n` +
        `    - Circular dependencies in state updates`
      );

      // Also log recent state changes for this component
      this.logRecentStateChanges(componentName);
    }
  }

  /**
   * Log recent state changes for a specific component
   */
  private logRecentStateChanges(componentName: string): void {
    const recentLogs = this.stateChangeLogs
      .filter(log => log.componentName === componentName)
      .slice(-10); // Last 10 state changes

    if (recentLogs.length > 0) {
      console.group(`📋 Recent state changes for ${componentName}:`);
      recentLogs.forEach((log, index) => {
        console.log(
          `${index + 1}. ${log.stateName}:`,
          { from: log.oldValue, to: log.newValue, time: new Date(log.timestamp).toISOString() }
        );
      });
      console.groupEnd();
    }
  }

  /**
   * Serialize values for logging (handle circular references)
   */
  private serializeValue(value: any): any {
    try {
      if (value === null || value === undefined) return value;
      if (typeof value === 'function') return '[Function]';
      if (typeof value === 'object') {
        // Handle common React objects
        if (value.$$typeof) return '[React Element]';
        if (value instanceof Set) return `Set(${value.size})`;
        if (value instanceof Map) return `Map(${value.size})`;
        if (Array.isArray(value)) return `Array(${value.length})`;

        // For regular objects, create a shallow copy to avoid circular references
        const serialized: any = {};
        for (const key in value) {
          if (value.hasOwnProperty(key)) {
            try {
              serialized[key] = typeof value[key] === 'object' ? '[Object]' : value[key];
            } catch {
              serialized[key] = '[Unserializable]';
            }
          }
        }
        return serialized;
      }
      return value;
    } catch {
      return '[Unserializable Value]';
    }
  }

  /**
   * Create empty metrics for production builds
   */
  createEmptyMetrics(componentName: string): RenderCountMetrics {
    return {
      componentName,
      renderCount: 0,
      firstRenderTime: 0,
      lastRenderTime: 0,
      rendersPerSecond: 0,
      isExcessive: false,
      warningCount: 0,
    };
  }

  /**
   * Get render metrics for a component
   */
  getRenderMetrics(componentName: string): RenderCountMetrics | undefined {
    return this.renderMetrics.get(componentName);
  }

  /**
   * Get all render metrics
   */
  getAllRenderMetrics(): RenderCountMetrics[] {
    return Array.from(this.renderMetrics.values());
  }

  /**
   * Get state change logs
   */
  getStateChangeLogs(componentName?: string): StateChangeLog[] {
    if (componentName) {
      return this.stateChangeLogs.filter(log => log.componentName === componentName);
    }
    return [...this.stateChangeLogs];
  }

  /**
   * Clear all metrics and logs
   */
  clearAll(): void {
    this.renderMetrics.clear();
    this.stateChangeLogs.length = 0;
    console.log('🧹 Development debugging tools cleared');
  }

  /**
   * Generate debugging report
   */
  generateReport(): {
    renderMetrics: RenderCountMetrics[];
    stateChangeLogs: StateChangeLog[];
    excessiveComponents: string[];
    summary: {
      totalComponents: number;
      excessiveComponents: number;
      totalStateChanges: number;
      averageRendersPerSecond: number;
    };
  } {
    const renderMetrics = this.getAllRenderMetrics();
    const excessiveComponents = renderMetrics
      .filter(m => m.isExcessive)
      .map(m => m.componentName);

    const averageRendersPerSecond = renderMetrics.length > 0
      ? renderMetrics.reduce((sum, m) => sum + m.rendersPerSecond, 0) / renderMetrics.length
      : 0;

    return {
      renderMetrics,
      stateChangeLogs: this.getStateChangeLogs(),
      excessiveComponents,
      summary: {
        totalComponents: renderMetrics.length,
        excessiveComponents: excessiveComponents.length,
        totalStateChanges: this.stateChangeLogs.length,
        averageRendersPerSecond,
      },
    };
  }
}

// Singleton instance
export const developmentDebuggingTools = new DevelopmentDebuggingTools();

/**
 * Hook to monitor component renders in development
 */
export function useRenderMonitoring(componentName: string): {
  metrics: RenderCountMetrics;
  isExcessive: boolean;
  logStateChange: (stateName: string, oldValue: any, newValue: any) => void;
} {
  const metricsRef = useRef<RenderCountMetrics>();

  // Track this render - do it immediately, not in useEffect
  metricsRef.current = developmentDebuggingTools.trackRender(componentName);

  const logStateChange = useCallback((stateName: string, oldValue: any, newValue: any) => {
    developmentDebuggingTools.logStateChange(componentName, stateName, oldValue, newValue);
  }, [componentName]);

  return {
    metrics: metricsRef.current || developmentDebuggingTools.createEmptyMetrics(componentName),
    isExcessive: metricsRef.current?.isExcessive || false,
    logStateChange,
  };
}

/**
 * Hook to monitor state changes with automatic logging
 */
export function useStateChangeMonitoring<T>(
  componentName: string,
  stateName: string,
  value: T,
  enabled = true
): T {
  const previousValueRef = useRef<T>(value);

  useEffect(() => {
    if (enabled && previousValueRef.current !== value) {
      developmentDebuggingTools.logStateChange(
        componentName,
        stateName,
        previousValueRef.current,
        value
      );
      previousValueRef.current = value;
    }
  }, [componentName, stateName, value, enabled]);

  return value;
}

/**
 * Higher-order component to add render monitoring
 */
export function withRenderMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const MonitoredComponent = (props: P) => {
    const { isExcessive } = useRenderMonitoring(displayName);

    // Log excessive rendering in development
    useEffect(() => {
      if (process.env.NODE_ENV === 'development' && isExcessive) {
        console.warn(`🔍 Component ${displayName} is re-rendering excessively`);
      }
    }, [isExcessive]);

    return React.createElement(WrappedComponent, props);
  };

  MonitoredComponent.displayName = `withRenderMonitoring(${displayName})`;
  return MonitoredComponent;
}

/**
 * Development console commands for debugging
 */
export const devDebugCommands = {
  help: () => {
    console.log('🔧 Development Debugging Commands:');
    console.log('• devDebugCommands.report() - Generate debugging report');
    console.log('• devDebugCommands.renders() - Show render metrics');
    console.log('• devDebugCommands.states() - Show state change logs');
    console.log('• devDebugCommands.excessive() - Show components with excessive renders');
    console.log('• devDebugCommands.clear() - Clear all debugging data');
    console.log('• devDebugCommands.config(options) - Configure debugging tools');
  },

  report: () => {
    const report = developmentDebuggingTools.generateReport();
    console.log('📊 Development Debugging Report:', report);
    return report;
  },

  renders: (componentName?: string) => {
    if (componentName) {
      const metrics = developmentDebuggingTools.getRenderMetrics(componentName);
      console.log(`📈 Render metrics for ${componentName}:`, metrics);
      return metrics;
    }
    const allMetrics = developmentDebuggingTools.getAllRenderMetrics();
    console.log('📈 All render metrics:', allMetrics);
    return allMetrics;
  },

  states: (componentName?: string) => {
    const logs = developmentDebuggingTools.getStateChangeLogs(componentName);
    console.log(`🔄 State change logs${componentName ? ` for ${componentName}` : ''}:`, logs);
    return logs;
  },

  excessive: () => {
    const allMetrics = developmentDebuggingTools.getAllRenderMetrics();
    const excessive = allMetrics.filter(m => m.isExcessive);
    console.log('🚨 Components with excessive renders:', excessive);
    return excessive;
  },

  clear: () => {
    developmentDebuggingTools.clearAll();
  },

  config: (options: Partial<DevelopmentDebuggingConfig>) => {
    developmentDebuggingTools.configure(options);
    console.log('⚙️ Debugging tools configured:', options);
  },
};

// Make debug commands available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).devDebugCommands = devDebugCommands;
  console.log('🔧 Development debugging commands available at window.devDebugCommands');
}

/**
 * Initialize development debugging tools
 */
export function initializeDevelopmentDebugging(config?: Partial<DevelopmentDebuggingConfig>): void {
  if (process.env.NODE_ENV !== 'development') return;

  if (config) {
    developmentDebuggingTools.configure(config);
  }

  console.log('🔧 Development debugging tools initialized');
  console.log('• Use devDebugCommands.help() for available commands');
  console.log('• Render monitoring is active for all components using useRenderMonitoring');
  console.log('• State change logging is active for components using useStateChangeMonitoring');
}

export type { RenderCountMetrics, StateChangeLog, DevelopmentDebuggingConfig };