/**
 * Enhanced memory leak detection utilities for expense features
 * Provides comprehensive memory monitoring, leak detection, and automated cleanup
 */

import { useEffect, useRef, useCallback } from 'react';
import { performanceMonitor } from './performance-monitor';

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  componentCount: number;
  queryCount: number;
  cacheSize: number;
  eventListeners: number;
}

interface MemoryLeak {
  type: 'heap_growth' | 'component_leak' | 'event_listener_leak' | 'cache_leak' | 'closure_leak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  growthRate: number; // bytes per second
  detectedAt: number;
  affectedComponent?: string;
  recommendations: string[];
}

interface ComponentMemoryTracker {
  componentName: string;
  mountCount: number;
  unmountCount: number;
  activeInstances: number;
  maxInstances: number;
  memoryAtMount: number;
  memoryAtUnmount: number;
  averageMemoryUsage: number;
  potentialLeak: boolean;
}

class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private componentTrackers = new Map<string, ComponentMemoryTracker>();
  private detectedLeaks: MemoryLeak[] = [];
  private cleanupCallbacks = new Set<() => void>();
  private monitoringInterval?: NodeJS.Timeout;

  private readonly MAX_SNAPSHOTS = 100;
  private readonly LEAK_THRESHOLD = 10 * 1024 * 1024; // 10MB growth
  private readonly CRITICAL_THRESHOLD = 50 * 1024 * 1024; // 50MB growth
  private readonly MONITORING_INTERVAL = 30000; // 30 seconds
  private readonly COMPONENT_LEAK_THRESHOLD = 10; // max instances without unmount

  private get isNode(): boolean {
    return typeof process !== 'undefined' && process.memoryUsage !== undefined;
  }

  private get isBrowser(): boolean {
    return typeof window !== 'undefined' && (performance as any).memory !== undefined;
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemorySnapshot {
    const timestamp = Date.now();
    let snapshot: MemorySnapshot;

    if (this.isNode) {
      const usage = process.memoryUsage();
      snapshot = {
        timestamp,
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers || 0,
        componentCount: this.componentTrackers.size,
        queryCount: 0, // Will be updated by caller
        cacheSize: 0, // Will be updated by caller
        eventListeners: this.estimateEventListeners(),
      };
    } else if (this.isBrowser) {
      const memoryInfo = (performance as any).memory;
      snapshot = {
        timestamp,
        heapUsed: memoryInfo.usedJSHeapSize || 0,
        heapTotal: memoryInfo.totalJSHeapSize || 0,
        external: 0,
        arrayBuffers: 0,
        componentCount: this.componentTrackers.size,
        queryCount: 0,
        cacheSize: 0,
        eventListeners: this.estimateEventListeners(),
      };
    } else {
      // Fallback for environments without memory info
      snapshot = {
        timestamp,
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0,
        componentCount: this.componentTrackers.size,
        queryCount: 0,
        cacheSize: 0,
        eventListeners: 0,
      };
    }

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-this.MAX_SNAPSHOTS);
    }

    // Analyze for leaks
    this.analyzeMemoryLeaks();

    return snapshot;
  }

  /**
   * Track component mount/unmount for leak detection
   */
  trackComponentMount(componentName: string): void {
    const existing = this.componentTrackers.get(componentName);
    const currentMemory = this.getCurrentMemoryUsage();

    if (existing) {
      existing.mountCount += 1;
      existing.activeInstances += 1;
      existing.maxInstances = Math.max(existing.maxInstances, existing.activeInstances);
      existing.memoryAtMount = currentMemory;

      // Check for component leak
      if (existing.activeInstances > this.COMPONENT_LEAK_THRESHOLD) {
        this.reportLeak({
          type: 'component_leak',
          severity: 'high',
          description: `Component ${componentName} has ${existing.activeInstances} active instances without proper unmounting`,
          growthRate: 0,
          detectedAt: Date.now(),
          affectedComponent: componentName,
          recommendations: [
            'Ensure component cleanup in useEffect return functions',
            'Check for missing dependency arrays in useEffect',
            'Verify component is properly unmounted',
            'Look for circular references preventing garbage collection',
          ],
        });
        existing.potentialLeak = true;
      }
    } else {
      this.componentTrackers.set(componentName, {
        componentName,
        mountCount: 1,
        unmountCount: 0,
        activeInstances: 1,
        maxInstances: 1,
        memoryAtMount: currentMemory,
        memoryAtUnmount: 0,
        averageMemoryUsage: currentMemory,
        potentialLeak: false,
      });
    }
  }

  /**
   * Track component unmount
   */
  trackComponentUnmount(componentName: string): void {
    const existing = this.componentTrackers.get(componentName);
    if (!existing) return;

    const currentMemory = this.getCurrentMemoryUsage();

    existing.unmountCount += 1;
    existing.activeInstances = Math.max(0, existing.activeInstances - 1);
    existing.memoryAtUnmount = currentMemory;
    existing.averageMemoryUsage = (existing.averageMemoryUsage + currentMemory) / 2;

    // Clear leak flag if instances are back to normal
    if (existing.activeInstances <= this.COMPONENT_LEAK_THRESHOLD / 2) {
      existing.potentialLeak = false;
    }
  }

  /**
   * Register cleanup callback
   */
  registerCleanup(cleanup: () => void): () => void {
    this.cleanupCallbacks.add(cleanup);

    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(cleanup);
    };
  }

  /**
   * Execute all cleanup callbacks
   */
  executeCleanup(): void {
    this.cleanupCallbacks.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    this.cleanupCallbacks.clear();
  }

  /**
   * Analyze memory snapshots for leaks
   */
  private analyzeMemoryLeaks(): void {
    if (this.snapshots.length < 5) return;

    const recent = this.snapshots.slice(-5);
    const older = this.snapshots.slice(-10, -5);

    if (older.length === 0) return;

    const recentAvg = recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.heapUsed, 0) / older.length;
    const growth = recentAvg - olderAvg;

    // Calculate growth rate (bytes per second)
    const timeSpan = (recent[recent.length - 1].timestamp - older[0].timestamp) / 1000;
    const growthRate = growth / Math.max(timeSpan, 1);

    // Check for heap growth leak
    if (growth > this.LEAK_THRESHOLD) {
      const severity = growth > this.CRITICAL_THRESHOLD ? 'critical' : 'high';

      this.reportLeak({
        type: 'heap_growth',
        severity,
        description: `Memory heap grew by ${(growth / 1024 / 1024).toFixed(2)}MB over ${timeSpan.toFixed(1)}s`,
        growthRate,
        detectedAt: Date.now(),
        recommendations: [
          'Check for uncleaned event listeners',
          'Verify React Query cache is not growing unbounded',
          'Look for circular references in closures',
          'Check for retained DOM references',
          'Monitor component mount/unmount cycles',
        ],
      });
    }

    // Check for cache growth
    const cacheGrowth = recent[recent.length - 1].cacheSize - recent[0].cacheSize;
    if (cacheGrowth > 1000) { // More than 1000 cache items added
      this.reportLeak({
        type: 'cache_leak',
        severity: 'medium',
        description: `Cache size grew by ${cacheGrowth} items`,
        growthRate: cacheGrowth / timeSpan,
        detectedAt: Date.now(),
        recommendations: [
          'Implement cache size limits',
          'Add cache eviction policies',
          'Check for duplicate cache entries',
          'Verify cache cleanup on component unmount',
        ],
      });
    }

    // Check for event listener leaks
    const listenerGrowth = recent[recent.length - 1].eventListeners - recent[0].eventListeners;
    if (listenerGrowth > 50) {
      this.reportLeak({
        type: 'event_listener_leak',
        severity: 'high',
        description: `Event listeners increased by ${listenerGrowth}`,
        growthRate: listenerGrowth / timeSpan,
        detectedAt: Date.now(),
        recommendations: [
          'Ensure event listeners are removed in cleanup functions',
          'Check for missing removeEventListener calls',
          'Verify useEffect cleanup functions are properly implemented',
          'Look for event listeners added outside of React lifecycle',
        ],
      });
    }
  }

  /**
   * Report a detected memory leak
   */
  private reportLeak(leak: MemoryLeak): void {
    // Avoid duplicate reports
    const existing = this.detectedLeaks.find(l =>
      l.type === leak.type &&
      l.affectedComponent === leak.affectedComponent &&
      Date.now() - l.detectedAt < 60000 // Within last minute
    );

    if (existing) return;

    this.detectedLeaks.push(leak);

    // Keep only recent leaks
    if (this.detectedLeaks.length > 50) {
      this.detectedLeaks = this.detectedLeaks.slice(-50);
    }

    // Log the leak
    const severityIcon = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨'
    }[leak.severity];

    console.warn(`${severityIcon} Memory leak detected [${leak.type}]: ${leak.description}`);

    if (leak.recommendations.length > 0) {
      console.group('💡 Recommendations:');
      leak.recommendations.forEach(rec => console.log(`• ${rec}`));
      console.groupEnd();
    }

    // Track with performance monitor
    performanceMonitor.trackMemoryUsage(0, 0, this.componentTrackers.size);
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (this.isNode) {
      return process.memoryUsage().heapUsed;
    } else if (this.isBrowser) {
      return (performance as any).memory?.usedJSHeapSize || 0;
    }
    return 0;
  }

  /**
   * Estimate number of event listeners (browser only)
   */
  private estimateEventListeners(): number {
    if (typeof window === 'undefined') return 0;

    // This is an approximation - actual count is not directly accessible
    const elements = document.querySelectorAll('*');
    let estimatedListeners = 0;

    // Common event types that might have listeners
    const eventTypes = ['click', 'change', 'input', 'keydown', 'keyup', 'focus', 'blur'];

    elements.forEach(element => {
      eventTypes.forEach(eventType => {
        if ((element as any)[`on${eventType}`]) {
          estimatedListeners++;
        }
      });
    });

    return estimatedListeners;
  }

  /**
   * Start automatic memory monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot();
    }, this.MONITORING_INTERVAL);

    console.log('🔍 Memory leak detection started');
  }

  /**
   * Stop automatic memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Get component memory trackers
   */
  getComponentTrackers(): ComponentMemoryTracker[] {
    return Array.from(this.componentTrackers.values());
  }

  /**
   * Get components with potential leaks
   */
  getLeakyComponents(): ComponentMemoryTracker[] {
    return Array.from(this.componentTrackers.values()).filter(t => t.potentialLeak);
  }

  /**
   * Get detected leaks
   */
  getDetectedLeaks(): MemoryLeak[] {
    return [...this.detectedLeaks];
  }

  /**
   * Get memory snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.snapshots = [];
    this.componentTrackers.clear();
    this.detectedLeaks = [];
    this.executeCleanup();
  }

  /**
   * Generate memory leak report
   */
  generateReport(): {
    summary: {
      totalComponents: number;
      leakyComponents: number;
      detectedLeaks: number;
      criticalLeaks: number;
      currentMemoryUsage: number;
      memoryGrowthRate: number;
    };
    components: ComponentMemoryTracker[];
    leaks: MemoryLeak[];
    snapshots: MemorySnapshot[];
  } {
    const components = this.getComponentTrackers();
    const leakyComponents = this.getLeakyComponents();
    const leaks = this.getDetectedLeaks();
    const criticalLeaks = leaks.filter(l => l.severity === 'critical').length;

    const currentSnapshot = this.snapshots[this.snapshots.length - 1];
    const previousSnapshot = this.snapshots[this.snapshots.length - 2];

    const memoryGrowthRate = currentSnapshot && previousSnapshot
      ? (currentSnapshot.heapUsed - previousSnapshot.heapUsed) /
        Math.max((currentSnapshot.timestamp - previousSnapshot.timestamp) / 1000, 1)
      : 0;

    return {
      summary: {
        totalComponents: components.length,
        leakyComponents: leakyComponents.length,
        detectedLeaks: leaks.length,
        criticalLeaks,
        currentMemoryUsage: currentSnapshot?.heapUsed || 0,
        memoryGrowthRate,
      },
      components,
      leaks,
      snapshots: this.snapshots,
    };
  }
}

// Singleton instance
export const memoryLeakDetector = new MemoryLeakDetector();

/**
 * Hook to track component memory usage and detect leaks
 */
export function useMemoryLeakDetection(componentName: string): {
  tracker: ComponentMemoryTracker | undefined;
  hasLeak: boolean;
  registerCleanup: (cleanup: () => void) => () => void;
} {
  const cleanupRef = useRef<Set<() => void>>(new Set());

  // Track mount
  useEffect(() => {
    memoryLeakDetector.trackComponentMount(componentName);

    return () => {
      // Execute component-specific cleanup
      cleanupRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error(`Error in cleanup for ${componentName}:`, error);
        }
      });
      cleanupRef.current.clear();

      // Track unmount
      memoryLeakDetector.trackComponentUnmount(componentName);
    };
  }, [componentName]);

  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanupRef.current.add(cleanup);

    return () => {
      cleanupRef.current.delete(cleanup);
    };
  }, []);

  const tracker = memoryLeakDetector.getComponentTrackers()
    .find(t => t.componentName === componentName);

  return {
    tracker,
    hasLeak: tracker?.potentialLeak || false,
    registerCleanup,
  };
}

/**
 * Hook for automated cache cleanup
 */
export function useCacheCleanup(
  cacheKey: string,
  cleanupFn: () => void,
  dependencies: React.DependencyList = []
): void {
  const { registerCleanup } = useMemoryLeakDetection(`Cache-${cacheKey}`);

  useEffect(() => {
    const unregister = registerCleanup(cleanupFn);
    return unregister;
  }, dependencies);
}

/**
 * Hook for event listener cleanup tracking
 */
export function useEventListenerCleanup(
  element: EventTarget | null,
  eventType: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): void {
  const { registerCleanup } = useMemoryLeakDetection('EventListener');

  useEffect(() => {
    if (!element) return;

    element.addEventListener(eventType, handler, options);

    const cleanup = () => {
      element.removeEventListener(eventType, handler, options);
    };

    const unregister = registerCleanup(cleanup);

    return () => {
      cleanup();
      unregister();
    };
  }, [element, eventType, handler, options, registerCleanup]);
}

/**
 * Higher-order component to add memory leak detection
 */
export function withMemoryLeakDetection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const MonitoredComponent = (props: P) => {
    const { hasLeak, tracker } = useMemoryLeakDetection(displayName);

    // Warn about potential leaks in development
    useEffect(() => {
      if (process.env.NODE_ENV === 'development' && hasLeak && tracker) {
        console.warn(
          `⚠️ Potential memory leak in ${displayName}: ` +
          `${tracker.activeInstances} active instances, ` +
          `${tracker.mountCount - tracker.unmountCount} net mounts`
        );
      }
    }, [hasLeak, tracker?.activeInstances, tracker?.mountCount, tracker?.unmountCount]);

    return React.createElement(WrappedComponent, props);
  };

  MonitoredComponent.displayName = `withMemoryLeakDetection(${displayName})`;
  return MonitoredComponent;
}

/**
 * Initialize memory leak detection
 */
export function initializeMemoryLeakDetection(): void {
  memoryLeakDetector.startMonitoring();

  // Auto-cleanup on page unload (browser only)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      memoryLeakDetector.executeCleanup();
      memoryLeakDetector.stopMonitoring();
    });
  }

  // Auto-cleanup on process exit (Node.js only)
  if (typeof process !== 'undefined') {
    process.on('exit', () => {
      memoryLeakDetector.executeCleanup();
    });
  }
}

// Auto-initialize in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  initializeMemoryLeakDetection();
}