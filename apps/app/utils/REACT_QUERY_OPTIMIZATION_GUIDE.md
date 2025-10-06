# React Query Optimization Guide

## Overview

This guide documents the comprehensive React Query optimization patterns implemented across all expense management features. These patterns were developed to eliminate performance issues, prevent stack overflow errors, and provide consistent cache management throughout the application.

## Core Principles

### 1. Precise Cache Updates Over Broad Invalidations

**❌ Avoid:**

```typescript
// Broad invalidation causes unnecessary refetches
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
};
```

**✅ Prefer:**

```typescript
// Precise cache updates maintain performance
onSuccess: (data) => {
  expenseCacheUtils.updateItem(queryClient, userId, data);
};
```

### 2. Stable Data References

**❌ Avoid:**

```typescript
// Unstable references cause unnecessary re-renders
const { data: expenses } = useExpenses(userId);
```

**✅ Prefer:**

```typescript
// Stable selectors prevent re-render cascades
const expenses = useStableExpenses(userId);
```

### 3. Eliminate Local State Duplication

**❌ Avoid:**

```typescript
// Duplicated state creates sync issues
const [expenses, setExpenses] = useState([]);
const { data } = useExpenses(userId);

useEffect(() => {
  if (data) setExpenses(data);
}, [data]);
```

**✅ Prefer:**

```typescript
// Single source of truth in React Query
const expenses = useStableExpenses(userId);
```

## Cache Utility Patterns

### Generic Cache Utils Framework

The application uses a generic cache utilities framework that provides type-safe operations for any data structure:

```typescript
interface CacheUtilsConfig<T> {
  queryKeyFactory: (userId: string) => QueryKey;
  sortComparator: (a: T, b: T) => number;
  validateItem: (item: T) => string[];
  createOptimisticItem: (data: Partial<T>, userId: string) => T;
}

const createCacheUtils = <T>(config: CacheUtilsConfig<T>) => ({
  addItem: (queryClient: QueryClient, userId: string, item: T) => void,
  updateItem: (queryClient: QueryClient, userId: string, item: T) => void,
  removeItem: (queryClient: QueryClient, userId: string, itemId: number) => void,
  // ... other operations
});
```

### Specialized Cache Utils

#### 1. Fixed Expenses (Array-based)

```typescript
import { expenseCacheUtils } from "@/utils/query-cache-utils";

// Add new expense
expenseCacheUtils.addExpense(queryClient, userId, newExpense);

// Update existing expense
expenseCacheUtils.updateExpense(queryClient, userId, updatedExpense);

// Remove expense
expenseCacheUtils.removeExpense(queryClient, userId, expenseId);

// Reorder expenses
expenseCacheUtils.reorderExpenses(queryClient, userId, reorderedExpenses);
```

#### 2. Billable Costs (Single Object)

```typescript
import { billableCacheUtils } from "@/utils/billable-cost-cache-utils";

// Update billable cost settings
billableCacheUtils.updateBillableData(queryClient, userId, updatedData);

// Reset to defaults
billableCacheUtils.resetBillableData(queryClient, userId);
```

#### 3. Equipment Expenses (Array-based with Ranking)

```typescript
import { equipmentCacheUtils } from "@/utils/equipment-cache-utils";

// Add equipment with automatic ranking
equipmentCacheUtils.addEquipment(queryClient, userId, newEquipment);

// Update equipment preserving rank
equipmentCacheUtils.updateEquipment(queryClient, userId, updatedEquipment);

// Batch update for drag-and-drop
equipmentCacheUtils.batchUpdateRanks(queryClient, userId, rankUpdates);
```

## Stable Data Selectors

### Purpose

Stable data selectors prevent unnecessary re-renders by maintaining referential stability of data objects and arrays.

### Implementation Pattern

```typescript
function useStableData<T>(
  queryResult: UseQueryResult<T[]>,
  sortComparator?: (a: T, b: T) => number
): T[] {
  const stableData = useMemo(() => {
    if (!queryResult.data) return [];

    const sorted = sortComparator
      ? [...queryResult.data].sort(sortComparator)
      : queryResult.data;

    return sorted;
  }, [queryResult.data, sortComparator]);

  return stableData;
}
```

### Usage Examples

```typescript
// Fixed expenses with rank sorting
const expenses = useStableExpenses(userId);

// Equipment with custom sorting
const equipment = useStableEquipment(userId);

// Billable cost (single object)
const billableData = useStableBillable(userId);
```

## Optimistic Updates

### Pattern Implementation

```typescript
const useOptimizedMutation = <TData, TVariables>({
  mutationFn,
  cacheUtils,
  optimisticUpdate,
  onSuccessUpdate,
}: MutationConfig<TData, TVariables>) => {
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: getQueryKey(userId) });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(getQueryKey(userId));

      // Optimistically update
      if (optimisticUpdate) {
        const optimisticData = optimisticUpdate(variables);
        cacheUtils.updateItem(queryClient, userId, optimisticData);
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(getQueryKey(userId), context.previousData);
      }
    },
    onSuccess: (data, variables) => {
      // Replace optimistic update with real data
      if (onSuccessUpdate) {
        const finalData = onSuccessUpdate(data, variables);
        cacheUtils.updateItem(queryClient, userId, finalData);
      }
    },
  });
};
```

## Performance Monitoring

### Cache Operation Logging

```typescript
import { cacheLogger } from "@/utils/query-cache-utils";

// Automatic logging in cache utils
const loggedOperation = cacheLogger.logOperation(
  "updateExpense",
  () => updateExpenseInCache(queryClient, userId, expense),
  { userId, expenseId: expense.id }
);
```

### Performance Metrics

```typescript
import { performanceMonitor } from "@/utils/performance-monitor";

// Track operation performance
const metrics = performanceMonitor.getMetrics();
console.log("Cache operations:", metrics.operationCount);
console.log("Average duration:", metrics.averageDuration);
console.log("Error rate:", metrics.errorRate);
```

### Memory Leak Detection

```typescript
import { memoryLeakDetector } from "@/utils/memory-leak-detection";

// Check for potential leaks
const hasLeaks = memoryLeakDetector.detectLeaks();
if (hasLeaks) {
  console.warn("Potential memory leaks detected");
}
```

## Error Handling

### Standardized Error Types

```typescript
interface CacheError extends Error {
  operation: CacheOperation;
  userId: string;
  itemId?: number;
  context?: CacheOperationContext;
  recoverable: boolean;
  retryable: boolean;
}
```

### Circuit Breaker Pattern

```typescript
import { cacheCircuitBreaker } from "@/utils/circuit-breaker";

// Protected cache operation
const result = await cacheCircuitBreaker.execute(async () => {
  return expenseCacheUtils.addExpense(queryClient, userId, expense);
});
```

### Retry Logic

```typescript
import { retryWithBackoff } from "@/utils/retry-with-backoff";

// Automatic retry for failed operations
const result = await retryWithBackoff(() => mutationFn(variables), {
  maxRetries: 3,
  baseDelay: 1000,
});
```

## Best Practices

### 1. Hook Dependencies

```typescript
// ✅ Stable dependencies prevent infinite loops
const memoizedCallback = useCallback(
  (data) => {
    // operation
  },
  [stableUserId, stableConfig]
);

// ❌ Avoid unstable dependencies
const badCallback = useCallback(
  (data) => {
    // operation
  },
  [user, config]
); // Objects change on every render
```

### 2. Component Memoization

```typescript
// ✅ Memo components with stable props
const ExpenseItem = React.memo(
  ({ expense, onUpdate }) => {
    // component implementation
  },
  (prevProps, nextProps) => {
    return (
      prevProps.expense.id === nextProps.expense.id &&
      prevProps.expense.updatedAt === nextProps.expense.updatedAt
    );
  }
);
```

### 3. Query Key Management

```typescript
// ✅ Consistent query key factories
const expenseKeys = {
  all: ["expenses"] as const,
  lists: () => [...expenseKeys.all, "list"] as const,
  list: (userId: string) => [...expenseKeys.lists(), userId] as const,
  details: () => [...expenseKeys.all, "detail"] as const,
  detail: (id: number) => [...expenseKeys.details(), id] as const,
};
```

### 4. Testing Cache Operations

```typescript
// Test cache utilities
describe("expenseCacheUtils", () => {
  it("should add expense to cache", () => {
    const queryClient = new QueryClient();
    const expense = createMockExpense();

    expenseCacheUtils.addExpense(queryClient, userId, expense);

    const cachedData = queryClient.getQueryData(expenseKeys.list(userId));
    expect(cachedData).toContain(expense);
  });
});
```

## Common Pitfalls

### 1. Infinite Re-render Loops

**Problem:** Unstable dependencies in useEffect or useMemo
**Solution:** Use stable selectors and proper dependency arrays

### 2. Memory Leaks

**Problem:** Retained references to large objects
**Solution:** Implement proper cleanup and use weak references

### 3. Cache Inconsistency

**Problem:** Multiple sources of truth for the same data
**Solution:** Single source of truth in React Query cache

### 4. Performance Degradation

**Problem:** Broad cache invalidations
**Solution:** Precise cache updates using utilities

## Migration Checklist

When optimizing existing features:

- [ ] Replace `invalidateQueries` with precise cache updates
- [ ] Implement stable data selectors
- [ ] Add optimistic updates for mutations
- [ ] Eliminate local state duplication
- [ ] Add error handling and rollback mechanisms
- [ ] Implement performance monitoring
- [ ] Add comprehensive tests
- [ ] Update component memoization
- [ ] Verify no memory leaks
- [ ] Document any feature-specific patterns

## Resources

- [Cache Utilities Documentation](./GENERIC_CACHE_UTILS_README.md)
- [Performance Monitoring Guide](./ENHANCED_PERFORMANCE_MONITORING_README.md)
- [Debugging Tools Guide](./DEBUGGING_TOOLS_README.md)
- [Error Handling Documentation](./COMPREHENSIVE_ERROR_HANDLING_README.md)
