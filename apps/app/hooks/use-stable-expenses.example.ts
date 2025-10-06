/**
 * Example usage of useStableExpenses hook
 *
 * This hook provides a stable, memoized interface for accessing fixed expenses
 * that prevents the stack overflow issues caused by unstable references and
 * improper dependency management.
 */

import { useStableExpenses } from "./use-stable-expenses";

// Example 1: Basic usage in a component
export function ExpenseListComponent({ userId }: { userId: string }) {
  const {
    expenses,
    isLoading,
    isError,
    error
  } = useStableExpenses({ userId });

  if (isLoading) {
    return <div>Loading expenses...</div>;
  }

  if (isError) {
    return <div>Error loading {error?.message}</div>;
  }

  return (
    <div>
      {expenses.map((expense) => (
        <div key={expense.id}>
          {expense.name}: ${expense.amount}
        </div>
      ))}
    </div>
  );
}

// Example 2: Using with other hooks that depend on expenses
export function ExpenseCalculatorComponent({ userId }: { userId: string }) {
  const { expenses, isLoading } = useStableExpenses({ userId });

  // This useMemo will only recalculate when expenses actually change
  // because useStableExpenses provides stable references
  const totalMonthlyExpenses = useMemo(() => {
    return expenses
      .filter(expense => expense.period === 'monthly')
      .reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  const totalYearlyExpenses = useMemo(() => {
    return expenses
      .filter(expense => expense.period === 'yearly')
      .reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  if (isLoading) {
    return <div>Calculating...</div>;
  }

  return (
    <div>
      <p>Monthly Total: $totalMonthlyExpenses</p>
      <p>Yearly Total: $totalYearlyExpenses</p>
    </div>
  );
}

// Example 3: Using in a parent component that passes data to children
export function ExpenseManagerComponent({ userId }: { userId: string }) {
  const { expenses, isLoading, isError } = useStableExpenses({ userId });

  // Child components will not re-render unnecessarily because
  // the expenses array has a stable reference when data hasn't changed
  return (
    <div>
      <ExpenseHeader expenses={expenses} />
      <ExpenseList expenses={expenses} loading={isLoading} error={isError} />
      <ExpenseFooter expenses={expenses} />
    </div>
  );
}

// Example 4: Benefits over direct useGetFixedExpenses usage
export function ComparisonExample({ userId }: { userId: string }) {
  // ❌ PROBLEMATIC: Direct usage can cause stack overflow
  // const { data: rawExpenses = [] } = useGetFixedExpenses({ userId });
  // const expenses = rawExpenses.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  // This creates a new array reference on every render, causing infinite loops

  // ✅ CORRECT: Using stable hook prevents issues
  const { expenses } = useStableExpenses({ userId });
  // This provides stable references and consistent sorting

  return (
    <div>
      {expenses.map(expense => (
        <div key={expense.id}>{expense.name}</div>
      ))}
    </div>
  );
}

/**
 * Key Benefits of useStableExpenses:
 *
 * 1. **Prevents Stack Overflow**: Stable references prevent infinite re-render loops
 * 2. **Consistent Sorting**: Always sorted by rank with deterministic secondary sorting
 * 3. **Performance**: Memoization prevents unnecessary recalculations
 * 4. **Type Safety**: Full TypeScript support with proper error handling
 * 5. **Error Handling**: Graceful handling of edge cases and error states
 * 6. **Dependency Safety**: Proper dependency management prevents useEffect loops
 */

import { useMemo } from "react";

// Helper components for examples
function ExpenseHeader({ expenses }: { expenses: any[] }) {
  return <h2>Total {expenses.length}</h2>;
}

function ExpenseList({ expenses, loading, error }: { expenses: any[]; loading: boolean; error: boolean }) {
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading expenses</div>;
  return <div>{expenses.map(e => <div key={e.id}>{e.name}</div>)}</div>;
}

function ExpenseFooter({ expenses }: { expenses: any[] }) {
  return <div>Showing expenses.lengthexpenses</div>;
}