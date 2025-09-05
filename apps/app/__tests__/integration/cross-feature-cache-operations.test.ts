/**
 * Integration tests for cross-feature cache operations
 * Tests interactions between different expense features and their cache utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { reactQueryKeys } from '@repo/database/cache-keys/react-query-keys';
import { expenseCacheUtils } from '../../utils/query-cache-utils';
import { equipmentCacheUtils } from '../../utils/equipment-cache-utils';
import type { ExpenseItem, EquipmentExpenseItem, BillableCostItem } from '../../app/types';

// Mock billable cache utils since they might not exist yet
vi.mock('../../utils/query-cache-utils', async () => {
  const actual = await vi.importActual('../../utils/query-cache-utils');
  return {
    ...actual,
    billableCostCacheUtils: {
      updateObject: vi.fn(),
      getCurrentObject: vi.fn(),
      replaceObject: vi.fn(),
      objectExists: vi.fn(),
    },
  };
});

describe('Cross-Feature Cache Operations Integration Tests', () => {
  let queryClient: QueryClient;
  const userId = 'test-user-123';

  // Get the mocked billable cache utils
  const mockBillableCacheUtils = vi.mocked(
    require('../../utils/query-cache-utils').billableCostCacheUtils
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    vi.clearAllMocks();
  });

  const createFixedExpense = (overrides: Partial<ExpenseItem> = {}): ExpenseItem => ({
    id: 1,
    userId,
    name: 'Fixed Expense',
    category: 'office',
    amount: 1000,
    period: 'monthly',
    rank: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const createEquipmentExpense = (overrides: Partial<EquipmentExpenseItem> = {}): EquipmentExpenseItem => ({
    id: 1,
    userId,
    name: 'Equipment Expense',
    category: 'computer',
    amount: 2000,
    purchaseDate: new Date('2024-01-01'),
    usage: 80,
    lifeSpan: 36,
    rank: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const createBillableCost = (overrides: Partial<BillableCostItem> = {}): BillableCostItem => ({
    id: 1,
    userId,
    workDays: 22,
    hoursPerDay: 8,
    holidaysDays: 10,
    vacationsDays: 20,
    sickLeaveDays: 5,
    monthlySalary: 5000,
    taxes: 25,
    fees: 5,
    margin: 20,
    billableHours: 1760,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('Cache Isolation', () => {
    it('should maintain separate cache spaces for different expense types', () => {
      const fixedExpense = createFixedExpense({ id: 1, name: 'Fixed Expense 1' });
      const equipmentExpense = createEquipmentExpense({ id: 1, name: 'Equipment Expense 1' });
      const billableCost = createBillableCost({ id: 1 });

      // Add items to different caches
      expenseCacheUtils.addExpense(queryClient, userId, fixedExpense);
      equipmentCacheUtils.addItem(queryClient, userId, equipmentExpense);
      mockBillableCacheUtils.updateObject.mockImplementation(() => {
        queryClient.setQueryData(reactQueryKeys.billableExpenses.byUserId(userId), billableCost);
      });
      mockBillableCacheUtils.updateObject(queryClient, userId, billableCost);

      // Verify each cache has its own data
      const fixedExpenses = expenseCacheUtils.getCurrentExpenses(queryClient, userId);
      const equipmentExpenses = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      const billableData = queryClient.getQueryData(reactQueryKeys.billableExpenses.byUserId(userId));

      expect(fixedExpenses).toHaveLength(1);
      expect(fixedExpenses[0].name).toBe('Fixed Expense 1');

      expect(equipmentExpenses).toHaveLength(1);
      expect(equipmentExpenses[0].name).toBe('Equipment Expense 1');

      expect(billableData).toEqual(billableCost);

      // Verify caches don't interfere with each other
      expect(fixedExpenses[0].id).toBe(equipmentExpenses[0].id); // Same ID but different objects
      expect(fixedExpenses[0]).not.toEqual(equipmentExpenses[0]);
    });

    it('should handle operations on one cache without affecting others', () => {
      const fixedExpense1 = createFixedExpense({ id: 1, name: 'Fixed 1' });
      const fixedExpense2 = createFixedExpense({ id: 2, name: 'Fixed 2' });
      const equipmentExpense1 = createEquipmentExpense({ id: 1, name: 'Equipment 1' });
      const equipmentExpense2 = createEquipmentExpense({ id: 2, name: 'Equipment 2' });

      // Add items to both caches
      expenseCacheUtils.addExpense(queryClient, userId, fixedExpense1);
      expenseCacheUtils.addExpense(queryClient, userId, fixedExpense2);
      equipmentCacheUtils.addItem(queryClient, userId, equipmentExpense1);
      equipmentCacheUtils.addItem(queryClient, userId, equipmentExpense2);

      // Remove from fixed expenses
      expenseCacheUtils.removeExpense(queryClient, userId, 1);

      // Verify fixed expenses changed but equipment didn't
      const fixedExpenses = expenseCacheUtils.getCurrentExpenses(queryClient, userId);
      const equipmentExpenses = equipmentCacheUtils.getCurrentItems(queryClient, userId);

      expect(fixedExpenses).toHaveLength(1);
      expect(fixedExpenses[0].name).toBe('Fixed 2');

      expect(equipmentExpenses).toHaveLength(2);
      expect(equipmentExpenses.find(e => e.name === 'Equipment 1')).toBeDefined();
      expect(equipmentExpenses.find(e => e.name === 'Equipment 2')).toBeDefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent operations across different features', async () => {
      const operations = [];

      // Fixed expense operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              const expense = createFixedExpense({ id: i, name: `Fixed ${i}` });
              expenseCacheUtils.addExpense(queryClient, userId, expense);
              resolve();
            }, Math.random() * 10);
          })
        );
      }

      // Equipment expense operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              const equipment = createEquipmentExpense({ id: i, name: `Equipment ${i}` });
              equipmentCacheUtils.addItem(queryClient, userId, equipment);
              resolve();
            }, Math.random() * 10);
          })
        );
      }

      await Promise.all(operations);

      const fixedExpenses = expenseCacheUtils.getCurrentExpenses(queryClient, userId);
      const equipmentExpenses = equipmentCacheUtils.getCurrentItems(queryClient, userId);

      expect(fixedExpenses).toHaveLength(10);
      expect(equipmentExpenses).toHaveLength(10);

      // Verify data integrity
      fixedExpenses.forEach((expense, index) => {
        expect(expense.name).toMatch(/^Fixed \d+$/);
      });

      equipmentExpenses.forEach((equipment, index) => {
        expect(equipment.name).toMatch(/^Equipment \d+$/);
      });
    });

    it('should handle concurrent updates and deletes across features', async () => {
      // Setup initial data
      const fixedExpenses = Array.from({ length: 5 }, (_, i) =>
        createFixedExpense({ id: i, name: `Fixed ${i}` })
      );
      const equipmentExpenses = Array.from({ length: 5 }, (_, i) =>
        createEquipmentExpense({ id: i, name: `Equipment ${i}` })
      );

      fixedExpenses.forEach(expense =>
        expenseCacheUtils.addExpense(queryClient, userId, expense)
      );
      equipmentExpenses.forEach(equipment =>
        equipmentCacheUtils.addItem(queryClient, userId, equipment)
      );

      // Perform concurrent operations
      const concurrentOps = [
        // Update fixed expenses
        ...Array.from({ length: 3 }, (_, i) =>
          new Promise<void>((resolve) => {
            setTimeout(() => {
              const updatedExpense = { ...fixedExpenses[i], amount: 2000 };
              expenseCacheUtils.updateExpense(queryClient, userId, updatedExpense);
              resolve();
            }, Math.random() * 20);
          })
        ),
        // Delete equipment expenses
        ...Array.from({ length: 2 }, (_, i) =>
          new Promise<void>((resolve) => {
            setTimeout(() => {
              equipmentCacheUtils.removeItem(queryClient, userId, i);
              resolve();
            }, Math.random() * 20);
          })
        ),
        // Add new items
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const newFixed = createFixedExpense({ id: 10, name: 'New Fixed' });
            expenseCacheUtils.addExpense(queryClient, userId, newFixed);
            resolve();
          }, Math.random() * 20);
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const newEquipment = createEquipmentExpense({ id: 10, name: 'New Equipment' });
            equipmentCacheUtils.addItem(queryClient, userId, newEquipment);
            resolve();
          }, Math.random() * 20);
        }),
      ];

      await Promise.all(concurrentOps);

      const finalFixedExpenses = expenseCacheUtils.getCurrentExpenses(queryClient, userId);
      const finalEquipmentExpenses = equipmentCacheUtils.getCurrentItems(queryClient, userId);

      // Verify final state
      expect(finalFixedExpenses).toHaveLength(6); // 5 original + 1 new
      expect(finalEquipmentExpenses).toHaveLength(4); // 5 original - 2 deleted + 1 new

      // Verify updates were applied
      const updatedExpenses = finalFixedExpenses.filter(e => e.amount === 2000);
      expect(updatedExpenses.length).toBeGreaterThan(0);

      // Verify new items were added
      expect(finalFixedExpenses.find(e => e.name === 'New Fixed')).toBeDefined();
      expect(finalEquipmentExpenses.find(e => e.name === 'New Equipment')).toBeDefined();
    });
  });

  describe('Query Key Management', () => {
    it('should use correct query keys for different features', () => {
      const fixedKey = reactQueryKeys.fixedExpenses.byUserId(userId);
      const equipmentKey = reactQueryKeys.equipmentExpenses.byUserId(userId);
      const billableKey = reactQueryKeys.billableExpenses.byUserId(userId);

      // Verify keys are different
      expect(fixedKey).not.toEqual(equipmentKey);
      expect(fixedKey).not.toEqual(billableKey);
      expect(equipmentKey).not.toEqual(billableKey);

      // Verify key structure
      expect(fixedKey).toContain('fixed-expenses');
      expect(equipmentKey).toContain('equipment-expenses');
      expect(billableKey).toContain('billable-expenses');

      // Verify all keys include userId
      expect(fixedKey).toContain(userId);
      expect(equipmentKey).toContain(userId);
      expect(billableKey).toContain(userId);
    });

    it('should handle different user IDs correctly', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      const expense1 = createFixedExpense({ id: 1, userId: user1 });
      const expense2 = createFixedExpense({ id: 1, userId: user2 });

      expenseCacheUtils.addExpense(queryClient, user1, expense1);
      expenseCacheUtils.addExpense(queryClient, user2, expense2);

      const user1Expenses = expenseCacheUtils.getCurrentExpenses(queryClient, user1);
      const user2Expenses = expenseCacheUtils.getCurrentExpenses(queryClient, user2);

      expect(user1Expenses).toHaveLength(1);
      expect(user2Expenses).toHaveLength(1);
      expect(user1Expenses[0].userId).toBe(user1);
      expect(user2Expenses[0].userId).toBe(user2);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency during complex operations', () => {
      // Setup complex scenario with multiple features
      const fixedExpenses = Array.from({ length: 3 }, (_, i) =>
        createFixedExpense({ id: i, name: `Fixed ${i}`, rank: i + 1 })
      );
      const equipmentExpenses = Array.from({ length: 3 }, (_, i) =>
        createEquipmentExpense({ id: i, name: `Equipment ${i}`, rank: i + 1 })
      );

      // Add all items
      fixedExpenses.forEach(expense =>
        expenseCacheUtils.addExpense(queryClient, userId, expense)
      );
      equipmentExpenses.forEach(equipment =>
        equipmentCacheUtils.addItem(queryClient, userId, equipment)
      );

      // Perform reordering operations
      const reorderedFixed = [...fixedExpenses].reverse().map((expense, index) => ({
        ...expense,
        rank: index + 1,
      }));
      const reorderedEquipment = [...equipmentExpenses].reverse().map((equipment, index) => ({
        ...equipment,
        rank: index + 1,
      }));

      expenseCacheUtils.reorderExpenses(queryClient, userId, reorderedFixed);
      equipmentCacheUtils.reorderItems(queryClient, userId, reorderedEquipment);

      // Verify consistency
      const finalFixed = expenseCacheUtils.getCurrentExpenses(queryClient, userId);
      const finalEquipment = equipmentCacheUtils.getCurrentItems(queryClient, userId);

      // Check sorting
      expect(finalFixed[0].rank).toBe(1);
      expect(finalFixed[1].rank).toBe(2);
      expect(finalFixed[2].rank).toBe(3);

      expect(finalEquipment[0].rank).toBe(1);
      expect(finalEquipment[1].rank).toBe(2);
      expect(finalEquipment[2].rank).toBe(3);

      // Check that reordering was applied correctly
      expect(finalFixed[0].name).toBe('Fixed 2'); // Originally last
      expect(finalEquipment[0].name).toBe('Equipment 2'); // Originally last
    });

    it('should handle validation errors consistently across features', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create invalid items for different features
      const invalidFixed = createFixedExpense({ name: '', amount: -100 });
      const invalidEquipment = createEquipmentExpense({
        name: '',
        amount: -100,
        usage: 150,
        lifeSpan: 0
      });

      // Add invalid items (should log warnings but not fail)
      expenseCacheUtils.addExpense(queryClient, userId, invalidFixed);
      equipmentCacheUtils.addItem(queryClient, userId, invalidEquipment);

      // Verify items were added despite validation warnings
      const fixedExpenses = expenseCacheUtils.getCurrentExpenses(queryClient, userId);
      const equipmentExpenses = equipmentCacheUtils.getCurrentItems(queryClient, userId);

      expect(fixedExpenses).toHaveLength(1);
      expect(equipmentExpenses).toHaveLength(1);

      // Verify warnings were logged
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large datasets across multiple features efficiently', () => {
      const startTime = performance.now();

      // Create large datasets
      const largeFixedDataset = Array.from({ length: 1000 }, (_, i) =>
        createFixedExpense({ id: i, name: `Fixed ${i}`, rank: i })
      );
      const largeEquipmentDataset = Array.from({ length: 1000 }, (_, i) =>
        createEquipmentExpense({ id: i, name: `Equipment ${i}`, rank: i })
      );

      // Add all items
      expenseCacheUtils.replaceAllExpenses(queryClient, userId, largeFixedDataset);
      equipmentCacheUtils.replaceAllItems(queryClient, userId, largeEquipmentDataset);

      const addTime = performance.now();

      // Perform operations on large datasets
      const fixedUpdates = largeFixedDataset.slice(0, 100).map(expense => ({
        ...expense,
        amount: expense.amount + 100,
      }));
      const equipmentUpdates = largeEquipmentDataset.slice(0, 100).map(equipment => ({
        ...equipment,
        amount: equipment.amount + 100,
      }));

      expenseCacheUtils.updateMultipleExpenses(queryClient, userId, fixedUpdates);
      equipmentCacheUtils.updateMultipleItems(queryClient, userId, equipmentUpdates);

      const updateTime = performance.now();

      // Verify final state
      const finalFixed = expenseCacheUtils.getCurrentExpenses(queryClient, userId);
      const finalEquipment = equipmentCacheUtils.getCurrentItems(queryClient, userId);

      expect(finalFixed).toHaveLength(1000);
      expect(finalEquipment).toHaveLength(1000);

      const endTime = performance.now();

      // Performance assertions
      expect(addTime - startTime).toBeLessThan(1000); // Adding should take less than 1 second
      expect(updateTime - addTime).toBeLessThan(500); // Updates should take less than 500ms
      expect(endTime - updateTime).toBeLessThan(100); // Verification should be fast
    });

    it('should maintain performance with frequent cross-feature operations', () => {
      const startTime = performance.now();

      // Perform many alternating operations between features
      for (let i = 0; i < 100; i++) {
        const fixedExpense = createFixedExpense({ id: i, name: `Fixed ${i}` });
        const equipmentExpense = createEquipmentExpense({ id: i, name: `Equipment ${i}` });

        expenseCacheUtils.addExpense(queryClient, userId, fixedExpense);
        equipmentCacheUtils.addItem(queryClient, userId, equipmentExpense);

        if (i % 10 === 0) {
          // Perform some updates
          const updatedFixed = { ...fixedExpense, amount: 2000 };
          const updatedEquipment = { ...equipmentExpense, amount: 3000 };

          expenseCacheUtils.updateExpense(queryClient, userId, updatedFixed);
          equipmentCacheUtils.updateItem(queryClient, userId, updatedEquipment);
        }

        if (i % 20 === 0) {
          // Perform some deletions
          expenseCacheUtils.removeExpense(queryClient, userId, i - 10);
          equipmentCacheUtils.removeItem(queryClient, userId, i - 10);
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete all operations in reasonable time
      expect(totalTime).toBeLessThan(2000); // Less than 2 seconds for 100 operations per feature

      // Verify final state
      const finalFixed = expenseCacheUtils.getCurrentExpenses(queryClient, userId);
      const finalEquipment = equipmentCacheUtils.getCurrentItems(queryClient, userId);

      expect(finalFixed.length).toBeGreaterThan(80); // Some were deleted
      expect(finalEquipment.length).toBeGreaterThan(80);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle errors in one feature without affecting others', () => {
      // Setup initial data
      const fixedExpense = createFixedExpense({ id: 1 });
      const equipmentExpense = createEquipmentExpense({ id: 1 });

      expenseCacheUtils.addExpense(queryClient, userId, fixedExpense);
      equipmentCacheUtils.addItem(queryClient, userId, equipmentExpense);

      // Mock an error in fixed expense operations
      const originalSetQueryData = queryClient.setQueryData;
      queryClient.setQueryData = vi.fn().mockImplementation((key, updater) => {
        if (Array.isArray(key) && key.includes('fixed-expenses')) {
          throw new Error('Fixed expense cache error');
        }
        return originalSetQueryData.call(queryClient, key, updater);
      });

      // Try to update fixed expense (should fail)
      expect(() => {
        expenseCacheUtils.updateExpense(queryClient, userId, { ...fixedExpense, amount: 2000 });
      }).toThrow('Fixed expense cache error');

      // Equipment operations should still work
      expect(() => {
        equipmentCacheUtils.updateItem(queryClient, userId, { ...equipmentExpense, amount: 3000 });
      }).not.toThrow();

      // Restore original method
      queryClient.setQueryData = originalSetQueryData;

      // Verify equipment was updated but fixed wasn't
      const finalEquipment = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(finalEquipment[0].amount).toBe(3000);
    });

    it('should recover gracefully from cache corruption', () => {
      // Setup normal data
      const fixedExpense = createFixedExpense({ id: 1 });
      expenseCacheUtils.addExpense(queryClient, userId, fixedExpense);

      // Corrupt the cache with invalid data
      const fixedKey = reactQueryKeys.fixedExpenses.byUserId(userId);
      queryClient.setQueryData(fixedKey, 'corrupted-data');

      // Operations should handle corruption gracefully
      expect(() => {
        const expenses = expenseCacheUtils.getCurrentExpenses(queryClient, userId);
        expect(expenses).toEqual([]); // Should return empty array for corrupted data
      }).not.toThrow();

      // Should be able to recover by adding new data
      const newExpense = createFixedExpense({ id: 2, name: 'Recovery Expense' });
      expect(() => {
        expenseCacheUtils.replaceAllExpenses(queryClient, userId, [newExpense]);
      }).not.toThrow();

      const recoveredExpenses = expenseCacheUtils.getCurrentExpenses(queryClient, userId);
      expect(recoveredExpenses).toHaveLength(1);
      expect(recoveredExpenses[0].name).toBe('Recovery Expense');
    });
  });
});