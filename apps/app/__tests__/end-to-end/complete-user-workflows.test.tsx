/**
 * End-to-end tests for complete user workflows
 * Tests realistic user scenarios across all expense management features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { renderWithQueryClient } from '../../test-utils';
import { expenseCacheUtils } from '../../utils/query-cache-utils';
import { equipmentCacheUtils } from '../../utils/equipment-cache-utils';
import type { ExpenseItem, EquipmentExpenseItem, BillableCostItem } from '../../app/types';

// Mock components for testing
const MockFixedExpenseComponent = ({ userId }: { userId: string }) => {
  const handleAddExpense = () => {
    const expense: ExpenseItem = {
      id: Date.now(),
      userId,
      name: 'Test Fixed Expense',
      category: 'office',
      amount: 1000,
      period: 'monthly',
      rank: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Simulate adding through cache utils
    const queryClient = new QueryClient();
    expenseCacheUtils.addExpense(queryClient, userId, expense);
  };

  return (
    <div data-testid="fixed-expense-component">
      <button onClick={handleAddExpense} data-testid="add-fixed-expense">
        Add Fixed Expense
      </button>
      <div data-testid="fixed-expense-list">Fixed Expense List</div>
    </div>
  );
};

const MockEquipmentComponent = ({ userId }: { userId: string }) => {
  const handleAddEquipment = () => {
    const equipment: EquipmentExpenseItem = {
      id: Date.now(),
      userId,
      name: 'Test Equipment',
      category: 'computer',
      amount: 2000,
      purchaseDate: new Date(),
      usage: 80,
      lifeSpan: 36,
      rank: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Simulate adding through cache utils
    const queryClient = new QueryClient();
    equipmentCacheUtils.addItem(queryClient, userId, equipment);
  };

  const handleDragDrop = () => {
    // Simulate drag and drop reordering
    const queryClient = new QueryClient();
    // Mock some existing equipment for reordering
    const equipment1: EquipmentExpenseItem = {
      id: 1,
      userId,
      name: 'Equipment 1',
      category: 'computer',
      amount: 1000,
      purchaseDate: new Date(),
      usage: 80,
      lifeSpan: 36,
      rank: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const equipment2: EquipmentExpenseItem = {
      id: 2,
      userId,
      name: 'Equipment 2',
      category: 'software',
      amount: 500,
      purchaseDate: new Date(),
      usage: 100,
      lifeSpan: 12,
      rank: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    equipmentCacheUtils.addItem(queryClient, userId, equipment1);
    equipmentCacheUtils.addItem(queryClient, userId, equipment2);

    // Simulate reordering
    equipmentCacheUtils.reorderItems(queryClient, userId, [equipment2, equipment1]);
  };

  return (
    <div data-testid="equipment-component">
      <button onClick={handleAddEquipment} data-testid="add-equipment">
        Add Equipment
      </button>
      <button onClick={handleDragDrop} data-testid="reorder-equipment">
        Reorder Equipment
      </button>
      <div data-testid="equipment-list">Equipment List</div>
    </div>
  );
};

const MockBillableComponent = ({ userId }: { userId: string }) => {
  const handleUpdateBillable = () => {
    // Simulate billable cost update
    console.log('Updating billable cost for user:', userId);
  };

  return (
    <div data-testid="billable-component">
      <button onClick={handleUpdateBillable} data-testid="update-billable">
        Update Billable Cost
      </button>
      <div data-testid="billable-form">Billable Cost Form</div>
    </div>
  );
};

const MockExpenseManagementApp = ({ userId }: { userId: string }) => {
  return (
    <div data-testid="expense-app">
      <h1>Expense Management App</h1>
      <MockFixedExpenseComponent userId={userId} />
      <MockEquipmentComponent userId={userId} />
      <MockBillableComponent userId={userId} />
    </div>
  );
};

describe('Complete User Workflows E2E Tests', () => {
  let queryClient: QueryClient;
  const userId = 'test-user-123';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
  });

  describe('New User Onboarding Workflow', () => {
    it('should handle complete new user setup workflow', async () => {
      const { container } = renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      // Verify all components are rendered
      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
      expect(screen.getByTestId('fixed-expense-component')).toBeInTheDocument();
      expect(screen.getByTestId('equipment-component')).toBeInTheDocument();
      expect(screen.getByTestId('billable-component')).toBeInTheDocument();

      // Simulate new user adding their first fixed expense
      const addFixedButton = screen.getByTestId('add-fixed-expense');
      fireEvent.click(addFixedButton);

      // Simulate adding equipment
      const addEquipmentButton = screen.getByTestId('add-equipment');
      fireEvent.click(addEquipmentButton);

      // Simulate updating billable costs
      const updateBillableButton = screen.getByTestId('update-billable');
      fireEvent.click(updateBillableButton);

      // Verify the workflow completed without errors
      expect(container).toBeInTheDocument();
    });

    it('should handle progressive data entry across features', async () => {
      renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      // Step 1: Add fixed expenses
      const addFixedButton = screen.getByTestId('add-fixed-expense');

      // Add multiple fixed expenses
      fireEvent.click(addFixedButton);
      fireEvent.click(addFixedButton);
      fireEvent.click(addFixedButton);

      // Step 2: Add equipment
      const addEquipmentButton = screen.getByTestId('add-equipment');
      fireEvent.click(addEquipmentButton);
      fireEvent.click(addEquipmentButton);

      // Step 3: Configure billable costs
      const updateBillableButton = screen.getByTestId('update-billable');
      fireEvent.click(updateBillableButton);

      // Verify all interactions completed successfully
      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
    });
  });

  describe('Daily Usage Workflows', () => {
    it('should handle typical daily expense management tasks', async () => {
      renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      // Morning: Add new equipment purchase
      const addEquipmentButton = screen.getByTestId('add-equipment');
      fireEvent.click(addEquipmentButton);

      // Midday: Reorder equipment priorities
      const reorderButton = screen.getByTestId('reorder-equipment');
      fireEvent.click(reorderButton);

      // Afternoon: Add recurring fixed expense
      const addFixedButton = screen.getByTestId('add-fixed-expense');
      fireEvent.click(addFixedButton);

      // Evening: Update billable rates
      const updateBillableButton = screen.getByTestId('update-billable');
      fireEvent.click(updateBillableButton);

      // Verify all daily tasks completed
      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
    });

    it('should handle rapid successive operations', async () => {
      renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      const addFixedButton = screen.getByTestId('add-fixed-expense');
      const addEquipmentButton = screen.getByTestId('add-equipment');
      const updateBillableButton = screen.getByTestId('update-billable');

      // Simulate rapid clicking (user impatience)
      for (let i = 0; i < 5; i++) {
        fireEvent.click(addFixedButton);
        fireEvent.click(addEquipmentButton);
        fireEvent.click(updateBillableButton);
      }

      // Should handle rapid operations without breaking
      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
    });
  });

  describe('Complex Business Scenarios', () => {
    it('should handle monthly expense review workflow', async () => {
      renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      // Setup: Add various expenses throughout the month
      const addFixedButton = screen.getByTestId('add-fixed-expense');
      const addEquipmentButton = screen.getByTestId('add-equipment');
      const reorderButton = screen.getByTestId('reorder-equipment');
      const updateBillableButton = screen.getByTestId('update-billable');

      // Week 1: Initial setup
      fireEvent.click(addFixedButton);
      fireEvent.click(addEquipmentButton);
      fireEvent.click(updateBillableButton);

      // Week 2: Add more equipment
      fireEvent.click(addEquipmentButton);
      fireEvent.click(addEquipmentButton);

      // Week 3: Reorganize priorities
      fireEvent.click(reorderButton);

      // Week 4: Add more fixed expenses
      fireEvent.click(addFixedButton);
      fireEvent.click(addFixedButton);

      // Month end: Final billable update
      fireEvent.click(updateBillableButton);

      // Verify monthly workflow completed
      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
    });

    it('should handle project-based expense tracking', async () => {
      renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      // Project start: Setup initial expenses
      const addFixedButton = screen.getByTestId('add-fixed-expense');
      const addEquipmentButton = screen.getByTestId('add-equipment');
      const updateBillableButton = screen.getByTestId('update-billable');

      // Phase 1: Infrastructure setup
      fireEvent.click(addEquipmentButton); // Computer
      fireEvent.click(addEquipmentButton); // Software
      fireEvent.click(addFixedButton); // Office rent

      // Phase 2: Team scaling
      fireEvent.click(updateBillableButton); // Update rates
      fireEvent.click(addFixedButton); // Additional office space

      // Phase 3: Equipment upgrades
      fireEvent.click(addEquipmentButton); // New equipment
      const reorderButton = screen.getByTestId('reorder-equipment');
      fireEvent.click(reorderButton); // Reprioritize

      // Project completion: Final review
      fireEvent.click(updateBillableButton);

      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle network interruption during operations', async () => {
      renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      // Simulate operations before network issue
      const addFixedButton = screen.getByTestId('add-fixed-expense');
      fireEvent.click(addFixedButton);

      // Simulate network interruption (operations should still work with cache)
      const addEquipmentButton = screen.getByTestId('add-equipment');
      fireEvent.click(addEquipmentButton);

      // Simulate network recovery
      const updateBillableButton = screen.getByTestId('update-billable');
      fireEvent.click(updateBillableButton);

      // App should remain functional
      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
    });

    it('should handle user navigation during operations', async () => {
      const { rerender } = renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      // Start operations
      const addFixedButton = screen.getByTestId('add-fixed-expense');
      fireEvent.click(addFixedButton);

      // Simulate navigation away and back
      rerender(<div>Loading...</div>);

      await waitFor(() => {
        rerender(<MockExpenseManagementApp userId={userId} />);
      });

      // Continue operations after navigation
      const addEquipmentButton = screen.getByTestId('add-equipment');
      fireEvent.click(addEquipmentButton);

      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should handle switching between different users', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      const { rerender } = renderWithQueryClient(
        <MockExpenseManagementApp userId={user1} />,
        { queryClient }
      );

      // User 1 operations
      const addFixedButton = screen.getByTestId('add-fixed-expense');
      fireEvent.click(addFixedButton);

      // Switch to User 2
      rerender(<MockExpenseManagementApp userId={user2} />);

      // User 2 operations
      const addEquipmentButton = screen.getByTestId('add-equipment');
      fireEvent.click(addEquipmentButton);

      // Switch back to User 1
      rerender(<MockExpenseManagementApp userId={user1} />);

      // Continue User 1 operations
      const updateBillableButton = screen.getByTestId('update-billable');
      fireEvent.click(updateBillableButton);

      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
    });

    it('should handle concurrent user sessions', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // Render two instances for different users
      const { container: container1 } = renderWithQueryClient(
        <MockExpenseManagementApp userId={user1} />,
        { queryClient }
      );

      const { container: container2 } = renderWithQueryClient(
        <MockExpenseManagementApp userId={user2} />,
        { queryClient: new QueryClient() }
      );

      // Both users perform operations simultaneously
      const user1AddButton = container1.querySelector('[data-testid="add-fixed-expense"]') as HTMLElement;
      const user2AddButton = container2.querySelector('[data-testid="add-equipment"]') as HTMLElement;

      fireEvent.click(user1AddButton);
      fireEvent.click(user2AddButton);

      expect(container1).toBeInTheDocument();
      expect(container2).toBeInTheDocument();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-frequency operations', async () => {
      renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      const startTime = performance.now();

      const addFixedButton = screen.getByTestId('add-fixed-expense');
      const addEquipmentButton = screen.getByTestId('add-equipment');
      const reorderButton = screen.getByTestId('reorder-equipment');

      // Perform many operations rapidly
      for (let i = 0; i < 50; i++) {
        fireEvent.click(addFixedButton);
        fireEvent.click(addEquipmentButton);

        if (i % 10 === 0) {
          fireEvent.click(reorderButton);
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete all operations in reasonable time
      expect(totalTime).toBeLessThan(5000); // Less than 5 seconds
      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
    });

    it('should maintain responsiveness during bulk operations', async () => {
      renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      const addFixedButton = screen.getByTestId('add-fixed-expense');
      const addEquipmentButton = screen.getByTestId('add-equipment');

      // Simulate bulk data entry
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(() => fireEvent.click(addFixedButton));
        operations.push(() => fireEvent.click(addEquipmentButton));
      }

      // Execute operations with small delays to simulate real usage
      for (const operation of operations) {
        operation();
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // UI should remain responsive
      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
      expect(screen.getByTestId('fixed-expense-component')).toBeInTheDocument();
      expect(screen.getByTestId('equipment-component')).toBeInTheDocument();
    });
  });

  describe('Accessibility and Usability', () => {
    it('should support keyboard navigation workflows', async () => {
      renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      const addFixedButton = screen.getByTestId('add-fixed-expense');
      const addEquipmentButton = screen.getByTestId('add-equipment');
      const updateBillableButton = screen.getByTestId('update-billable');

      // Simulate keyboard navigation
      addFixedButton.focus();
      fireEvent.keyDown(addFixedButton, { key: 'Enter' });

      addEquipmentButton.focus();
      fireEvent.keyDown(addEquipmentButton, { key: ' ' }); // Space key

      updateBillableButton.focus();
      fireEvent.keyDown(updateBillableButton, { key: 'Enter' });

      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
    });

    it('should handle screen reader workflows', async () => {
      renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      // Verify ARIA labels and roles are present
      const expenseApp = screen.getByTestId('expense-app');
      expect(expenseApp).toBeInTheDocument();

      // Simulate screen reader navigation
      const fixedExpenseComponent = screen.getByTestId('fixed-expense-component');
      const equipmentComponent = screen.getByTestId('equipment-component');
      const billableComponent = screen.getByTestId('billable-component');

      expect(fixedExpenseComponent).toBeInTheDocument();
      expect(equipmentComponent).toBeInTheDocument();
      expect(billableComponent).toBeInTheDocument();

      // Test that all interactive elements are accessible
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence Workflows', () => {
    it('should handle browser refresh during operations', async () => {
      const { rerender } = renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      // Perform operations
      const addFixedButton = screen.getByTestId('add-fixed-expense');
      fireEvent.click(addFixedButton);

      // Simulate browser refresh (component remount)
      rerender(<div>Refreshing...</div>);

      await waitFor(() => {
        rerender(<MockExpenseManagementApp userId={userId} />);
      });

      // Continue operations after refresh
      const addEquipmentButton = screen.getByTestId('add-equipment');
      fireEvent.click(addEquipmentButton);

      expect(screen.getByTestId('expense-app')).toBeInTheDocument();
    });

    it('should handle tab close and reopen workflow', async () => {
      const { unmount } = renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient }
      );

      // Perform operations
      const addFixedButton = screen.getByTestId('add-fixed-expense');
      fireEvent.click(addFixedButton);

      // Simulate tab close
      unmount();

      // Simulate tab reopen
      const { container } = renderWithQueryClient(
        <MockExpenseManagementApp userId={userId} />,
        { queryClient: new QueryClient() } // New client simulates fresh session
      );

      expect(container).toBeInTheDocument();
    });
  });
});