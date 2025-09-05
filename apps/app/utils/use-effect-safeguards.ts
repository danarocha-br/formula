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
 * Enhanced safeguards specifically for expense features
 */
export function useExpenseFeatureSafeguards(
  componentName: string,
  feature: 'fixed-expenses' | 'billable-expenses' | 'equipment-expenses'
): {
  safeEffect: (effect: React.EffectCallback, deps: React.DependencyList | undefined, effectName?: string) => void;
  stableDeps: <T extends React.DependencyList>(deps: T, effectName?: string) => T;
  stableRef: <T>(value: T, referenceName?: string) => T;
  trackCleanup: (cleanupFn: () => void, effectName?: string) => () => void;
  isRenderSafe: boolean;
} {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const { trackCleanup } = useEffectCleanupTracker(componentName);

  // Track render frequency for expense features
  renderCount.current += 1;
  const now = Date.now();
  const timeSinceLastRender = now - lastRenderTime.current;
  lastRenderTime.current = now;

  // Check for excessive rendering in expense features
  const isRenderSafe = renderCount.current < 100 && timeSinceLastRender > 10;

  if (!isRenderSafe) {
    console.warn(
      `⚠️ Excessive rendering detected in ${feature} feature (${componentName}): ` +
      `${renderCount.current} renders, ${timeSinceLastRender}ms since last render`
    );
  }

  const safeEffect = useCallback((
    effect: React.EffectCallback,
    deps: React.DependencyList | undefined,
    effectName = 'anonymous'
  ) => {
    useSafeEffect(effect, deps, componentName, `${feature}-${effectName}`);
  }, [componentName, feature]);

  const stableDeps = useCallback(<T extends React.DependencyList>(
    deps: T,
    effectName = 'anonymous'
  ): T => {
    return useStableDependencies(deps, componentName, `${feature}-${effectName}`);
  }, [componentName, feature]);

  const stableRef = useCallback(<T>(
    value: T,
    referenceName = 'anonymous'
  ): T => {
    return useStableReference(value, componentName, `${feature}-${referenceName}`);
  }, [componentName, feature]);

  return {
    safeEffect,
    stableDeps,
    stableRef,
    trackCleanup,
    isRenderSafe,
  };
}

/**
 * Safeguards for React Query operations in expense features
 */
export function useQuerySafeguards(
  queryKey: React.DependencyList,
  componentName: string,
  feature: string
): {
  safeQueryKey: React.DependencyList;
  shouldRefetch: boolean;
  refetchCount: number;
} {
  const refetchCount = useRef(0);
  const lastRefetchTime = useRef(0);
  const stableQueryKey = useStableDependencies(queryKey, componentName, `${feature}-query`);

  // Track refetch frequency
  const now = Date.now();
  if (now - lastRefetchTime.current < 1000) {
    refetchCount.current += 1;
  } else {
    refetchCount.current = 0;
  }
  lastRefetchTime.current = now;

  // Prevent excessive refetching
  const shouldRefetch = refetchCount.current < 10;

  if (!shouldRefetch) {
    console.warn(
      `🚨 Excessive query refetching detected in ${componentName} (${feature}): ` +
      `${refetchCount.current} refetches in 1 second`
    );
  }

  return {
    safeQueryKey: stableQueryKey,
    shouldRefetch,
    refetchCount: refetchCount.current,
  };
}

/**
 * Safeguards for mutation operations in expense features
 */
export function useMutationSafeguards(
  componentName: string,
  feature: string
): {
  shouldExecuteMutation: (mutationType: string) => boolean;
  trackMutation: (mutationType: string) => void;
  getMutationCount: (mutationType: string) => number;
} {
  const mutationCounts = useRef<Map<string, { count: number; lastExecution: number }>>(new Map());

  const shouldExecuteMutation = useCallback((mutationType: string): boolean => {
    const now = Date.now();
    const existing = mutationCounts.current.get(mutationType);

    if (!existing) {
      mutationCounts.current.set(mutationType, { count: 1, lastExecution: now });
      return true;
    }

    // Reset count if enough time has passed
    if (now - existing.lastExecution > 5000) {
      mutationCounts.current.set(mutationType, { count: 1, lastExecution: now });
      return true;
    }

    // Check for excessive mutations
    if (existing.count >= 5) {
      console.error(
        `🚨 Excessive mutations detected in ${componentName} (${feature}): ` +
        `${existing.count} ${mutationType} mutations in 5 seconds`
      );
      return false;
    }

    existing.count += 1;
    existing.lastExecution = now;
    return true;
  }, [componentName, feature]);

  const trackMutation = useCallback((mutationType: string) => {
    const now = Date.now();
    const existing = mutationCounts.current.get(mutationType);

    if (existing) {
      existing.count += 1;
      existing.lastExecution = now;
    } else {
      mutationCounts.current.set(mutationType, { count: 1, lastExecution: now });
    }
  }, []);

  const getMutationCount = useCallback((mutationType: string): number => {
    return mutationCounts.current.get(mutationType)?.count || 0;
  }, []);

  return {
    shouldExecuteMutation,
    trackMutation,
    getMutationCount,
  };
}

/**
 * Comprehensive safeguards for expense feature components
 */
export function useExpenseComponentSafeguards(
  componentName: string,
  feature: 'fixed-expenses' | 'billable-expenses' | 'equipment-expenses',
  options: {
    maxRenders?: number;
    maxMutations?: number;
    maxRefetches?: number;
    enableMemoryTracking?: boolean;
  } = {}
): {
  safeEffect: (effect: React.EffectCallback, deps: React.DependencyList | undefined, effectName?: string) => void;
  stableDeps: <T extends React.DependencyList>(deps: T, effectName?: string) => T;
  stableRef: <T>(value: T, referenceName?: string) => T;
  safeQueryKey: (queryKey: React.DependencyList) => React.DependencyList;
  shouldExecuteMutation: (mutationType: string) => boolean;
  trackMutation: (mutationType: string) => void;
  isComponentHealthy: boolean;
  healthReport: {
    renderCount: number;
    isRenderSafe: boolean;
    mutationCounts: Record<string, number>;
    memoryUsage?: number;
  };
} {
  const {
    maxRenders = 100,
    maxMutations = 5,
    maxRefetches = 10,
    enableMemoryTracking = true,
  } = options;

  // Use existing safeguards
  const { safeEffect, stableDeps, stableRef, isRenderSafe } = useExpenseFeatureSafeguards(componentName, feature);
  const { shouldExecuteMutation, trackMutation, getMutationCount } = useMutationSafeguards(componentName, feature);

  // Track component health
  const renderCount = useRef(0);
  const memoryUsage = useRef(0);

  renderCount.current += 1;

  // Memory tracking (if enabled and available)
  useEffect(() => {
    if (enableMemoryTracking && typeof process !== 'undefined' && process.memoryUsage) {
      memoryUsage.current = process.memoryUsage().heapUsed;
    }
  });

  const safeQueryKey = useCallback((queryKey: React.DependencyList): React.DependencyList => {
    const { safeQueryKey } = useQuerySafeguards(queryKey, componentName, feature);
    return safeQueryKey;
  }, [componentName, feature]);

  // Determine overall component health
  const isComponentHealthy = isRenderSafe && renderCount.current < maxRenders;

  const healthReport = {
    renderCount: renderCount.current,
    isRenderSafe,
    mutationCounts: {
      create: getMutationCount('create'),
      update: getMutationCount('update'),
      delete: getMutationCount('delete'),
    },
    memoryUsage: enableMemoryTracking ? memoryUsage.current : undefined,
  };

  // Log health warnings
  useEffect(() => {
    if (!isComponentHealthy) {
      console.warn(
        `⚠️ Component health warning for ${componentName} (${feature}):`,
        healthReport
      );
    }
  }, [isComponentHealthy, componentName, feature, healthReport]);

  return {
    safeEffect,
    stableDeps,
    stableRef,
    safeQueryKey,
    shouldExecuteMutation,
    trackMutation,
    isComponentHealthy,
    healthReport,
  };
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