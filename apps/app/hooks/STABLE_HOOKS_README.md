# Stable Data Selector Hooks

This directory contains stable data selector hooks that provide memoized data with stable references to prevent unnecessary re-renders and improve performance across expense management features.

## Overview

The stable hooks solve common React Query performance issues by:

1. **Preventing unnecessary re-renders** through stable data references
2. **Consistent sorting** with deterministic ordering
3. **Proper memoization** that only recalculates when data actually changes
4. **Type safety** with full TypeScript support
5. **Reusable patterns** that work across different data types

## Available Hooks

### `useStableData<T>` - Generic Hook Factory

The foundation hook that can be configured for any data type.

```typescript
import { useStableData } from "./use-stable-data";

const { data, isLoading, error } = useStableData(queryResult, {
  defaultValue: [],
  sortComparator: (a, b) => a.rank - b.rank,
  selector: (data) => data.filter((item) => item.active),
});
```

**Configuration Options:**

- `defaultValue`: Value returned when no data is available
- `sortComparator`: Function to sort array data consistently
- `selector`: Function to transform or filter data

### `useStableBillable` - Billable Cost Data

Specialized hook for single billable cost object.

```typescript
import { useStableBillable } from "./use-stable-billable";

const { billableData, isLoading, error } = useStableBillable({ userId });
```

**Features:**

- Returns `null` when no data is available
- Handles single object cache patterns
- No sorting needed (single object)

### `useStableEquipment` - Equipment Expenses

Specialized hook for equipment expense arrays with ranking.

```typescript
import { useStableEquipment } from "./use-stable-equipment";

const { equipment, isLoading, error } = useStableEquipment({ userId });
```

**Features:**

- Automatically sorts by rank (with ID as secondary sort)
- Returns empty array when no data
- Handles undefined ranks consistently

### `useStableExpenses` - Fixed Expenses

Existing hook for fixed expense arrays (already optimized).

```typescript
import { useStableExpenses } from "./use-stable-expenses";

const { expenses, isLoading, error } = useStableExpenses({ userId });
```

## Key Benefits

### 1. Stable References

```typescript
// ❌ Without stable hooks - creates new array on every render
const { data: expenses } = useGetFixedExpenses({ userId });
const sortedExpenses = expenses?.sort((a, b) => a.rank - b.rank) || [];

// ✅ With stable hooks - maintains reference when data unchanged
const { expenses } = useStableExpenses({ userId });
```

### 2. Consistent Sorting

```typescript
// ❌ Inconsistent sorting can cause infinite loops
const sortedData = data?.sort((a, b) => {
  if (a.rank && b.rank) return a.rank - b.rank;
  return 0; // Inconsistent handling of undefined ranks
});

// ✅ Consistent, deterministic sorting
const { data } = useStableData(queryResult, {
  sortComparator: createRankSortComparator, // Handles undefined ranks consistently
});
```

### 3. Performance Optimization

```typescript
// ❌ Causes unnecessary re-renders
useEffect(() => {
  // This runs on every render because expenses array reference changes
  calculateTotals(expenses);
}, [expenses]);

// ✅ Only runs when data actually changes
const { expenses } = useStableExpenses({ userId });
useEffect(() => {
  calculateTotals(expenses);
}, [expenses]); // Stable reference prevents unnecessary runs
```

## Usage Patterns

### Basic Usage

```typescript
function ExpenseList({ userId }: { userId: string }) {
  const { expenses, isLoading, error } = useStableExpenses({ userId });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {expenses.map(expense => (
        <li key={expense.id}>{expense.name}: ${expense.amount}</li>
      ))}
    </ul>
  );
}
```

### Custom Sorting and Filtering

```typescript
function TopExpenses({ userId }: { userId: string }) {
  const queryResult = useGetFixedExpenses({ userId });

  const { data: topExpenses } = useStableData(queryResult, {
    defaultValue: [],
    sortComparator: (a, b) => b.amount - a.amount, // Sort by amount descending
    selector: (data) => data.slice(0, 5), // Take top 5
  });

  return (
    <div>
      <h2>Top 5 Expenses</h2>
      {topExpenses.map(expense => (
        <div key={expense.id}>{expense.name}: ${expense.amount}</div>
      ))}
    </div>
  );
}
```

### Combining Multiple Data Sources

```typescript
function ExpenseSummary({ userId }: { userId: string }) {
  const { expenses } = useStableExpenses({ userId });
  const { equipment } = useStableEquipment({ userId });
  const { billableData } = useStableBillable({ userId });

  // These calculations only run when the underlying data changes
  const totalFixed = useMemo(() =>
    expenses.reduce((sum, exp) => sum + exp.amount, 0), [expenses]
  );

  const totalEquipment = useMemo(() =>
    equipment.reduce((sum, eq) => sum + eq.amount, 0), [equipment]
  );

  return (
    <div>
      <p>Fixed Expenses: ${totalFixed}</p>
      <p>Equipment Costs: ${totalEquipment}</p>
      <p>Monthly Salary: ${billableData?.monthlySalary || 0}</p>
    </div>
  );
}
```

## Best Practices

### 1. Use Appropriate Hook for Data Type

```typescript
// ✅ Use specific hooks when available
const { expenses } = useStableExpenses({ userId }); // For fixed expenses
const { equipment } = useStableEquipment({ userId }); // For equipment
const { billableData } = useStableBillable({ userId }); // For billable data

// ✅ Use generic hook for custom needs
const { data } = useStableData(queryResult, {
  sortComparator: customSort,
  selector: customTransform,
});
```

### 2. Leverage Memoization

```typescript
// ✅ Expensive calculations benefit from stable references
const { expenses } = useStableExpenses({ userId });

const expensiveCalculation = useMemo(() => {
  return expenses.reduce((acc, expense) => {
    // Complex calculation here
    return acc + complexCalculation(expense);
  }, 0);
}, [expenses]); // Only recalculates when expenses actually change
```

### 3. Handle Loading and Error States

```typescript
function ExpenseComponent({ userId }: { userId: string }) {
  const { expenses, isLoading, error, isSuccess } = useStableExpenses({ userId });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (isSuccess && expenses.length === 0) return <EmptyState />;

  return <ExpenseList expenses={expenses} />;
}
```

## Testing

All hooks include comprehensive tests covering:

- **Stable references** when data unchanged
- **New references** when data changes
- **Sorting behavior** with various data configurations
- **Error and loading states**
- **Edge cases** (empty arrays, null data, undefined ranks)

Run tests with:

```bash
npm test -- hooks/__tests__/use-stable*.test.ts --run
```

## Migration Guide

### From Direct Query Usage

```typescript
// ❌ Before
const { data: expenses } = useGetFixedExpenses({ userId });
const sortedExpenses = expenses?.sort((a, b) => a.rank - b.rank) || [];

// ✅ After
const { expenses } = useStableExpenses({ userId });
```

### From Local State Management

```typescript
// ❌ Before
const { data } = useGetEquipmentExpenses({ userId });
const [expenses, setExpenses] = useState([]);

useEffect(() => {
  if (data) {
    setExpenses(data.sort((a, b) => a.rank - b.rank));
  }
}, [data]);

// ✅ After
const { equipment } = useStableEquipment({ userId });
```

## Performance Impact

Using stable hooks provides:

- **Reduced re-renders**: Components only re-render when data actually changes
- **Stable dependencies**: useEffect and useMemo hooks run less frequently
- **Memory efficiency**: Less garbage collection from unnecessary array creation
- **Predictable performance**: Consistent behavior across different data states

## Related Files

- `use-stable-data.ts` - Generic hook factory
- `use-stable-billable.ts` - Billable cost specific hook
- `use-stable-equipment.ts` - Equipment expense specific hook
- `use-stable-expenses.ts` - Fixed expense specific hook (existing)
- `use-stable-hooks.example.ts` - Usage examples
- `__tests__/` - Comprehensive test suite
