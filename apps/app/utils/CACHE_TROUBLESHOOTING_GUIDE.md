# Cache Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting steps for React Query cache-related issues in expense management features. It covers common problems, diagnostic techniques, and step-by-step solutions.

## Quick Diagnostic Checklist

When encountering cache issues, start with this quick checklist:

```typescript
// Quick diagnostic questions
const cacheHealthCheck = {
  // Data consistency
  isDataStale: boolean, // UI shows old data
  isDataMissing: boolean, // Expected data not present
  isDataDuplicated: boolean, // Same data appears multiple times

  // Performance issues
  isSlowToUpdate: boolean, // Updates take too long
  isCausingReRenders: boolean, // Excessive component re-renders
  isMemoryLeaking: boolean, // Memory usage increasing

  // Error conditions
  hasInfiniteLoops: boolean, // Continuous operations
  hasCacheErrors: boolean, // Cache operation failures
  hasNetworkErrors: boolean, // API call failures
};
```

## Common Cache Issues

### 1. Stale Data Problems

#### Symptoms

- UI displays outdated information
- Changes don't appear immediately
- Data inconsistency between components

#### Diagnostic Steps

```typescript
// Check cache state
const diagnoseCacheState = (queryClient: QueryClient, userId: string) => {
  const queryKey = ["expenses", userId];
  const queryState = queryClient.getQueryState(queryKey);
  const queryData = queryClient.getQueryData(queryKey);

  console.log("Cache Diagnosis:", {
    hasData: !!queryData,
    dataUpdatedAt: queryState?.dataUpdatedAt,
    isStale: queryState?.isStale,
    isFetching: queryState?.isFetching,
    lastFetch: new Date(queryState?.dataUpdatedAt || 0),
    timeSinceUpdate: Date.now() - (queryState?.dataUpdatedAt || 0),
  });

  return {
    queryState,
    queryData,
    isStale: queryState?.isStale || false,
    needsRefresh: !queryData || queryState?.isStale,
  };
};
```

#### Solutions

**Solution 1: Force Cache Refresh**

```typescript
// Immediate fix - force refresh
const forceRefresh = async (queryClient: QueryClient, userId: string) => {
  await queryClient.invalidateQueries({
    queryKey: ["expenses", userId],
    refetchType: "active",
  });
};
```

**Solution 2: Fix Cache Update Logic**

```typescript
// ❌ Problematic - not updating cache
const updateExpense = useMutation({
  mutationFn: updateExpenseAPI,
  // Missing cache update
});

// ✅ Fixed - proper cache update
const updateExpense = useMutation({
  mutationFn: updateExpenseAPI,
  onSuccess: (data) => {
    expenseCacheUtils.updateItem(queryClient, userId, data);
  },
});
```

**Solution 3: Adjust Stale Time**

```typescript
// ✅ Configure appropriate stale time
const useExpenses = (userId: string) => {
  return useQuery({
    queryKey: ["expenses", userId],
    queryFn: () => fetchExpenses(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

### 2. Infinite Re-render Loops

#### Symptoms

- Browser becomes unresponsive
- Console shows continuous render logs
- Memory usage spikes rapidly
- React DevTools shows excessive renders

#### Diagnostic Steps

```typescript
// Detect infinite loops
const detectInfiniteLoops = () => {
  let renderCount = 0;
  const startTime = Date.now();

  const trackRender = () => {
    renderCount++;
    const elapsed = Date.now() - startTime;

    if (renderCount > 100 && elapsed < 5000) {
      console.error("Infinite loop detected!", {
        renders: renderCount,
        timeElapsed: elapsed,
        rendersPerSecond: renderCount / (elapsed / 1000),
      });

      // Break execution to prevent browser freeze
      debugger;
    }
  };

  return trackRender;
};

// Use in component
const ExpenseComponent = () => {
  const trackRender = detectInfiniteLoops();
  trackRender();

  // Component implementation
};
```

#### Solutions

**Solution 1: Fix Unstable Dependencies**

```typescript
// ❌ Problematic - unstable dependencies
useEffect(() => {
  fetchData();
}, [user, config]); // Objects change on every render

// ✅ Fixed - stable dependencies
const stableUserId = user?.id;
const stableConfigId = config?.id;
useEffect(() => {
  fetchData();
}, [stableUserId, stableConfigId]);
```

**Solution 2: Use Stable Selectors**

```typescript
// ❌ Problematic - creates new array every render
const sortedExpenses = expenses.sort((a, b) => a.rank - b.rank);

// ✅ Fixed - stable memoized selector
const sortedExpenses = useMemo(
  () => expenses.sort((a, b) => a.rank - b.rank),
  [expenses]
);
```

**Solution 3: Break Circular Dependencies**

```typescript
// ❌ Problematic - circular dependency
const [localData, setLocalData] = useState([]);
const { data } = useQuery(queryKey, queryFn);

useEffect(() => {
  setLocalData(data);
}, [data]);

useEffect(() => {
  // This could trigger query refetch
  updateCache(localData);
}, [localData]);

// ✅ Fixed - single source of truth
const data = useStableExpenses(userId);
// No local state needed
```

### 3. Memory Leaks

#### Symptoms

- Memory usage increases over time
- Application becomes slower
- Browser eventually crashes
- Performance degrades with usage

#### Diagnostic Steps

```typescript
// Memory leak detection
const detectMemoryLeaks = () => {
  const initialMemory = performance.memory?.usedJSHeapSize || 0;
  let checkCount = 0;

  const checkMemory = () => {
    checkCount++;
    const currentMemory = performance.memory?.usedJSHeapSize || 0;
    const increase = currentMemory - initialMemory;
    const increasePerCheck = increase / checkCount;

    console.log("Memory Check:", {
      initial: formatBytes(initialMemory),
      current: formatBytes(currentMemory),
      increase: formatBytes(increase),
      increasePerCheck: formatBytes(increasePerCheck),
      checkCount,
    });

    // Alert if memory is increasing consistently
    if (increasePerCheck > 1024 * 1024) {
      // 1MB per check
      console.warn("Potential memory leak detected!");
      return true;
    }

    return false;
  };

  // Check every 10 seconds
  const interval = setInterval(checkMemory, 10000);

  return () => clearInterval(interval);
};
```

#### Solutions

**Solution 1: Fix Missing Cleanup**

```typescript
// ❌ Problematic - missing cleanup
useEffect(() => {
  const subscription = dataService.subscribe(callback);
  const interval = setInterval(updateData, 1000);
  // Missing cleanup
}, []);

// ✅ Fixed - proper cleanup
useEffect(() => {
  const subscription = dataService.subscribe(callback);
  const interval = setInterval(updateData, 1000);

  return () => {
    subscription.unsubscribe();
    clearInterval(interval);
  };
}, []);
```

**Solution 2: Use Weak References**

```typescript
// ✅ Use WeakMap for cached calculations
const calculationCache = new WeakMap<Expense, CalculatedValues>();

const getCalculatedValues = (expense: Expense) => {
  if (calculationCache.has(expense)) {
    return calculationCache.get(expense)!;
  }

  const calculated = performExpensiveCalculation(expense);
  calculationCache.set(expense, calculated);
  return calculated;
};
```

**Solution 3: Implement Cache Size Limits**

```typescript
// ✅ Limit cache size
const configureCacheSize = (queryClient: QueryClient) => {
  queryClient.setDefaultOptions({
    queries: {
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  });

  // Periodic cleanup
  setInterval(
    () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      // Remove old queries
      queries.forEach((query) => {
        const age = Date.now() - query.state.dataUpdatedAt;
        if (age > 30 * 60 * 1000) {
          // 30 minutes
          cache.remove(query);
        }
      });
    },
    5 * 60 * 1000
  ); // Every 5 minutes
};
```

### 4. Cache Inconsistency

#### Symptoms

- Different components show different data
- Data doesn't match server state
- Updates appear in some places but not others

#### Diagnostic Steps

```typescript
// Check cache consistency
const checkCacheConsistency = (queryClient: QueryClient, userId: string) => {
  const queries = queryClient.getQueryCache().getAll();
  const expenseQueries = queries.filter(
    (query) => query.queryKey[0] === "expenses"
  );

  console.log("Cache Consistency Check:", {
    totalQueries: queries.length,
    expenseQueries: expenseQueries.length,
    queryStates: expenseQueries.map((query) => ({
      key: query.queryKey,
      dataUpdatedAt: query.state.dataUpdatedAt,
      isStale: query.state.isStale,
      hasData: !!query.state.data,
    })),
  });

  // Check for duplicate or conflicting data
  const duplicateKeys = new Set();
  const keyMap = new Map();

  expenseQueries.forEach((query) => {
    const keyString = JSON.stringify(query.queryKey);
    if (keyMap.has(keyString)) {
      duplicateKeys.add(keyString);
    }
    keyMap.set(keyString, query);
  });

  if (duplicateKeys.size > 0) {
    console.warn("Duplicate query keys found:", Array.from(duplicateKeys));
  }
};
```

#### Solutions

**Solution 1: Standardize Query Keys**

```typescript
// ✅ Consistent query key factory
const expenseKeys = {
  all: ["expenses"] as const,
  lists: () => [...expenseKeys.all, "list"] as const,
  list: (userId: string) => [...expenseKeys.lists(), userId] as const,
  details: () => [...expenseKeys.all, "detail"] as const,
  detail: (id: number) => [...expenseKeys.details(), id] as const,
};

// Use consistently across all hooks
const useExpenses = (userId: string) => {
  return useQuery({
    queryKey: expenseKeys.list(userId), // Always use factory
    queryFn: () => fetchExpenses(userId),
  });
};
```

**Solution 2: Synchronize Related Caches**

```typescript
// ✅ Update all related caches
const updateExpenseInAllCaches = (
  queryClient: QueryClient,
  userId: string,
  updatedExpense: Expense
) => {
  // Update list cache
  expenseCacheUtils.updateItem(queryClient, userId, updatedExpense);

  // Update detail cache
  queryClient.setQueryData(
    expenseKeys.detail(updatedExpense.id),
    updatedExpense
  );

  // Update summary cache if affected
  const summaryKey = ["expense-summary", userId];
  const summaryData = queryClient.getQueryData(summaryKey);
  if (summaryData) {
    const updatedSummary = recalculateSummary(summaryData, updatedExpense);
    queryClient.setQueryData(summaryKey, updatedSummary);
  }
};
```

### 5. Performance Issues

#### Symptoms

- Slow cache operations
- UI freezes during updates
- High CPU usage
- Delayed response to user actions

#### Diagnostic Steps

```typescript
// Performance profiling
const profileCacheOperations = (queryClient: QueryClient) => {
  const originalSetQueryData = queryClient.setQueryData.bind(queryClient);
  const operationTimes: Record<string, number[]> = {};

  queryClient.setQueryData = function (queryKey, updater, options) {
    const keyString = JSON.stringify(queryKey);
    const startTime = performance.now();

    const result = originalSetQueryData(queryKey, updater, options);

    const duration = performance.now() - startTime;

    if (!operationTimes[keyString]) {
      operationTimes[keyString] = [];
    }
    operationTimes[keyString].push(duration);

    // Log slow operations
    if (duration > 50) {
      console.warn("Slow cache operation:", {
        queryKey,
        duration: duration.toFixed(2) + "ms",
        averageTime:
          (
            operationTimes[keyString].reduce((a, b) => a + b, 0) /
            operationTimes[keyString].length
          ).toFixed(2) + "ms",
      });
    }

    return result;
  };

  // Return function to get performance report
  return () => {
    const report: Record<string, any> = {};

    Object.entries(operationTimes).forEach(([key, times]) => {
      report[key] = {
        count: times.length,
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        total: times.reduce((a, b) => a + b, 0),
      };
    });

    return report;
  };
};
```

#### Solutions

**Solution 1: Optimize Cache Operations**

```typescript
// ❌ Slow - multiple individual operations
expenses.forEach((expense) => {
  expenseCacheUtils.updateItem(queryClient, userId, expense);
});

// ✅ Fast - batch operation
expenseCacheUtils.batchUpdate(queryClient, userId, expenses);
```

**Solution 2: Use Selective Updates**

```typescript
// ❌ Slow - updates entire object
const updateExpense = (updates: Partial<Expense>) => {
  const currentData = queryClient.getQueryData(queryKey);
  const updatedData = { ...currentData, ...updates };
  queryClient.setQueryData(queryKey, updatedData);
};

// ✅ Fast - updates only changed fields
const updateExpense = (updates: Partial<Expense>) => {
  queryClient.setQueryData(queryKey, (oldData: Expense) => {
    // Only update if values actually changed
    const hasChanges = Object.entries(updates).some(
      ([key, value]) => oldData[key] !== value
    );

    return hasChanges ? { ...oldData, ...updates } : oldData;
  });
};
```

## Advanced Troubleshooting

### 1. Cache State Inspector

```typescript
// Comprehensive cache inspection tool
export const cacheInspector = {
  inspectQuery: (queryClient: QueryClient, queryKey: QueryKey) => {
    const query = queryClient.getQueryCache().find({ queryKey });
    const state = query?.state;
    const data = queryClient.getQueryData(queryKey);

    return {
      exists: !!query,
      hasData: !!data,
      state: state
        ? {
            status: state.status,
            fetchStatus: state.fetchStatus,
            isStale: state.isStale,
            isLoading: state.isLoading,
            isError: state.isError,
            error: state.error,
            dataUpdatedAt: new Date(state.dataUpdatedAt),
            errorUpdatedAt: new Date(state.errorUpdatedAt),
          }
        : null,
      data,
      observers: query?.getObserversCount() || 0,
    };
  },

  inspectAllQueries: (queryClient: QueryClient, filter?: string) => {
    const queries = queryClient.getQueryCache().getAll();
    const filtered = filter
      ? queries.filter((q) => JSON.stringify(q.queryKey).includes(filter))
      : queries;

    return filtered.map((query) => ({
      queryKey: query.queryKey,
      status: query.state.status,
      hasData: !!query.state.data,
      isStale: query.state.isStale,
      observers: query.getObserversCount(),
      lastUpdated: new Date(query.state.dataUpdatedAt),
    }));
  },

  findStaleQueries: (queryClient: QueryClient) => {
    return queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => query.state.isStale)
      .map((query) => ({
        queryKey: query.queryKey,
        staleTime: Date.now() - query.state.dataUpdatedAt,
        hasObservers: query.getObserversCount() > 0,
      }));
  },

  findDuplicateQueries: (queryClient: QueryClient) => {
    const queries = queryClient.getQueryCache().getAll();
    const keyMap = new Map<string, typeof queries>();

    queries.forEach((query) => {
      const keyString = JSON.stringify(query.queryKey);
      if (!keyMap.has(keyString)) {
        keyMap.set(keyString, []);
      }
      keyMap.get(keyString)!.push(query);
    });

    return Array.from(keyMap.entries())
      .filter(([, queries]) => queries.length > 1)
      .map(([key, queries]) => ({
        queryKey: JSON.parse(key),
        duplicateCount: queries.length,
        queries: queries.map((q) => ({
          status: q.state.status,
          hasData: !!q.state.data,
          observers: q.getObserversCount(),
        })),
      }));
  },
};
```

### 2. Automated Health Checks

```typescript
// Automated cache health monitoring
export const cacheHealthMonitor = {
  startMonitoring: (queryClient: QueryClient, options = {}) => {
    const {
      interval = 30000, // 30 seconds
      maxStaleQueries = 10,
      maxMemoryUsage = 50 * 1024 * 1024, // 50MB
      onHealthIssue = console.warn,
    } = options;

    const checkHealth = () => {
      const health = {
        timestamp: new Date(),
        issues: [] as string[],
        metrics: {
          totalQueries: 0,
          staleQueries: 0,
          errorQueries: 0,
          memoryUsage: 0,
        },
      };

      // Check query states
      const queries = queryClient.getQueryCache().getAll();
      health.metrics.totalQueries = queries.length;

      const staleQueries = queries.filter((q) => q.state.isStale);
      health.metrics.staleQueries = staleQueries.length;

      const errorQueries = queries.filter((q) => q.state.isError);
      health.metrics.errorQueries = errorQueries.length;

      // Check for issues
      if (staleQueries.length > maxStaleQueries) {
        health.issues.push(`Too many stale queries: ${staleQueries.length}`);
      }

      if (errorQueries.length > 0) {
        health.issues.push(`Queries with errors: ${errorQueries.length}`);
      }

      // Check memory usage
      if (performance.memory) {
        health.metrics.memoryUsage = performance.memory.usedJSHeapSize;

        if (health.metrics.memoryUsage > maxMemoryUsage) {
          health.issues.push(
            `High memory usage: ${formatBytes(health.metrics.memoryUsage)}`
          );
        }
      }

      // Report issues
      if (health.issues.length > 0) {
        onHealthIssue("Cache health issues detected:", health);
      }

      return health;
    };

    const intervalId = setInterval(checkHealth, interval);

    return {
      stop: () => clearInterval(intervalId),
      checkNow: checkHealth,
    };
  },
};
```

### 3. Emergency Recovery Procedures

```typescript
// Emergency cache recovery tools
export const cacheRecovery = {
  // Clear all cache and start fresh
  emergencyReset: (queryClient: QueryClient) => {
    console.warn("Performing emergency cache reset...");

    queryClient.clear();
    queryClient.resetQueries();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    console.log("Cache reset complete");
  },

  // Remove problematic queries
  removeStaleQueries: (queryClient: QueryClient) => {
    const staleQueries = queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => query.state.isStale);

    console.log(`Removing ${staleQueries.length} stale queries...`);

    staleQueries.forEach((query) => {
      queryClient.getQueryCache().remove(query);
    });
  },

  // Fix cache inconsistencies
  repairCacheConsistency: (queryClient: QueryClient, userId: string) => {
    console.log("Repairing cache consistency...");

    // Remove duplicate queries
    const duplicates = cacheInspector.findDuplicateQueries(queryClient);
    duplicates.forEach(({ queryKey }) => {
      queryClient.removeQueries({ queryKey });
    });

    // Refetch critical data
    queryClient.invalidateQueries({
      queryKey: ["expenses", userId],
      refetchType: "active",
    });

    console.log("Cache consistency repair complete");
  },

  // Export cache state for debugging
  exportCacheState: (queryClient: QueryClient) => {
    const queries = queryClient.getQueryCache().getAll();

    const cacheState = queries.map((query) => ({
      queryKey: query.queryKey,
      state: {
        status: query.state.status,
        fetchStatus: query.state.fetchStatus,
        isStale: query.state.isStale,
        dataUpdatedAt: query.state.dataUpdatedAt,
        errorUpdatedAt: query.state.errorUpdatedAt,
        error: query.state.error?.message,
      },
      hasData: !!query.state.data,
      dataSize: query.state.data ? JSON.stringify(query.state.data).length : 0,
      observers: query.getObserversCount(),
    }));

    const exportData = {
      timestamp: new Date().toISOString(),
      totalQueries: queries.length,
      memoryUsage: performance.memory?.usedJSHeapSize || 0,
      queries: cacheState,
    };

    // Create downloadable file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cache-state-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);

    return exportData;
  },
};
```

## Troubleshooting Workflow

### Step 1: Identify the Problem

1. **Gather symptoms** - What is the user experiencing?
2. **Check console** - Any error messages or warnings?
3. **Monitor performance** - Is the app slow or unresponsive?
4. **Inspect network** - Are API calls failing or slow?

### Step 2: Diagnose the Issue

```typescript
// Run comprehensive diagnostics
const runDiagnostics = (queryClient: QueryClient, userId: string) => {
  console.log("=== Cache Diagnostics ===");

  // 1. Check cache state
  const cacheState = diagnoseCacheState(queryClient, userId);
  console.log("Cache State:", cacheState);

  // 2. Check for consistency issues
  checkCacheConsistency(queryClient, userId);

  // 3. Look for performance issues
  const performanceReport = profileCacheOperations(queryClient);
  console.log("Performance Report:", performanceReport());

  // 4. Check for memory leaks
  const memoryCheck = detectMemoryLeaks();

  // 5. Inspect specific queries
  const expenseInspection = cacheInspector.inspectQuery(queryClient, [
    "expenses",
    userId,
  ]);
  console.log("Expense Query Inspection:", expenseInspection);

  return {
    cacheState,
    performanceReport: performanceReport(),
    expenseInspection,
    memoryCheck,
  };
};
```

### Step 3: Apply Solutions

Based on the diagnosis, apply appropriate solutions:

1. **Data Issues** → Use cache refresh or repair procedures
2. **Performance Issues** → Optimize cache operations
3. **Memory Issues** → Fix leaks and implement cleanup
4. **Consistency Issues** → Standardize query keys and updates

### Step 4: Verify the Fix

```typescript
// Verify the fix worked
const verifyFix = (queryClient: QueryClient, userId: string) => {
  // Wait a moment for changes to take effect
  setTimeout(() => {
    const postFixDiagnostics = runDiagnostics(queryClient, userId);

    console.log("=== Post-Fix Verification ===");
    console.log("Issues resolved:", postFixDiagnostics);

    // Check if critical issues are resolved
    const criticalIssues = [
      postFixDiagnostics.cacheState.needsRefresh,
      postFixDiagnostics.memoryCheck,
      // Add other critical checks
    ].filter(Boolean);

    if (criticalIssues.length === 0) {
      console.log("✅ All critical issues resolved");
    } else {
      console.warn("⚠️ Some issues remain:", criticalIssues);
    }
  }, 2000);
};
```

## Prevention Strategies

### 1. Code Review Checklist

When reviewing cache-related code:

- [ ] Uses stable query keys
- [ ] Implements proper cache updates
- [ ] Has cleanup in useEffect hooks
- [ ] Uses stable dependencies
- [ ] Includes error handling
- [ ] Has performance considerations
- [ ] Includes appropriate tests

### 2. Development Tools

```typescript
// Development-only cache monitoring
if (process.env.NODE_ENV === "development") {
  // Enable cache debugging
  performanceDebugger.logSlowOperations(50);

  // Start health monitoring
  const healthMonitor = cacheHealthMonitor.startMonitoring(queryClient, {
    interval: 10000, // Check every 10 seconds in dev
    onHealthIssue: (message, health) => {
      console.warn(message, health);
      // Could also show toast notification
    },
  });

  // Add to window for manual debugging
  window.cacheDebug = {
    inspector: cacheInspector,
    recovery: cacheRecovery,
    diagnostics: runDiagnostics,
  };
}
```

### 3. Automated Testing

```typescript
// Automated cache health tests
describe('Cache Health', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('should not have memory leaks', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;

    // Perform operations that could cause leaks
    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<ExpenseComponent />, {
        wrapper: createQueryWrapper(queryClient),
      });
      unmount();
    }

    // Force garbage collection
    if (global.gc) global.gc();

    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const increase = finalMemory - initialMemory;

    expect(increase).toBeLessThan(1024 * 1024); // Less than 1MB
  });

  it('should maintain cache consistency', () => {
    const userId = 'test-user';
    const expense = createMockExpense();

    // Add expense
    expenseCacheUtils.addItem(queryClient, userId, expense);

    // Update expense
    const updatedExpense = { ...expense, name: 'Updated' };
    expenseCacheUtils.updateItem(queryClient, userId, updatedExpense);

    // Check consistency
    const cachedData = queryClient.getQueryData(['expenses', userId]);
    expect(cachedData).toContain(updatedExpense);
    expect(cachedData).not.toContain(expense);
  });
});
```

## Getting Help

### When to Escalate

Escalate cache issues when:

- Emergency recovery procedures don't resolve the issue
- Memory usage continues to increase despite fixes
- Performance degradation affects user experience
- Data corruption or loss occurs
- Multiple users report similar issues

### Information to Provide

When reporting cache issues, include:

1. **Symptoms** - Detailed description of the problem
2. **Steps to reproduce** - How to trigger the issue
3. **Diagnostics output** - Results from diagnostic tools
4. **Cache state export** - Current cache state
5. **Browser/environment info** - Version, device, network
6. **Recent changes** - Any code changes that might be related

### Useful Debug Commands

```typescript
// Quick debug commands for browser console
window.debugCache = {
  // Inspect current cache state
  inspect: () => cacheInspector.inspectAllQueries(queryClient, "expenses"),

  // Check for issues
  health: () => cacheHealthMonitor.checkNow(),

  // Emergency reset
  reset: () => cacheRecovery.emergencyReset(queryClient),

  // Export state for analysis
  export: () => cacheRecovery.exportCacheState(queryClient),
};
```

This troubleshooting guide should help you quickly identify and resolve most cache-related issues in the expense management features.
