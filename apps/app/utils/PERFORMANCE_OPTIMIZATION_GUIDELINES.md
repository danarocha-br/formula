# Performance Optimization Guidelines

## Overview

This document provides comprehensive guidelines for optimizing React Query performance across all expense management features. These guidelines are based on real-world performance issues encountered and resolved in the application.

## Core Performance Principles

### 1. Minimize Cache Operations

**Principle:** Every cache operation has a cost. Minimize unnecessary operations.

```typescript
// ❌ Expensive: Multiple separate operations
expenses.forEach((expense) => {
  expenseCacheUtils.updateItem(queryClient, userId, expense);
});

// ✅ Efficient: Single batch operation
expenseCacheUtils.batchUpdate(queryClient, userId, expenses);
```

### 2. Use Precise Cache Updates

**Principle:** Precise updates are always faster than broad invalidations.

```typescript
// ❌ Slow: Broad invalidation triggers refetch
queryClient.invalidateQueries({ queryKey: ["expenses"] });

// ✅ Fast: Precise update uses cached data
expenseCacheUtils.updateItem(queryClient, userId, updatedExpense);
```

### 3. Maintain Referential Stability

**Principle:** Stable references prevent unnecessary re-renders.

```typescript
// ❌ Unstable: New array on every render
const sortedExpenses = expenses.sort((a, b) => a.rank - b.rank);

// ✅ Stable: Memoized with proper dependencies
const sortedExpenses = useMemo(
  () => expenses.sort((a, b) => a.rank - b.rank),
  [expenses]
);
```

## Performance Optimization Strategies

### 1. Query Optimization

#### 1.1 Query Key Structure

```typescript
// ✅ Hierarchical query keys for efficient invalidation
const expenseKeys = {
  all: ["expenses"] as const,
  lists: () => [...expenseKeys.all, "list"] as const,
  list: (userId: string) => [...expenseKeys.lists(), userId] as const,
  details: () => [...expenseKeys.all, "detail"] as const,
  detail: (id: number) => [...expenseKeys.details(), id] as const,
};

// Efficient partial invalidation
queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
```

#### 1.2 Query Options Optimization

```typescript
// ✅ Optimized query configuration
const useExpenses = (userId: string) => {
  return useQuery({
    queryKey: expenseKeys.list(userId),
    queryFn: () => fetchExpenses(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Only refetch if data is stale
    refetchOnReconnect: "always",
  });
};
```

#### 1.3 Selective Data Fetching

```typescript
// ✅ Fetch only necessary data
const useExpenseSummary = (userId: string) => {
  return useQuery({
    queryKey: ["expense-summary", userId],
    queryFn: () => fetchExpenseSummary(userId), // Lighter endpoint
    select: (data) => ({
      total: data.total,
      count: data.count,
      // Only select needed fields
    }),
  });
};
```

### 2. Cache Management Optimization

#### 2.1 Batch Operations

```typescript
// ✅ Batch multiple cache updates
export const batchCacheOperations = (
  queryClient: QueryClient,
  userId: string,
  operations: CacheOperation[]
) => {
  // Suspend cache notifications
  queryClient.getQueryCache().config.onSuccess = undefined;

  try {
    operations.forEach((op) => {
      switch (op.type) {
        case "add":
          expenseCacheUtils.addItem(queryClient, userId, op.data);
          break;
        case "update":
          expenseCacheUtils.updateItem(queryClient, userId, op.data);
          break;
        case "remove":
          expenseCacheUtils.removeItem(queryClient, userId, op.id);
          break;
      }
    });
  } finally {
    // Re-enable notifications and trigger single update
    queryClient.getQueryCache().config.onSuccess = defaultOnSuccess;
    queryClient.invalidateQueries({ queryKey: expenseKeys.list(userId) });
  }
};
```

#### 2.2 Smart Cache Invalidation

```typescript
// ✅ Conditional invalidation based on data changes
const smartInvalidation = (
  queryClient: QueryClient,
  userId: string,
  changes: DataChanges
) => {
  // Only invalidate affected queries
  if (changes.affectsLists) {
    queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
  }

  if (changes.affectsDetails) {
    changes.affectedIds.forEach((id) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(id) });
    });
  }

  if (changes.affectsSummary) {
    queryClient.invalidateQueries({ queryKey: ["expense-summary", userId] });
  }
};
```

#### 2.3 Cache Size Management

```typescript
// ✅ Implement cache size limits
const configureCacheSize = (queryClient: QueryClient) => {
  queryClient.setDefaultOptions({
    queries: {
      cacheTime: 10 * 60 * 1000, // 10 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

  // Periodic cache cleanup
  setInterval(
    () => {
      queryClient.getQueryCache().clear();
    },
    30 * 60 * 1000
  ); // Every 30 minutes
};
```

### 3. Component Optimization

#### 3.1 Memoization Strategies

```typescript
// ✅ Proper component memoization
const ExpenseItem = React.memo(({
  expense,
  onUpdate,
  onDelete
}: ExpenseItemProps) => {
  // Memoize expensive calculations
  const calculatedValues = useMemo(() => ({
    monthlyAmount: expense.amount / 12,
    dailyAmount: expense.amount / 365,
    formattedAmount: formatCurrency(expense.amount),
  }), [expense.amount]);

  // Memoize event handlers
  const handleUpdate = useCallback((updates: Partial<Expense>) => {
    onUpdate({ ...expense, ...updates });
  }, [expense, onUpdate]);

  return (
    <div>
      <span>{calculatedValues.formattedAmount}</span>
      <button onClick={() => handleUpdate({ name: 'New Name' })}>
        Update
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.expense.id === nextProps.expense.id &&
    prevProps.expense.updatedAt === nextProps.expense.updatedAt
  );
});
```

#### 3.2 Virtual Scrolling for Large Lists

```typescript
// ✅ Virtual scrolling for performance with large datasets
import { FixedSizeList as List } from 'react-window';

const ExpenseList = ({ expenses }: { expenses: Expense[] }) => {
  const Row = useCallback(({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <ExpenseItem expense={expenses[index]} />
    </div>
  ), [expenses]);

  return (
    <List
      height={600}
      itemCount={expenses.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

#### 3.3 Debounced Updates

```typescript
// ✅ Debounce frequent updates
import { useDebouncedCallback } from 'use-debounce';

const ExpenseForm = ({ expense, onUpdate }: ExpenseFormProps) => {
  const [localValue, setLocalValue] = useState(expense.amount);

  const debouncedUpdate = useDebouncedCallback(
    (value: number) => {
      onUpdate({ ...expense, amount: value });
    },
    500 // 500ms delay
  );

  const handleChange = (value: number) => {
    setLocalValue(value);
    debouncedUpdate(value);
  };

  return (
    <input
      value={localValue}
      onChange={(e) => handleChange(Number(e.target.value))}
    />
  );
};
```

### 4. Memory Management

#### 4.1 Prevent Memory Leaks

```typescript
// ✅ Proper cleanup in useEffect
const ExpenseComponent = () => {
  useEffect(() => {
    const subscription = expenseService.subscribe(handleUpdate);
    const interval = setInterval(refreshData, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Component implementation
};
```

#### 4.2 Weak References for Large Objects

```typescript
// ✅ Use weak references for cached calculations
const calculationCache = new WeakMap<Expense, CalculatedValues>();

const getCalculatedValues = (expense: Expense): CalculatedValues => {
  if (calculationCache.has(expense)) {
    return calculationCache.get(expense)!;
  }

  const calculated = performExpensiveCalculation(expense);
  calculationCache.set(expense, calculated);
  return calculated;
};
```

#### 4.3 Memory Monitoring

```typescript
// ✅ Monitor memory usage
const useMemoryMonitoring = () => {
  useEffect(() => {
    const monitor = setInterval(() => {
      if (performance.memory) {
        const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
        const usage = (usedJSHeapSize / totalJSHeapSize) * 100;

        if (usage > 80) {
          console.warn("High memory usage detected:", usage + "%");
          // Trigger cleanup or alert
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(monitor);
  }, []);
};
```

## Performance Monitoring

### 1. Real-time Performance Tracking

```typescript
// ✅ Track operation performance
export const performanceTracker = {
  trackOperation: <T>(
    operationName: string,
    operation: () => T,
    context?: Record<string, any>
  ): T => {
    const startTime = performance.now();

    try {
      const result = operation();
      const duration = performance.now() - startTime;

      // Log slow operations
      if (duration > 100) {
        console.warn(`Slow operation detected: ${operationName}`, {
          duration,
          context,
        });
      }

      // Store metrics
      performanceMetrics.recordOperation(operationName, duration);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      performanceMetrics.recordError(operationName, duration, error);
      throw error;
    }
  },
};
```

### 2. Performance Metrics Collection

```typescript
// ✅ Collect and analyze performance metrics
class PerformanceMetrics {
  private operations: Map<string, OperationMetric[]> = new Map();

  recordOperation(name: string, duration: number) {
    if (!this.operations.has(name)) {
      this.operations.set(name, []);
    }

    const metrics = this.operations.get(name)!;
    metrics.push({
      duration,
      timestamp: Date.now(),
    });

    // Keep only recent metrics (last 100 operations)
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  getMetrics(operationName: string): PerformanceReport {
    const metrics = this.operations.get(operationName) || [];

    if (metrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0 };
    }

    const durations = metrics.map((m) => m.duration);

    return {
      count: metrics.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      recent: durations.slice(-10), // Last 10 operations
    };
  }

  generateReport(): PerformanceReport {
    const report: PerformanceReport = {};

    for (const [operationName] of this.operations) {
      report[operationName] = this.getMetrics(operationName);
    }

    return report;
  }
}
```

### 3. Automated Performance Testing

```typescript
// ✅ Automated performance regression detection
export const performanceTests = {
  async testCacheOperations() {
    const queryClient = new QueryClient();
    const userId = 'test-user';
    const testData = generateTestExpenses(1000);

    // Test batch operations
    const batchStart = performance.now();
    expenseCacheUtils.batchUpdate(queryClient, userId, testData);
    const batchDuration = performance.now() - batchStart;

    // Test individual operations
    const individualStart = performance.now();
    testData.forEach(expense => {
      expenseCacheUtils.updateItem(queryClient, userId, expense);
    });
    const individualDuration = performance.now() - individualStart;

    // Batch should be significantly faster
    const improvement = individualDuration / batchDuration;
    expect(improvement).toBeGreaterThan(5); // At least 5x faster

    return {
      batchDuration,
      individualDuration,
      improvement,
    };
  },

  async testMemoryUsage() {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;

    // Perform operations that should not leak memory
    for (let i = 0; i < 100; i++) {
      const component = render(<ExpenseComponent />);
      component.unmount();
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be minimal
    expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB

    return {
      initialMemory,
      finalMemory,
      memoryIncrease,
    };
  },
};
```

## Performance Benchmarks

### 1. Target Performance Metrics

```typescript
// Performance targets for different operations
export const performanceTargets = {
  cacheOperations: {
    singleUpdate: 5, // ms
    batchUpdate: 50, // ms for 100 items
    queryInvalidation: 10, // ms
  },

  componentRendering: {
    initialRender: 100, // ms
    reRender: 16, // ms (60fps)
    listRender: 200, // ms for 1000 items
  },

  memoryUsage: {
    maxIncrease: 1024 * 1024, // 1MB per operation cycle
    maxTotal: 50 * 1024 * 1024, // 50MB total
  },

  networkOperations: {
    mutation: 1000, // ms
    query: 500, // ms
    retry: 2000, // ms with backoff
  },
};
```

### 2. Performance Monitoring Dashboard

```typescript
// ✅ Real-time performance dashboard
export const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const currentMetrics = performanceMetrics.generateReport();
      setMetrics(currentMetrics);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="performance-dashboard">
      <h2>Performance Metrics</h2>

      {Object.entries(metrics).map(([operation, metric]) => (
        <div key={operation} className="metric-card">
          <h3>{operation}</h3>
          <div>Average: {metric.average.toFixed(2)}ms</div>
          <div>Count: {metric.count}</div>
          <div>Min: {metric.min.toFixed(2)}ms</div>
          <div>Max: {metric.max.toFixed(2)}ms</div>

          {metric.average > performanceTargets.cacheOperations.singleUpdate && (
            <div className="warning">⚠️ Performance below target</div>
          )}
        </div>
      ))}
    </div>
  );
};
```

## Troubleshooting Performance Issues

### 1. Common Performance Problems

#### Problem: Slow Cache Updates

```typescript
// ❌ Problematic pattern
const updateExpense = (expense: Expense) => {
  // Multiple separate cache operations
  queryClient.setQueryData(["expense", expense.id], expense);
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
  queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
};

// ✅ Optimized solution
const updateExpense = (expense: Expense) => {
  // Single precise update
  expenseCacheUtils.updateItem(queryClient, userId, expense);
};
```

#### Problem: Memory Leaks

```typescript
// ❌ Memory leak pattern
useEffect(() => {
  const subscription = dataService.subscribe(callback);
  // Missing cleanup
}, []);

// ✅ Proper cleanup
useEffect(() => {
  const subscription = dataService.subscribe(callback);
  return () => subscription.unsubscribe();
}, []);
```

#### Problem: Infinite Re-renders

```typescript
// ❌ Unstable dependencies
useEffect(() => {
  fetchData();
}, [user, config]); // Objects change on every render

// ✅ Stable dependencies
const stableUserId = user?.id;
const stableConfigId = config?.id;
useEffect(() => {
  fetchData();
}, [stableUserId, stableConfigId]);
```

### 2. Performance Debugging Tools

```typescript
// ✅ Debug performance issues
export const performanceDebugger = {
  logSlowOperations: (threshold = 100) => {
    const originalSetQueryData = QueryClient.prototype.setQueryData;

    QueryClient.prototype.setQueryData = function (queryKey, updater, options) {
      const start = performance.now();
      const result = originalSetQueryData.call(
        this,
        queryKey,
        updater,
        options
      );
      const duration = performance.now() - start;

      if (duration > threshold) {
        console.warn("Slow cache operation:", {
          queryKey,
          duration,
          stack: new Error().stack,
        });
      }

      return result;
    };
  },

  trackRerenders: (componentName: string) => {
    let renderCount = 0;

    return () => {
      renderCount++;
      console.log(`${componentName} rendered ${renderCount} times`);

      if (renderCount > 10) {
        console.warn(`${componentName} may have excessive re-renders`);
      }
    };
  },
};
```

## Best Practices Summary

### Do's ✅

1. **Use precise cache updates** instead of broad invalidations
2. **Implement stable data selectors** to prevent unnecessary re-renders
3. **Batch multiple operations** when possible
4. **Memoize expensive calculations** and event handlers
5. **Clean up subscriptions and intervals** in useEffect
6. **Monitor performance metrics** in development and production
7. **Test for memory leaks** regularly
8. **Use virtual scrolling** for large lists
9. **Debounce frequent updates** like form inputs
10. **Implement proper error boundaries** and fallbacks

### Don'ts ❌

1. **Don't use `invalidateQueries`** without specific query keys
2. **Don't duplicate state** between local state and React Query
3. **Don't ignore memory cleanup** in useEffect hooks
4. **Don't use unstable objects** as dependencies
5. **Don't perform expensive operations** in render functions
6. **Don't ignore performance warnings** in development
7. **Don't skip performance testing** for new features
8. **Don't use inline objects** as props to memoized components
9. **Don't forget to implement loading states** for better UX
10. **Don't ignore error handling** in cache operations

## Performance Checklist

Use this checklist when implementing or reviewing expense features:

### Cache Management

- [ ] Uses precise cache updates instead of invalidations
- [ ] Implements optimistic updates for mutations
- [ ] Has proper error handling and rollback mechanisms
- [ ] Batches multiple operations when possible
- [ ] Monitors cache operation performance

### Component Performance

- [ ] Uses stable data selectors
- [ ] Implements proper memoization
- [ ] Has stable dependencies in hooks
- [ ] Cleans up subscriptions and intervals
- [ ] Uses virtual scrolling for large lists

### Memory Management

- [ ] No memory leaks detected in testing
- [ ] Proper cleanup in all useEffect hooks
- [ ] Uses weak references for large cached objects
- [ ] Monitors memory usage in development

### Testing

- [ ] Has performance tests for critical operations
- [ ] Tests for memory leaks
- [ ] Benchmarks against performance targets
- [ ] Includes regression tests for performance

### Monitoring

- [ ] Implements performance tracking
- [ ] Has alerting for performance degradation
- [ ] Generates regular performance reports
- [ ] Includes debugging tools for development

Following these guidelines will ensure optimal performance across all expense management features while maintaining code quality and user experience.
