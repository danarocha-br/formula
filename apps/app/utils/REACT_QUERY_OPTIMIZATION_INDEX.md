# React Query Optimization Documentation Index

## Overview

This documentation suite provides comprehensive guidance for implementing and maintaining optimized React Query patterns across all expense management features. The documentation is organized into specialized guides that cover different aspects of the optimization strategy.

## Documentation Structure

### 📚 Core Documentation

#### [React Query Optimization Guide](./REACT_QUERY_OPTIMIZATION_GUIDE.md)

**Primary reference for optimization patterns and best practices**

- Core optimization principles
- Cache utility patterns
- Stable data selectors
- Optimistic updates
- Performance monitoring
- Error handling
- Best practices and common pitfalls

**Use when:** Learning the optimization patterns, implementing new features, or reviewing existing code.

#### [Expense Feature Migration Guide](./EXPENSE_FEATURE_MIGRATION_GUIDE.md)

**Step-by-step guide for migrating existing features or creating new ones**

- Complete migration workflow
- Phase-by-phase implementation
- Code examples and templates
- Testing strategies
- Common migration issues and solutions

**Use when:** Migrating existing expense features or creating new expense management functionality.

### 🚀 Performance Documentation

#### [Performance Optimization Guidelines](./PERFORMANCE_OPTIMIZATION_GUIDELINES.md)

**Comprehensive performance optimization strategies**

- Performance principles and strategies
- Query optimization techniques
- Cache management optimization
- Component optimization
- Memory management
- Performance monitoring and benchmarking
- Troubleshooting performance issues

**Use when:** Optimizing performance, investigating slow operations, or setting up performance monitoring.

#### [Enhanced Performance Monitoring README](./ENHANCED_PERFORMANCE_MONITORING_README.md)

**Detailed guide for performance monitoring tools**

- Performance monitoring setup
- Metrics collection and analysis
- Automated performance testing
- Performance regression detection

**Use when:** Setting up performance monitoring or analyzing performance metrics.

### 🛠️ Utility Documentation

#### [Generic Cache Utils README](./GENERIC_CACHE_UTILS_README.md)

**Documentation for the generic cache utilities framework**

- Generic cache utilities API
- Type-safe cache operations
- Factory functions for specialized utilities
- Usage examples and patterns

**Use when:** Working with cache utilities or creating new cache management functions.

#### [Billable Cost Cache Utils README](./BILLABLE_COST_CACHE_UTILS_README.md)

**Specialized documentation for billable cost cache management**

- Single-object cache patterns
- Billable cost specific operations
- Form integration patterns
- Debounced update strategies

**Use when:** Working with billable cost features or single-object cache patterns.

#### [Equipment Cache Utils README](./EQUIPMENT_CACHE_UTILS_README.md)

**Specialized documentation for equipment expense cache management**

- Array-based cache patterns
- Drag-and-drop cache operations
- Rank management utilities
- Batch update strategies

**Use when:** Working with equipment features or array-based cache patterns with ranking.

### 🔧 Debugging and Troubleshooting

#### [Cache Troubleshooting Guide](./CACHE_TROUBLESHOOTING_GUIDE.md)

**Comprehensive troubleshooting guide for cache-related issues**

- Common cache problems and solutions
- Diagnostic tools and techniques
- Step-by-step troubleshooting workflow
- Emergency recovery procedures
- Prevention strategies

**Use when:** Investigating cache issues, debugging performance problems, or recovering from cache corruption.

#### [Debugging Tools README](./DEBUGGING_TOOLS_README.md)

**Guide for debugging and monitoring tools**

- Cache operation dashboard
- Cache state inspector
- Performance metrics visualizer
- Automated health checks

**Use when:** Setting up debugging tools or investigating complex cache issues.

#### [Comprehensive Error Handling README](./COMPREHENSIVE_ERROR_HANDLING_README.md)

**Error handling strategies and implementation**

- Standardized error types
- Circuit breaker patterns
- Retry logic with backoff
- Error recovery mechanisms

**Use when:** Implementing error handling or debugging error-related issues.

## Quick Reference

### 🚀 Getting Started

1. **New to React Query Optimization?**

   - Start with [React Query Optimization Guide](./REACT_QUERY_OPTIMIZATION_GUIDE.md)
   - Review core principles and patterns
   - Understand the stable data selector concept

2. **Migrating an Existing Feature?**

   - Follow [Expense Feature Migration Guide](./EXPENSE_FEATURE_MIGRATION_GUIDE.md)
   - Use the phase-by-phase approach
   - Complete the migration checklist

3. **Creating a New Expense Feature?**
   - Review [Generic Cache Utils README](./GENERIC_CACHE_UTILS_README.md)
   - Follow patterns from existing features
   - Use the migration guide as a template

### 🔍 Common Tasks

#### Implementing Cache Utilities

```typescript
// 1. Read Generic Cache Utils README
// 2. Create specialized cache utils
// 3. Follow patterns from existing features

import { createGenericCacheUtils } from "./generic-cache-utils";

const yourCacheUtils = createGenericCacheUtils({
  queryKeyFactory: (userId: string) => ["your-feature", userId],
  sortComparator: (a, b) => a.rank - b.rank,
  validateItem: (item) => validateYourItem(item),
  createOptimisticItem: (data, userId) =>
    createOptimisticYourItem(data, userId),
});
```

#### Creating Stable Data Selectors

```typescript
// Follow patterns from React Query Optimization Guide

export function useStableYourData(userId: string) {
  const queryResult = useYourData(userId);

  const stableData = useMemo(() => {
    if (!queryResult.data) return [];
    return [...queryResult.data].sort((a, b) => a.rank - b.rank);
  }, [queryResult.data]);

  return stableData;
}
```

#### Optimizing Mutations

```typescript
// Replace invalidateQueries with precise cache updates

export const useUpdateYourItem = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: updateYourItem,
    onSuccess: (data) => {
      // ✅ Precise cache update
      yourCacheUtils.updateItem(queryClient, userId, data);
    },
    // ❌ Don't use broad invalidation
    // onSettled: () => queryClient.invalidateQueries(['your-items'])
  });
};
```

### 🐛 Troubleshooting

#### Performance Issues

1. Check [Performance Optimization Guidelines](./PERFORMANCE_OPTIMIZATION_GUIDELINES.md)
2. Use performance monitoring tools
3. Profile cache operations
4. Look for memory leaks

#### Cache Problems

1. Start with [Cache Troubleshooting Guide](./CACHE_TROUBLESHOOTING_GUIDE.md)
2. Run diagnostic tools
3. Check cache consistency
4. Use emergency recovery if needed

#### Memory Leaks

1. Review cleanup patterns in optimization guide
2. Use memory leak detection tools
3. Check for missing useEffect cleanup
4. Verify proper component unmounting

## Implementation Checklist

### ✅ Feature Implementation Checklist

When implementing optimized React Query patterns:

#### Cache Layer

- [ ] Created feature-specific cache utilities
- [ ] Implemented optimistic updates
- [ ] Added proper error handling and rollback
- [ ] Replaced `invalidateQueries` with precise updates
- [ ] Added cache operation logging

#### Hook Layer

- [ ] Created stable data selector hooks
- [ ] Migrated mutation hooks to use cache utilities
- [ ] Added proper loading and error states
- [ ] Implemented retry logic where appropriate

#### Component Layer

- [ ] Eliminated local state duplication
- [ ] Updated components to use stable selectors
- [ ] Added proper component memoization
- [ ] Implemented drag-and-drop with cache utilities (if applicable)

#### Performance

- [ ] Added performance monitoring
- [ ] Verified no memory leaks
- [ ] Tested with large datasets
- [ ] Optimized re-render frequency

#### Testing

- [ ] Added unit tests for cache utilities
- [ ] Created integration tests for workflows
- [ ] Added performance tests
- [ ] Verified error handling scenarios

#### Documentation

- [ ] Documented feature-specific patterns
- [ ] Updated component documentation
- [ ] Added troubleshooting notes
- [ ] Created usage examples

## Code Examples Repository

### Cache Utilities Examples

```typescript
// Array-based cache utils (like equipment, fixed expenses)
const arrayBasedCacheUtils = createGenericCacheUtils({
  queryKeyFactory: (userId: string) => ["items", userId],
  sortComparator: (a, b) => (a.rank || 0) - (b.rank || 0),
  validateItem: (item) => validateArrayItem(item),
  createOptimisticItem: (data, userId) => ({
    id: Date.now(),
    userId,
    ...data,
  }),
});

// Single object cache utils (like billable costs)
const singleObjectCacheUtils = {
  updateData: (queryClient, userId, updates) => {
    const queryKey = ["config", userId];
    queryClient.setQueryData(queryKey, (old) => ({ ...old, ...updates }));
  },
};
```

### Stable Selector Examples

```typescript
// Array data selector
export function useStableArrayData(userId: string) {
  const queryResult = useArrayData(userId);

  return useMemo(() => {
    if (!queryResult.data) return [];
    return [...queryResult.data].sort((a, b) => a.rank - b.rank);
  }, [queryResult.data]);
}

// Single object selector
export function useStableSingleData(userId: string) {
  const queryResult = useSingleData(userId);

  return useMemo(() => {
    return queryResult.data || null;
  }, [queryResult.data]);
}
```

### Mutation Hook Examples

```typescript
// Create mutation with optimistic updates
export const useCreateItem = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: createItem,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["items", userId] });

      const previousData = queryClient.getQueryData(["items", userId]);
      const optimisticItem = cacheUtils.createOptimisticItem(variables, userId);

      cacheUtils.addItem(queryClient, userId, optimisticItem);

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["items", userId], context.previousData);
      }
    },
    onSuccess: (data) => {
      cacheUtils.replaceTempItem(queryClient, userId, data);
    },
  });
};
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly Performance Review**

   - Check performance metrics
   - Review slow operation logs
   - Monitor memory usage trends

2. **Monthly Cache Health Check**

   - Run comprehensive diagnostics
   - Check for cache inconsistencies
   - Review error rates and patterns

3. **Quarterly Documentation Review**
   - Update documentation with new patterns
   - Add new troubleshooting scenarios
   - Review and update examples

### Getting Help

1. **For Implementation Questions**

   - Consult the relevant guide from this index
   - Check code examples in existing features
   - Review test files for usage patterns

2. **For Performance Issues**

   - Start with Performance Optimization Guidelines
   - Use debugging tools to identify bottlenecks
   - Check troubleshooting guide for common issues

3. **For Cache Problems**

   - Use Cache Troubleshooting Guide
   - Run diagnostic tools
   - Export cache state for analysis

4. **For Complex Issues**
   - Gather diagnostic information
   - Export cache state and performance metrics
   - Document steps to reproduce
   - Include browser and environment details

## Version History

- **v1.0** - Initial documentation suite
- **v1.1** - Added troubleshooting guide and performance guidelines
- **v1.2** - Enhanced migration guide with more examples
- **v1.3** - Added comprehensive error handling documentation

---

This documentation index serves as your central hub for all React Query optimization information. Use it to quickly find the right guide for your specific needs and ensure consistent implementation across all expense management features.
