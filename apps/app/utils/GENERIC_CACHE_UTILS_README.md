# Generic Cache Utilities Framework

This document describes the generic cache utilities framework that extends the existing `query-cache-utils.ts` with type-safe, reusable cache management functions.

## Overview

The generic cache utilities framework provides:

1. **Type-safe cache operations** for any data type that extends `BaseCacheItem`
2. **Factory functions** for creating specialized cache utilities
3. **Pre-configured utilities** for existing expense types
4. **Comprehensive validation and error handling**
5. **Performance monitoring and logging**

## Core Interfaces

### BaseCacheItem

```typescript
interface BaseCacheItem {
  id: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
```

### RankableItem

```typescript
interface RankableItem extends BaseCacheItem {
  rank?: number;
}
```

### CacheUtilsConfig

```typescript
interface CacheUtilsConfig<T extends BaseCacheItem> {
  queryKeyFactory: (userId: string) => QueryKey;
  sortComparator: (a: T, b: T) => number;
  validateItem: (item: T) => string[];
  createOptimisticItem: (data: Partial<T>, userId: string) => T;
  itemName?: string; // For logging purposes
}
```

## Factory Functions

### createGenericCacheUtils<T>()

Creates cache utilities for array-based data (multiple items).

**Operations:**

- `addItem()` - Add new item to cache
- `updateItem()` - Update existing item
- `removeItem()` - Remove single item
- `removeMultipleItems()` - Remove multiple items
- `reorderItems()` - Reorder items (for drag-and-drop)
- `updateMultipleItems()` - Batch update items
- `replaceAllItems()` - Replace entire cache
- `getCurrentItems()` - Get current items
- `itemExists()` - Check if item exists
- `getItem()` - Get specific item
- `replaceTempItem()` - Replace optimistic item with real data

### createSingleObjectCacheUtils<T>()

Creates cache utilities for single-object data.

**Operations:**

- `updateObject()` - Update the single object
- `getCurrentObject()` - Get current object
- `replaceObject()` - Replace the object
- `objectExists()` - Check if object exists

## Pre-configured Utilities

### fixedExpenseCacheUtils

For `ExpenseItem` type (existing fixed expenses).

### equipmentExpenseCacheUtils

For `EquipmentExpenseItem` type (equipment expenses).

### billableCostCacheUtils

For `BillableCostItem` type (single billable cost object).

## Generic Utilities

### genericOptimisticUpdateUtils

- `createTempId()` - Create temporary negative ID
- `createOptimisticItem()` - Create optimistic item with factory function
- `isTempItem()` - Check if item has temporary ID
- `getTempItems()` - Filter temporary items
- `getRealItems()` - Filter real (non-temporary) items

### genericCacheValidationUtils

- `isProperlysorted()` - Validate sorting order
- `validateItems()` - Validate item structure
- `findDuplicates()` - Find duplicate IDs
- `validateRanks()` - Validate rank consistency
- `validateUserConsistency()` - Validate user ID consistency

## Usage Examples

### Creating Custom Cache Utils

```typescript
interface MyCustomItem extends BaseCacheItem {
  title: string;
  value: number;
}

const myCustomConfig: CacheUtilsConfig<MyCustomItem> = {
  queryKeyFactory: (userId: string) => ["my-items", userId],
  sortComparator: (a, b) => a.title.localeCompare(b.title),
  validateItem: (item) => {
    const errors: string[] = [];
    if (!item.title) errors.push("Missing title");
    if (item.value < 0) errors.push("Value must be positive");
    return errors;
  },
  createOptimisticItem: (data, userId) => ({
    title: data.title || "",
    value: data.value || 0,
    ...data,
    id: genericOptimisticUpdateUtils.createTempId(),
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  itemName: "custom-item",
};

const myCustomCacheUtils = createGenericCacheUtils(myCustomConfig);
```

### Using Pre-configured Utils

```typescript
// Add a fixed expense
fixedExpenseCacheUtils.addItem(queryClient, userId, newExpense);

// Update equipment expense
equipmentExpenseCacheUtils.updateItem(queryClient, userId, updatedEquipment);

// Update billable cost (single object)
billableCostCacheUtils.updateObject(queryClient, userId, billableCost);
```

## Error Handling

All cache operations include comprehensive error handling:

- **GenericCacheError** - Standardized error type with operation context
- **Automatic rollback** - Failed operations don't corrupt cache state
- **Validation errors** - Items are validated before cache updates
- **Performance logging** - All operations are logged with timing

## Performance Features

- **Automatic sorting** - Items are sorted after every operation
- **Optimistic updates** - Immediate UI updates with temporary IDs
- **Memory management** - Proper cleanup and garbage collection
- **Performance monitoring** - Operation timing and error tracking
- **Cache validation** - Consistency checks and duplicate detection

## Migration from Existing Utils

The existing `expenseCacheUtils` remains unchanged for backward compatibility. New implementations should use:

- `fixedExpenseCacheUtils` instead of `expenseCacheUtils`
- `equipmentExpenseCacheUtils` for equipment expenses
- `billableCostCacheUtils` for billable costs

## Testing

Comprehensive test suite covers:

- All generic cache operations
- Pre-configured utilities
- Error handling scenarios
- Optimistic update patterns
- Validation utilities
- Performance monitoring

Run tests with:

```bash
npm run test -- utils/__tests__/generic-cache-utils.test.ts --run
```

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **3.1**: Generic, type-safe cache utilities that work across all expense types
- **3.3**: Consistent validation utilities across all features

The framework provides a solid foundation for implementing the remaining tasks in the React Query optimization spec.
