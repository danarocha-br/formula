import { useEffect, useRef, useCallback } from 'react';

/**
 * Safeguards against infinite loops in useEffect hooks
 */

interface EffectExecutionTracker {
  count: number;
  lastExecution: number;
  componentName: string;
}

class EffectSafeguard {
  private executions = new Map<string, EffectExecutionTracker>();
  private readonly MAX_EXECUTIONS_PER_SECOND = 10;
  private readonly MAX_TOTAL_EXECUTIONS = 100;
  private readonly RESET_INTERVAL = 5000; // 5 seconds

  /**
   * Check if an effect should be allowed to execute
   */
  shouldExecute(effectId: string, componentName: string): boolean {
    const now = Date.now();
    const existing = this.executions.get(effectId);

    if (!existing) {
      this.executions.set(effectId, {
        count: 1,
        lastExecution: now,
        componentName,
      });
      return true;
    }

    // Reset counter if enough time has passed
    if (now - existing.lastExecution > this.RESET_INTERVAL) {
      this.executions.set(effectId, {
        count: 1,
        lastExecution: now,
        componentName,
      });
      return true;
    }

    // Check for too many executions in a short time
    const timeDiff = now - existing.lastExecution;
    const executionsPerSecond = existing.count / (timeDiff / 1000);

    if (executionsPerSecond > this.MAX_EXECUTIONS_PER_SECOND) {
      console.error(
        `🚨 Infinite loop detected in ${componentName}: Effect "${effectId}" executed ${existing.count} times in ${timeDiff}ms`
      );
      return false;
    }

    // Check for too many total executions
    if (existing.count > this.MAX_TOTAL_EXECUTIONS) {
      console.error(
        `🚨 Excessive effect executions in ${componentName}: Effect "${effectId}" executed ${existing.count} times`
      );
      return false;
    }

    // Update execution count
    this.executions.set(effectId, {
      ...existing,
      count: existing.count + 1,
      lastExecution: now,
    });

    return true;
  }

  /**
   * Clear tracking for a specific effect
   */
  clearEffect(effectId: string): void {
    this.executions.delete(effectId);
  }

  /**
   * Get execution stats for debugging
   */
  getStats(): Array<EffectExecutionTracker & { effectId: string }> {
    return Array.from(this.executions.entries()).map(([effectId, tracker]) => ({
      effectId,
      ...tracker,
    }));
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.executions.clear();
  }
}

const effectSafeguard = new EffectSafeguard();

/**
 * Safe version of useEffect that prevents infinite loops
 */
export function useSafeEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList | undefined,
  componentName: string,
  effectName = 'anonymous'
): void {
  const effectId = `${componentName}:${effectName}`;
  const executionCount = useRef(0);

  useEffect(() => {
    executionCount.current += 1;

    if (!effectSafeguard.shouldExecute(effectId, componentName)) {
      console.warn(`Effect execution blocked for ${effectId} (execution #${executionCount.current})`);
      return;
    }

    return effect();
  }, deps);
}

/**
 * Hook to detect and prevent dependency array issues
 */
export function useStableDependencies<T extends React.DependencyList>(
  deps: T,
  componentName: string,
  effectName = 'anonymous'
): T {
  const previousDeps = useRef<T>(deps);
  const stableRef = useRef<T>(deps);
  const changeCount = useRef(0);

  // Deep comparison to detect unnecessary changes
  const hasChanged = deps.some((dep, index) => {
    const prevDep = previousDeps.current[index];
    return !Object.is(dep, prevDep);
  });

  if (hasChanged) {
    changeCount.current += 1;

    // Warn about frequent dependency changes
    if (changeCount.current > 20) {
      console.warn(
        `🚨 Frequent dependency changes detected in ${componentName}:${effectName} ` +
        `(${changeCount.current} changes). This may cause performance issues.`
      );
    }

    previousDeps.current = deps;
    stableRef.current = deps;
  }

  return stableRef.current;
}

/**
 * Hook to track and prevent memory leaks from uncleaned effects
 */
export function useEffectCleanupTracker(componentName: string): {
  trackCleanup: (cleanupFn: () => void, effectName?: string) => () => void;
  getActiveCleanups: () => string[];
} {
  const activeCleanups = useRef(new Set<string>());

  const trackCleanup = useCallback((cleanupFn: () => void, effectName = 'anonymous') => {
    const cleanupId = `${componentName}:${effectName}:${Date.now()}`;
    activeCleanups.current.add(cleanupId);

    return () => {
      try {
        cleanupFn();
        activeCleanups.current.delete(cleanupId);
      } catch (error) {
        console.error(`Error in cleanup for ${cleanupId}:`, error);
        activeCleanups.current.delete(cleanupId);
      }
    };
  }, [componentName]);

  const getActiveCleanups = useCallback(() => {
    return Array.from(activeCleanups.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeCleanups.current.size > 0) {
        console.warn(
          `🚨 Component ${componentName} unmounted with ${activeCleanups.current.size} uncleaned effects:`,
          Array.from(activeCleanups.current)
        );
      }
    };
  }, [componentName]);

  return { trackCleanup, getActiveCleanups };
}

/**
 * Hook to detect infinite re-renders caused by object/array dependencies
 */
export function useStableReference<T>(
  value: T,
  componentName: string,
  referenceName = 'anonymous'
): T {
  const stableRef = useRef<T>(value);
  const changeCount = useRef(0);

  // For objects and arrays, do a shallow comparison
  const hasChanged = typeof value === 'object' && value !== null
    ? JSON.stringify(value) !== JSON.stringify(stableRef.current)
    : value !== stableRef.current;

  if (hasChanged) {
    changeCount.current += 1;

    if (changeCount.current > 50) {
      console.error(
        `🚨 Excessive reference changes in ${componentName}:${referenceName} ` +
        `(${changeCount.current} changes). This may cause infinite re-renders.`
      );
    }

    stableRef.current = value;
  }

  return stableRef.current;
}

/**
 * Development-only hook to log effect executions
 */
export function useEffectDebugger(
  effectCallback: React.EffectCallback,
  dependencies: React.DependencyList,
  dependencyNames: string[] = [],
  componentName: string
): void {
  const previousDeps = useRef<React.DependencyList>(dependencies);
  const changedDeps = useRef<Array<{ name: string; before: any; after: any }>>([]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const changes: Array<{ name: string; before: any; after: any }> = [];

      dependencies.forEach((dep, index) => {
        const prevDep = previousDeps.current[index];
        if (!Object.is(dep, prevDep)) {
          changes.push({
            name: dependencyNames[index] || `dep${index}`,
            before: prevDep,
            after: dep,
          });
        }
      });

      if (changes.length > 0) {
        console.log(`🔍 Effect triggered in ${componentName}:`, changes);
        changedDeps.current = changes;
      }

      previousDeps.current = dependencies;
    }

    return effectCallback();
  }, dependencies);
}

export { effectSafeguard };