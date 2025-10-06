# Utils Directory

This directory contains utilities for managing React Query cache operations, performance monitoring, and debugging tools to prevent stack overflow issues and improve performance across all expense management features.

## 📚 Documentation

### **[React Query Optimization Documentation Index](./REACT_QUERY_OPTIMIZATION_INDEX.md)**

**Start here** - Complete documentation suite for React Query optimization patterns, migration guides, performance optimization, and troubleshooting.

### Core Documentation Files

- **[React Query Optimization Guide](./REACT_QUERY_OPTIMIZATION_GUIDE.md)** - Primary reference for optimization patterns and best practices
- **[Expense Feature Migration Guide](./EXPENSE_FEATURE_MIGRATION_GUIDE.md)** - Step-by-step guide for migrating features
- **[Performance Optimization Guidelines](./PERFORMANCE_OPTIMIZATION_GUIDELINES.md)** - Comprehensive performance strategies
- **[Cache Troubleshooting Guide](./CACHE_TROUBLESHOOTING_GUIDE.md)** - Troubleshooting guide for cache issues

## 🛠️ Core Utilities

### Cache Management

- **`query-cache-utils.ts`** - Main utility functions for precise cache management (fixed expenses)
- **`billable-cost-cache-utils.ts`** - Specialized utilities for billable cost cache management
- **`equipment-cache-utils.ts`** - Specialized utilities for equipment expense cache management
- **`generic-cache-utils.ts`** - Generic cache utilities framework for all expense types

### Performance & Monitoring

- **`performance-monitor.ts`** - Performance tracking and metrics collection
- **`memory-leak-detection.ts`** - Memory leak detection and monitoring
- **`automated-cache-cleanup.ts`** - Automated cache cleanup utilities
- **`re-render-monitoring.ts`** - Component re-render frequency monitoring

### Error Handling

- **`cache-error-handling.ts`** - Standardized cache error handling
- **`circuit-breaker.ts`** - Circuit breaker pattern for cache operations
- **`retry-with-backoff.ts`** - Retry logic with exponential backoff

### Debugging Tools

- **`cache-operation-dashboard.tsx`** - Real-time cache operation dashboard
- **`cache-state-inspector.ts`** - Cache state inspection utilities
- **`performance-metrics-visualizer.tsx`** - Performance metrics visualization
- **`debugging-tools-integration.tsx`** - Integrated debugging tools

## 📋 Test Files

- **`query-cache-utils.test.ts`** - Comprehensive test suite (26 tests)
- **`billable-cost-cache-utils.test.ts`** - Billable cost cache utilities tests
- **`equipment-cache-utils.test.ts`** - Equipment cache utilities tests
- **`generic-cache-utils.test.ts`** - Generic cache utilities tests
- **Performance and integration test files** - Various performance and integration tests

## Key Features

### 🚫 Prevents Stack Overflow

- Eliminates broad `invalidateQueries` calls that cause infinite loops
- Uses precise `setQueryData` operations instead

### ⚡ Better Performance

- Targeted cache updates instead of full refetches
- Maintains referential stability where possible

### 🔒 Type Safety

- Full TypeScript support with proper error handling
- Custom error types for better debugging

### 📊 Automatic Sorting

- Maintains consistent expense ordering by rank
- Prevents UI inconsistencies

### 🔄 Optimistic Updates

- Smooth UX with proper rollback mechanisms
- Temporary ID management for optimistic operations

### ✅ Validation

- Built-in cache validation utilities
- Detects duplicates and data integrity issues

## Usage

```typescript
import { expenseCacheUtils } from "./utils/query-cache-utils";

// Add expense to cache
expenseCacheUtils.addExpense(queryClient, userId, newExpense);

// Update existing expense
expenseCacheUtils.updateExpense(queryClient, userId, updatedExpense);

// Remove expense
expenseCacheUtils.removeExpense(queryClient, userId, expenseId);

// Reorder expenses (drag-and-drop)
expenseCacheUtils.reorderExpenses(queryClient, userId, reorderedExpenses);
```

## Requirements Addressed

This implementation addresses the following requirements from the spec:

- **3.1**: Proper query key management to avoid conflicts
- **3.2**: Proper rollback of optimistic updates without side effects
- **3.3**: Specific query keys rather than broad invalidations

## Testing

Run the test suite:

```bash
npm test -- utils/__tests__/query-cache-utils.test.ts --run
```

All 26 tests pass, covering:

- Cache CRUD operations
- Error handling and rollback
- Optimistic update utilities
- Data validation
- Edge cases and error scenarios
