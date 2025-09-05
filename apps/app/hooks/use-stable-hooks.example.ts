/**
 * Example usage of stable data selector hooks
 *
 * These hooks provide memoized data with stable references to prevent
 * unnecessary re-renders and improve performance across expense features.
 */

import { useStableData, useStableBillable, useStableEquipment, useStableExpenses } from './index';
import { useGetFixedExpenses } from '../app/features/feature-hourly-cost/server/get-fixed-expenses';
import type { ExpenseItem } from '../app/types';

// Example 1: Using the generic useStableData hook
function ExampleGenericStableData({ userId }: { userId: string }) {
  const queryResult = useGetFixedExpenses({ userId });

  // Use the generic hook with custom configuration
  const { data: expenses, isLoading, error } = useStableData(queryResult, {
    defaultValue: [],
    sortComparator: (a, b) => {
      // Custom sort: by amount descending, then by name
      if (a.amount !== b.amount) {
        return b.amount - a.amount;
      }
      return a.name.localeCompare(b.name);
    },
    selector: (data) => {
      // Custom transformation: filter only active expenses
      return data.filter(expense => expense.amount > 0);
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Active Expenses (sorted by amount)</h2>
      {expenses.map(expense => (
        <div key={expense.id}>
          {expense.name}: ${expense.amount}
        </div>
      ))}
    </div>
  );
}

// Example 2: Using useStableBillable for single object data
function ExampleBillableData({ userId }: { userId: string }) {
  const {
    billableData,
    isLoading,
    error
  } = useStableBillable({ userId });

  if (isLoading) return <div>Loading billable data...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!billableData) return <div>No billable data found</div>;

  return (
    <div>
      <h2>Billable Cost Information</h2>
      <p>Work Days: {billableData.workDays}</p>
      <p>Hours per Day: {billableData.hoursPerDay}</p>
      <p>Monthly Salary: ${billableData.monthlySalary}</p>
      <p>Billable Hours: {billableData.billableHours}</p>
      <p>Margin: {billableData.margin}%</p>
    </div>
  );
}

// Example 3: Using useStableEquipment for array data with ranking
function ExampleEquipmentData({ userId }: { userId: string }) {
  const {
    equipment,
    isLoading,
    error
  } = useStableEquipment({ userId });

  if (isLoading) return <div>Loading equipment...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Equipment Expenses (sorted by rank)</h2>
      {equipment.length === 0 ? (
        <p>No equipment expenses found</p>
      ) : (
        <ul>
          {equipment.map((item, index) => (
            <li key={item.id}>
              <strong>#{index + 1}</strong> {item.name} - ${item.amount}
              <br />
              <small>
                Category: {item.category} |
                Usage: {item.usage}% |
                Life Span: {item.lifeSpan} years
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Example 4: Using useStableExpenses for fixed expenses
function ExampleFixedExpenses({ userId }: { userId: string }) {
  const {
    expenses,
    isLoading,
    error
  } = useStableExpenses({ userId });

  if (isLoading) return <div>Loading fixed expenses...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Fixed Expenses (sorted by rank)</h2>
      {expenses.length === 0 ? (
        <p>No fixed expenses found</p>
      ) : (
        <ul>
          {expenses.map((expense, index) => (
            <li key={expense.id}>
              <strong>#{index + 1}</strong> {expense.name} - ${expense.amount}
              <br />
              <small>
                Category: {expense.category} |
                Period: {expense.period}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Example 5: Custom hook using useStableData for specific business logic
function useStableExpensesSummary(userId: string) {
  const { data: expenses } = useStableExpenses({ userId });
  const { billableData } = useStableBillable({ userId });
  const { equipment } = useStableEquipment({ userId });

  // This will be memoized and only recalculate when the underlying data changes
  const summary = useStableData(
    {
      data: { expenses, billableData, equipment },
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any,
    {
      selector: (data) => {
        const totalFixedExpenses = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalEquipmentCost = data.equipment.reduce((sum, eq) => sum + eq.amount, 0);
        const monthlySalary = data.billableData?.monthlySalary || 0;

        return {
          totalFixedExpenses,
          totalEquipmentCost,
          monthlySalary,
          totalMonthlyCosts: totalFixedExpenses + totalEquipmentCost + monthlySalary,
          expenseCount: data.expenses.length,
          equipmentCount: data.equipment.length,
        };
      },
    }
  );

  return summary.data;
}

// Example 6: Component using the custom summary hook
function ExampleExpensesSummary({ userId }: { userId: string }) {
  const summary = useStableExpensesSummary(userId);

  return (
    <div>
      <h2>Expenses Summary</h2>
      <div>
        <p>Fixed Expenses: ${summary.totalFixedExpenses} ({summary.expenseCount} items)</p>
        <p>Equipment Costs: ${summary.totalEquipmentCost} ({summary.equipmentCount} items)</p>
        <p>Monthly Salary: ${summary.monthlySalary}</p>
        <hr />
        <p><strong>Total Monthly Costs: ${summary.totalMonthlyCosts}</strong></p>
      </div>
    </div>
  );
}

// Export examples for documentation
export {
  ExampleGenericStableData,
  ExampleBillableData,
  ExampleEquipmentData,
  ExampleFixedExpenses,
  ExampleExpensesSummary,
  useStableExpensesSummary,
};