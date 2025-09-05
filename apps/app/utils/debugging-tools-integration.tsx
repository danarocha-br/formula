/**
 * Debugging Tools Integration
 * Provides a unified interface for all cache debugging and monitoring tools
 */

import React, { useEffect } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { performanceMonitor } from './performance-monitor';
import { cacheStateInspector } from './cache-state-inspector';
import { cacheHealthChecker } from './cache-health-checker';
import { CacheOperationDashboard } from './cache-operation-dashboard';
import { PerformanceMetricsDashboard, MetricsSummary } from './performance-metrics-visualizer';

/**
 * Initialize all debugging tools with a QueryClient
 */
export function initializeDebuggingTools(queryClient: QueryClient): void {
  if (process.env.NODE_ENV !== 'development') return;

  try {
    // Initialize cache state inspector
    cacheStateInspector.initialize(queryClient);

    // Initialize cache health checker
    cacheHealthChecker.initialize(queryClient, {
      enabled: true,
      interval: 30000, // 30 seconds
    });

    // Initialize performance monitor
    performanceMonitor.initialize();

    console.log('🔧 Debugging tools initialized');
  } catch (error) {
    console.warn('🔧 Failed to initialize some debugging tools:', error);
  }
}

/**
 * Cleanup all debugging tools
 */
export function cleanupDebuggingTools(): void {
  performanceMonitor.cleanup();
  cacheHealthChecker.cleanup();

  console.log('🔧 Debugging tools cleaned up');
}

/**
 * Development debugging panel component
 */
export const DebuggingPanel: React.FC<{
  queryClient: QueryClient;
  showDashboard?: boolean;
  showMetrics?: boolean;
  showSummary?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}> = ({
  queryClient,
  showDashboard = true,
  showMetrics = false,
  showSummary = true,
  position = 'top-right',
}) => {
  useEffect(() => {
    initializeDebuggingTools(queryClient);
    return () => cleanupDebuggingTools();
  }, [queryClient]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const positionStyles = {
    'top-left': { top: '10px', left: '10px' },
    'top-right': { top: '10px', right: '10px' },
    'bottom-left': { bottom: '10px', left: '10px' },
    'bottom-right': { bottom: '10px', right: '10px' },
  };

  return (
    <div style={{ position: 'fixed', zIndex: 10000, ...positionStyles[position] }}>
      {showSummary && (
        <div style={{ marginBottom: '10px' }}>
          <MetricsSummary />
        </div>
      )}

      {showDashboard && <CacheOperationDashboard />}

      {showMetrics && (
        <div style={{ marginTop: '10px' }}>
          <PerformanceMetricsDashboard chartWidth={300} chartHeight={150} />
        </div>
      )}
    </div>
  );
};

/**
 * Global debugging utilities accessible via window object
 */
export interface GlobalDebuggingUtils {
  // Performance monitoring
  getPerformanceReport: () => any;
  clearPerformanceMetrics: () => void;
  logPerformanceSummary: () => void;

  // Cache state inspection
  getCacheSnapshot: () => any;
  analyzeCacheHealth: () => any;
  exportCacheState: () => string;
  logCacheState: () => void;

  // Health checking
  getHealthStatus: () => any;
  forceHealthCheck: () => Promise<any>;

  // Utilities
  clearAllCaches: () => void;
  invalidateAllQueries: () => Promise<void>;
  generateDebugReport: () => string;
}

/**
 * Setup global debugging utilities in development
 */
export function setupGlobalDebuggingUtils(queryClient: QueryClient): void {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return;

  const utils: GlobalDebuggingUtils = {
    // Performance monitoring
    getPerformanceReport: () => performanceMonitor.generateReport(),
    clearPerformanceMetrics: () => performanceMonitor.clearAllMetrics(),
    logPerformanceSummary: () => performanceMonitor.logSummary(),

    // Cache state inspection
    getCacheSnapshot: () => cacheStateInspector.getCacheSnapshot(),
    analyzeCacheHealth: () => cacheStateInspector.analyzeCacheHealth(),
    exportCacheState: () => cacheStateInspector.exportCacheState(),
    logCacheState: () => {
      const snapshot = cacheStateInspector.getCacheSnapshot();
      const analysis = cacheStateInspector.analyzeCacheHealth();
      console.log('Cache Snapshot:', snapshot);
      console.log('Cache Analysis:', analysis);
    },

    // Health checking
    getHealthStatus: () => cacheHealthChecker.getHealthStatus(),
    forceHealthCheck: () => cacheHealthChecker.forceHealthCheck(),

    // Utilities
    clearAllCaches: () => {
      queryClient.clear();
      console.log('All caches cleared');
    },
    invalidateAllQueries: async () => {
      await queryClient.invalidateQueries();
      console.log('All queries invalidated');
    },
    generateDebugReport: () => {
      const report = {
        timestamp: new Date().toISOString(),
        performance: performanceMonitor.generateReport(),
        cacheSnapshot: cacheStateInspector.getCacheSnapshot(),
        cacheAnalysis: cacheStateInspector.analyzeCacheHealth(),
        healthStatus: cacheHealthChecker.getHealthStatus(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      const reportString = JSON.stringify(report, null, 2);
      console.log('Debug Report Generated:', report);

      // Copy to clipboard if available
      if (navigator.clipboard) {
        navigator.clipboard.writeText(reportString).then(() => {
          console.log('Debug report copied to clipboard');
        });
      }

      return reportString;
    },
  };

  // Make utilities available globally
  (window as any).cacheDebug = utils;

  // Add keyboard shortcuts
  const handleKeyPress = (event: KeyboardEvent) => {
    if (!event.ctrlKey || !event.shiftKey) return;

    switch (event.key) {
      case 'P': // Ctrl+Shift+P - Performance summary
        event.preventDefault();
        utils.logPerformanceSummary();
        break;
      case 'C': // Ctrl+Shift+C - Cache state
        event.preventDefault();
        utils.logCacheState();
        break;
      case 'H': // Ctrl+Shift+H - Health status
        event.preventDefault();
        console.log('Health Status:', utils.getHealthStatus());
        break;
      case 'R': // Ctrl+Shift+R - Generate report
        event.preventDefault();
        utils.generateDebugReport();
        break;
      case 'X': // Ctrl+Shift+X - Clear caches
        event.preventDefault();
        if (confirm('Clear all caches? This will remove all cached data.')) {
          utils.clearAllCaches();
        }
        break;
    }
  };

  if (window.addEventListener) {
    window.addEventListener('keydown', handleKeyPress);
  }

  console.log('🔧 Global debugging utilities available:');
  console.log('• window.cacheDebug - All debugging utilities');
  console.log('• Ctrl+Shift+P - Log performance summary');
  console.log('• Ctrl+Shift+C - Log cache state');
  console.log('• Ctrl+Shift+H - Log health status');
  console.log('• Ctrl+Shift+R - Generate debug report');
  console.log('• Ctrl+Shift+X - Clear all caches');
}

/**
 * React hook for debugging tools
 */
export function useDebuggingTools(queryClient: QueryClient) {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    initializeDebuggingTools(queryClient);
    setupGlobalDebuggingUtils(queryClient);
    setIsInitialized(true);

    return () => {
      cleanupDebuggingTools();
      setIsInitialized(false);
    };
  }, [queryClient]);

  return {
    isInitialized,
    performanceMonitor,
    cacheStateInspector,
    cacheHealthChecker,
  };
}

/**
 * Higher-order component to add debugging tools to an app
 */
export function withDebuggingTools<P extends { queryClient: QueryClient }>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> {
  const DebuggingToolsWrapper = (props: P) => {
    useDebuggingTools(props.queryClient);

    return (
      <>
        <WrappedComponent {...props} />
        <DebuggingPanel queryClient={props.queryClient} />
      </>
    );
  };

  DebuggingToolsWrapper.displayName = `withDebuggingTools(${WrappedComponent.displayName || WrappedComponent.name})`;
  return DebuggingToolsWrapper;
}

/**
 * Development console commands
 */
export const debugCommands = {
  help: () => {
    console.log('🔧 Available Debug Commands:');
    console.log('• debugCommands.performance() - Show performance metrics');
    console.log('• debugCommands.cache() - Show cache state');
    console.log('• debugCommands.health() - Show health status');
    console.log('• debugCommands.report() - Generate full debug report');
    console.log('• debugCommands.clear() - Clear all caches');
    console.log('• debugCommands.monitor() - Start/stop monitoring');
  },

  performance: () => {
    performanceMonitor.logSummary();
    return performanceMonitor.generateReport();
  },

  cache: () => {
    const snapshot = cacheStateInspector.getCacheSnapshot();
    const analysis = cacheStateInspector.analyzeCacheHealth();
    console.log('Cache Snapshot:', snapshot);
    console.log('Cache Analysis:', analysis);
    return { snapshot, analysis };
  },

  health: async () => {
    const status = await cacheHealthChecker.forceHealthCheck();
    console.log('Health Status:', status);
    return status;
  },

  report: () => {
    if (typeof window !== 'undefined' && (window as any).cacheDebug) {
      return (window as any).cacheDebug.generateDebugReport();
    }
    return 'Debug utilities not initialized';
  },

  clear: () => {
    if (typeof window !== 'undefined' && (window as any).cacheDebug) {
      (window as any).cacheDebug.clearAllCaches();
    }
  },

  monitor: (enable = true) => {
    if (enable) {
      performanceMonitor.initialize();
      cacheHealthChecker.startHealthChecks();
      console.log('Monitoring started');
    } else {
      performanceMonitor.cleanup();
      cacheHealthChecker.stopHealthChecks();
      console.log('Monitoring stopped');
    }
  },
};

// Make debug commands available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugCommands = debugCommands;
}

/**
 * Export all debugging tools for easy access
 */
export {
  performanceMonitor,
  cacheStateInspector,
  cacheHealthChecker,
  CacheOperationDashboard,
  PerformanceMetricsDashboard,
  MetricsSummary,
};