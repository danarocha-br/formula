# Query Cache Utils

This directory contains utilities for managing React Query cache operations to prevent stack overflow issues and improve performance.

## Files

- **`query-cache-utils.ts`** - Main utility functions for precise cache management
- **`query-cache-utils.test.ts`** - Comprehensive test suite (26 tests)
- **`query-cache-utils.example.ts`** - Usage examples and best practices

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
