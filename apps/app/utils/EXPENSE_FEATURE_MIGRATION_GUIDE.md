# Expense Feature Migration Guide

## Overview

This guide provides step-by-step instructions for migrating existing expense features or creating new ones using the optimized React Query patterns. Follow this guide to ensure consistency, performance, and maintainability across all expense management features.

## Migration Process

### Phase 1: Assessment and Planning

#### 1.1 Analyze Current Implementation

Before starting migration, assess the current feature:

```typescript
// Checklist for current implementation analysis
const assessmentChecklist = {
  // Data fetching patterns
  usesInvalidateQueries: boolean, // ❌ Needs migration
  usesPreciseCacheUpdates: boolean, // ✅ Already optimized
  hasLocalStateDuplication: boolean, // ❌ Needs migration
  usesStableSelectors: boolean, // ✅ Already optimized

  // Performance patterns
  hasOptimisticUpdates: boolean, // ✅ Good performance
  hasProperErrorHandling: boolean, // ✅ Robust implementation
  hasMemoryLeaks: boolean, // ❌ Needs fixing
  hasInfiniteLoops: boolean, // ❌ Critical issue

  // Testing coverage
  hasUnitTests: boolean, // ✅ Well tested
  hasIntegrationTests: boolean, // ✅ Well tested
  hasPerformanceTests: boolean, // ✅ Performance verified
};
```

#### 1.2 Identify Data Patterns

Determine the data structure pattern for your feature:

```typescript
// Pattern A: Array-based data (like fixed expenses, equipment)
interface ArrayBasedExpense {
  id: number;
  userId: string;
  rank?: number; // For sortable items
  // ... other properties
}

// Pattern B: Single object data (like billable costs)
interface SingleObjectExpense {
  userId: string;
  // ... configuration properties
}

// Pattern C: Nested/complex data
interface ComplexExpense {
  id: number;
  userId: string;
  items: SubItem[];
  metadata: ExpenseMetadata;
}
```

### Phase 2: Create Cache Utilities

#### 2.1 For Array-Based Data

```typescript
// Create specialized cache utilities
// File: utils/[feature-name]-cache-utils.ts

import { createGenericCacheUtils } from "./generic-cache-utils";
import type { YourExpenseType } from "../types";

const config = {
  queryKeyFactory: (userId: string) => ["your-expenses", userId],
  sortComparator: (a: YourExpenseType, b: YourExpenseType) => {
    // Define sorting logic (e.g., by rank, date, name)
    return (a.rank || 0) - (b.rank || 0);
  },
  validateItem: (item: YourExpenseType) => {
    const errors: string[] = [];
    if (!item.name) errors.push("Name is required");
    if (item.amount < 0) errors.push("Amount must be positive");
    return errors;
  },
  createOptimisticItem: (data: Partial<YourExpenseType>, userId: string) =>
    ({
      id: Date.now(), // Temporary ID
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    }) as YourExpenseType,
};

export const yourExpenseCacheUtils = createGenericCacheUtils(config);

// Add feature-specific utilities if needed
export const yourExpenseSpecificUtils = {
  // Custom operations specific to your feature
  bulkUpdateCategories: (
    queryClient: QueryClient,
    userId: string,
    categoryUpdates: CategoryUpdate[]
  ) => {
    // Implementation
  },

  calculateTotals: (
    queryClient: QueryClient,
    userId: string
  ): ExpenseTotals => {
    // Implementation
  },
};
```

#### 2.2 For Single Object Data

```typescript
// File: utils/[feature-name]-cache-utils.ts

import type { YourConfigType } from "../types";

export const yourConfigCacheUtils = {
  updateConfig: (
    queryClient: QueryClient,
    userId: string,
    updates: Partial<YourConfigType>
  ) => {
    const queryKey = ["your-config", userId];
    const currentData = queryClient.getQueryData<YourConfigType>(queryKey);

    if (currentData) {
      const updatedData = { ...currentData, ...updates };
      queryClient.setQueryData(queryKey, updatedData);

      // Log operation
      cacheLogger.logOperation("updateConfig", () => {}, {
        userId,
        operation: "update",
        changes: Object.keys(updates),
      });
    }
  },

  resetConfig: (queryClient: QueryClient, userId: string) => {
    const queryKey = ["your-config", userId];
    queryClient.removeQueries({ queryKey });

    cacheLogger.logOperation("resetConfig", () => {}, { userId });
  },
};
```

### Phase 3: Implement Stable Data Selectors

#### 3.1 Create Stable Hook

```typescript
// File: hooks/use-stable-[feature-name].ts

import { useMemo } from "react";
import type { YourExpenseType } from "../types";
import { useYourExpenses } from "./use-your-expenses";

export function useStableYourExpenses(userId: string): YourExpenseType[] {
  const queryResult = useYourExpenses(userId);

  const stableData = useMemo(() => {
    if (!queryResult.data) return [];

    // Sort data consistently
    const sorted = [...queryResult.data].sort((a, b) => {
      return (a.rank || 0) - (b.rank || 0);
    });

    return sorted;
  }, [queryResult.data]);

  return stableData;
}

// For single object data
export function useStableYourConfig(userId: string): YourConfigType | null {
  const queryResult = useYourConfig(userId);

  const stableData = useMemo(() => {
    return queryResult.data || null;
  }, [queryResult.data]);

  return stableData;
}
```

#### 3.2 Add Loading and Error States

```typescript
export function useStableYourExpensesWithState(userId: string) {
  const queryResult = useYourExpenses(userId);
  const stableData = useStableYourExpenses(userId);

  return {
    data: stableData,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
```

### Phase 4: Migrate Mutation Hooks

#### 4.1 Replace Invalidation with Precise Updates

**Before (❌):**

```typescript
export const useCreateYourExpense = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: createYourExpense,
    onSettled: () => {
      // ❌ Broad invalidation
      queryClient.invalidateQueries({ queryKey: ["your-expenses"] });
    },
  });
};
```

**After (✅):**

```typescript
export const useCreateYourExpense = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: createYourExpense,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["your-expenses", userId],
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(["your-expenses", userId]);

      // Optimistically update
      const optimisticItem = yourExpenseCacheUtils.createOptimisticItem(
        variables,
        userId
      );
      yourExpenseCacheUtils.addItem(queryClient, userId, optimisticItem);

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["your-expenses", userId],
          context.previousData
        );
      }
    },
    onSuccess: (data) => {
      // Replace optimistic update with real data
      yourExpenseCacheUtils.replaceTempItem(queryClient, userId, data);
    },
  });
};
```

#### 4.2 Implement All CRUD Operations

```typescript
// Create
export const useCreateYourExpense = () => {
  // Implementation above
};

// Update
export const useUpdateYourExpense = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: updateYourExpense,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: ["your-expenses", userId],
      });

      const previousData = queryClient.getQueryData(["your-expenses", userId]);

      // Optimistic update
      yourExpenseCacheUtils.updateItem(queryClient, userId, variables);

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["your-expenses", userId],
          context.previousData
        );
      }
    },
    onSuccess: (data) => {
      yourExpenseCacheUtils.updateItem(queryClient, userId, data);
    },
  });
};

// Delete
export const useDeleteYourExpense = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: deleteYourExpense,
    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({
        queryKey: ["your-expenses", userId],
      });

      const previousData = queryClient.getQueryData(["your-expenses", userId]);

      // Optimistic removal
      yourExpenseCacheUtils.removeItem(queryClient, userId, expenseId);

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["your-expenses", userId],
          context.previousData
        );
      }
    },
  });
};
```

### Phase 5: Update Components

#### 5.1 Replace Local State with Stable Selectors

**Before (❌):**

```typescript
const YourExpenseComponent = () => {
  const [expenses, setExpenses] = useState([]);
  const { data } = useYourExpenses(userId);

  useEffect(() => {
    if (data) {
      setExpenses(data);
    }
  }, [data]);

  // Component uses expenses state
};
```

**After (✅):**

```typescript
const YourExpenseComponent = () => {
  const expenses = useStableYourExpenses(userId);

  // Component uses expenses directly
};
```

#### 5.2 Optimize Component Memoization

```typescript
const YourExpenseItem = React.memo(
  ({
    expense,
    onUpdate,
    onDelete,
  }: {
    expense: YourExpenseType;
    onUpdate: (expense: YourExpenseType) => void;
    onDelete: (id: number) => void;
  }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Custom comparison for optimal re-rendering
    return (
      prevProps.expense.id === nextProps.expense.id &&
      prevProps.expense.updatedAt === nextProps.expense.updatedAt
    );
  }
);
```

#### 5.3 Implement Drag-and-Drop (if applicable)

```typescript
const YourExpenseList = () => {
  const expenses = useStableYourExpenses(userId);
  const updateBatchMutation = useUpdateBatchYourExpenses();

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const reorderedExpenses = reorderArray(
      expenses,
      result.source.index,
      result.destination.index
    );

    // Update ranks and send to server
    const rankUpdates = reorderedExpenses.map((expense, index) => ({
      id: expense.id,
      rank: index + 1,
    }));

    updateBatchMutation.mutate(rankUpdates);
  }, [expenses, updateBatchMutation]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Drag and drop implementation */}
    </DragDropContext>
  );
};
```

### Phase 6: Add Performance Monitoring

#### 6.1 Integrate Cache Logging

```typescript
// In your cache utilities
import { cacheLogger } from "@/utils/query-cache-utils";

export const yourExpenseCacheUtils = {
  addItem: (
    queryClient: QueryClient,
    userId: string,
    item: YourExpenseType
  ) => {
    cacheLogger.logOperation(
      "addYourExpense",
      () => {
        // Cache operation implementation
      },
      { userId, itemId: item.id }
    );
  },
  // ... other operations
};
```

#### 6.2 Add Performance Monitoring

```typescript
// In your components
import { performanceMonitor } from "@/utils/performance-monitor";

const YourExpenseComponent = () => {
  useEffect(() => {
    const cleanup = performanceMonitor.startMonitoring("YourExpenseComponent");
    return cleanup;
  }, []);

  // Component implementation
};
```

### Phase 7: Testing

#### 7.1 Unit Tests for Cache Utilities

```typescript
// __tests__/your-expense-cache-utils.test.ts

describe("yourExpenseCacheUtils", () => {
  let queryClient: QueryClient;
  const userId = "test-user";

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("should add expense to cache", () => {
    const expense = createMockYourExpense();

    yourExpenseCacheUtils.addItem(queryClient, userId, expense);

    const cachedData = queryClient.getQueryData(["your-expenses", userId]);
    expect(cachedData).toContain(expense);
  });

  it("should update expense in cache", () => {
    const expense = createMockYourExpense();
    const updatedExpense = { ...expense, name: "Updated Name" };

    // Setup initial data
    queryClient.setQueryData(["your-expenses", userId], [expense]);

    yourExpenseCacheUtils.updateItem(queryClient, userId, updatedExpense);

    const cachedData = queryClient.getQueryData(["your-expenses", userId]);
    expect(cachedData).toContain(updatedExpense);
    expect(cachedData).not.toContain(expense);
  });
});
```

#### 7.2 Integration Tests

```typescript
// __tests__/your-expense-integration.test.tsx

describe("YourExpense Integration", () => {
  it("should handle complete CRUD workflow", async () => {
    const { result } = renderHook(
      () => ({
        expenses: useStableYourExpenses(userId),
        createMutation: useCreateYourExpense(),
        updateMutation: useUpdateYourExpense(),
        deleteMutation: useDeleteYourExpense(),
      }),
      {
        wrapper: createQueryWrapper(),
      }
    );

    // Test create
    act(() => {
      result.current.createMutation.mutate(mockExpenseData);
    });

    await waitFor(() => {
      expect(result.current.expenses).toHaveLength(1);
    });

    // Test update
    const createdExpense = result.current.expenses[0];
    act(() => {
      result.current.updateMutation.mutate({
        ...createdExpense,
        name: "Updated Name",
      });
    });

    await waitFor(() => {
      expect(result.current.expenses[0].name).toBe("Updated Name");
    });

    // Test delete
    act(() => {
      result.current.deleteMutation.mutate(createdExpense.id);
    });

    await waitFor(() => {
      expect(result.current.expenses).toHaveLength(0);
    });
  });
});
```

### Phase 8: Performance Verification

#### 8.1 Memory Leak Testing

```typescript
// __tests__/your-expense-memory.test.ts

describe('YourExpense Memory Management', () => {
  it('should not have memory leaks', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;

    // Perform many operations
    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<YourExpenseComponent />);
      unmount();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be minimal
    expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB
  });
});
```

#### 8.2 Performance Benchmarking

```typescript
// __tests__/your-expense-performance.test.ts

describe("YourExpense Performance", () => {
  it("should handle large datasets efficiently", async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) =>
      createMockYourExpense({ id: i })
    );

    const startTime = performance.now();

    const { result } = renderHook(() => useStableYourExpenses(userId), {
      wrapper: createQueryWrapper({
        initialData: { [("your-expenses", userId)]: largeDataset },
      }),
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100); // Should complete in under 100ms
    expect(result.current).toHaveLength(1000);
  });
});
```

## Migration Checklist

Use this checklist to ensure complete migration:

### Data Layer

- [ ] Created feature-specific cache utilities
- [ ] Implemented optimistic updates for all mutations
- [ ] Added proper error handling and rollback
- [ ] Replaced `invalidateQueries` with precise cache updates
- [ ] Added cache operation logging

### Hook Layer

- [ ] Created stable data selector hooks
- [ ] Migrated all mutation hooks to use cache utilities
- [ ] Added proper loading and error states
- [ ] Implemented retry logic where appropriate

### Component Layer

- [ ] Eliminated local state duplication
- [ ] Updated components to use stable selectors
- [ ] Added proper component memoization
- [ ] Implemented drag-and-drop with cache utilities (if applicable)

### Performance

- [ ] Added performance monitoring
- [ ] Verified no memory leaks
- [ ] Tested with large datasets
- [ ] Optimized re-render frequency

### Testing

- [ ] Added unit tests for cache utilities
- [ ] Created integration tests for complete workflows
- [ ] Added performance tests
- [ ] Verified error handling scenarios

### Documentation

- [ ] Documented feature-specific patterns
- [ ] Updated component documentation
- [ ] Added troubleshooting guide
- [ ] Created usage examples

## Common Migration Issues

### Issue 1: Infinite Re-render Loops

**Symptoms:** Component re-renders continuously, browser becomes unresponsive
**Cause:** Unstable dependencies in useEffect or useMemo
**Solution:** Use stable selectors and proper dependency arrays

```typescript
// ❌ Problematic
useEffect(() => {
  // operation
}, [user, config]); // Objects change on every render

// ✅ Fixed
const stableUserId = user?.id;
const stableConfigId = config?.id;
useEffect(() => {
  // operation
}, [stableUserId, stableConfigId]);
```

### Issue 2: Cache Inconsistency

**Symptoms:** UI shows stale data, cache and server out of sync
**Cause:** Multiple sources of truth, improper cache updates
**Solution:** Single source of truth in React Query cache

```typescript
// ❌ Multiple sources of truth
const [localData, setLocalData] = useState([]);
const { data: serverData } = useQuery();

// ✅ Single source of truth
const data = useStableData();
```

### Issue 3: Memory Leaks

**Symptoms:** Memory usage increases over time, performance degrades
**Cause:** Retained references, missing cleanup
**Solution:** Proper cleanup and weak references

```typescript
// ✅ Proper cleanup
useEffect(() => {
  const cleanup = setupMonitoring();
  return cleanup; // Always return cleanup function
}, []);
```

## Support and Resources

- **Performance Issues:** Check [Performance Monitoring Guide](./ENHANCED_PERFORMANCE_MONITORING_README.md)
- **Cache Problems:** See [Debugging Tools Guide](./DEBUGGING_TOOLS_README.md)
- **Error Handling:** Review [Error Handling Documentation](./COMPREHENSIVE_ERROR_HANDLING_README.md)
- **Testing:** Follow [Testing Best Practices](./REACT_QUERY_OPTIMIZATION_GUIDE.md#testing-strategy)

For additional support, consult the main [React Query Optimization Guide](./REACT_QUERY_OPTIMIZATION_GUIDE.md).
