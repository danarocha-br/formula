import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  createGenericCacheUtils,
  createSingleObjectCacheUtils,
  genericOptimisticUpdateUtils,
  genericCacheValidationUtils,
  fixedExpenseCacheUtils,
  equipmentExpenseCacheUtils,
  billableCostCacheUtils,
  type BaseCacheItem,
  type RankableItem,
  type CacheUtilsConfig,
  type BillableCostItem,
} from '../query-cache-utils';
import type { ExpenseItem, EquipmentExpenseItem } from '../../app/types';

// Mock console methods to avoid noise in tests
vi.mock('console', () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
}));

// Test item types
interface TestItem extends RankableItem {
  name: string;
  value: number;
}

interface TestSingleItem extends BaseCacheItem {
  title: string;
  count: number;
}

describe('Generic Cache Utils', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe('createGenericCacheUtils', () => {
    const testConfig: CacheUtilsConfig<TestItem> = {
      queryKeyFactory: (userId: string) => ['test-items', userId],
      sortComparator: (a: TestItem, b: TestItem) => (a.rank ?? 0) - (b.rank ?? 0),
      validateItem: (item: TestItem): string[] => {
        const errors: string[] = [];
        if (!item.name) errors.push('Missing name');
        if (item.value === undefined) errors.push('Missing value');
        return errors;
      },
      createOptimisticItem: (data: Partial<TestItem>, userId: string): TestItem => {
        const now = new Date().toISOString();
        const tempId = genericOptimisticUpdateUtils.createTempId();
        return {
          name: data.name || '',
          value: data.value || 0,
          rank: data.rank || 0,
          ...data,
          id: tempId,
          userId,
          createdAt: now,
          updatedAt: now,
        } as TestItem;
      },
      itemName: 'test-item',
    };

    const cacheUtils = createGenericCacheUtils(testConfig);

    it('should add item to empty cache', () => {
      const userId = 'test-user';
      const newItem: TestItem = {
        id: 1,
        name: 'Test Item',
        value: 100,
        rank: 1,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      cacheUtils.addItem(queryClient, userId, newItem);

      const items = cacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(newItem);
    });

    it('should update existing item', () => {
      const userId = 'test-user';
      const originalItem: TestItem = {
        id: 1,
        name: 'Original',
        value: 100,
        rank: 1,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const updatedItem: TestItem = {
        ...originalItem,
        name: 'Updated',
        value: 200,
      };

      cacheUtils.addItem(queryClient, userId, originalItem);
      cacheUtils.updateItem(queryClient, userId, updatedItem);

      const items = cacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Updated');
      expect(items[0].value).toBe(200);
    });

    it('should remove item from cache', () => {
      const userId = 'test-user';
      const item1: TestItem = {
        id: 1,
        name: 'Item 1',
        value: 100,
        rank: 1,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const item2: TestItem = {
        id: 2,
        name: 'Item 2',
        value: 200,
        rank: 2,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      cacheUtils.addItem(queryClient, userId, item1);
      cacheUtils.addItem(queryClient, userId, item2);
      cacheUtils.removeItem(queryClient, userId, 1);

      const items = cacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(2);
    });

    it('should maintain sort order', () => {
      const userId = 'test-user';
      const item1: TestItem = {
        id: 1,
        name: 'Item 1',
        value: 100,
        rank: 3,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const item2: TestItem = {
        id: 2,
        name: 'Item 2',
        value: 200,
        rank: 1,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const item3: TestItem = {
        id: 3,
        name: 'Item 3',
        value: 300,
        rank: 2,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      cacheUtils.addItem(queryClient, userId, item1);
      cacheUtils.addItem(queryClient, userId, item2);
      cacheUtils.addItem(queryClient, userId, item3);

      const items = cacheUtils.getCurrentItems(queryClient, userId);
      expect(items.map(item => item.rank)).toEqual([1, 2, 3]);
      expect(items.map(item => item.id)).toEqual([2, 3, 1]);
    });

    it('should handle reordering items', () => {
      const userId = 'test-user';
      const items: TestItem[] = [
        {
          id: 1,
          name: 'Item 1',
          value: 100,
          rank: 1,
          userId,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'Item 2',
          value: 200,
          rank: 2,
          userId,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ];

      // Add items
      items.forEach(item => cacheUtils.addItem(queryClient, userId, item));

      // Reorder them
      const reorderedItems = [
        { ...items[1], rank: 1 },
        { ...items[0], rank: 2 },
      ];

      cacheUtils.reorderItems(queryClient, userId, reorderedItems);

      const result = cacheUtils.getCurrentItems(queryClient, userId);
      expect(result.map(item => item.id)).toEqual([2, 1]);
    });

    it('should check if item exists', () => {
      const userId = 'test-user';
      const item: TestItem = {
        id: 1,
        name: 'Test Item',
        value: 100,
        rank: 1,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      expect(cacheUtils.itemExists(queryClient, userId, 1)).toBe(false);

      cacheUtils.addItem(queryClient, userId, item);

      expect(cacheUtils.itemExists(queryClient, userId, 1)).toBe(true);
      expect(cacheUtils.itemExists(queryClient, userId, 999)).toBe(false);
    });

    it('should get specific item', () => {
      const userId = 'test-user';
      const item: TestItem = {
        id: 1,
        name: 'Test Item',
        value: 100,
        rank: 1,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      cacheUtils.addItem(queryClient, userId, item);

      const retrieved = cacheUtils.getItem(queryClient, userId, 1);
      expect(retrieved).toEqual(item);

      const notFound = cacheUtils.getItem(queryClient, userId, 999);
      expect(notFound).toBeUndefined();
    });
  });

  describe('createSingleObjectCacheUtils', () => {
    const singleObjectConfig: CacheUtilsConfig<TestSingleItem> = {
      queryKeyFactory: (userId: string) => ['test-single', userId],
      sortComparator: () => 0,
      validateItem: (item: TestSingleItem): string[] => {
        const errors: string[] = [];
        if (!item.title) errors.push('Missing title');
        if (item.count === undefined) errors.push('Missing count');
        return errors;
      },
      createOptimisticItem: (data: Partial<TestSingleItem>, userId: string): TestSingleItem => {
        const now = new Date().toISOString();
        const tempId = genericOptimisticUpdateUtils.createTempId();
        return {
          title: data.title || '',
          count: data.count || 0,
          ...data,
          id: tempId,
          userId,
          createdAt: now,
          updatedAt: now,
        } as TestSingleItem;
      },
      itemName: 'test-single',
    };

    const singleObjectUtils = createSingleObjectCacheUtils(singleObjectConfig);

    it('should update single object', () => {
      const userId = 'test-user';
      const item: TestSingleItem = {
        id: 1,
        title: 'Test Title',
        count: 42,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      singleObjectUtils.updateObject(queryClient, userId, item);

      const retrieved = singleObjectUtils.getCurrentObject(queryClient, userId);
      expect(retrieved).toEqual(item);
    });

    it('should check if object exists', () => {
      const userId = 'test-user';

      expect(singleObjectUtils.objectExists(queryClient, userId)).toBe(false);

      const item: TestSingleItem = {
        id: 1,
        title: 'Test Title',
        count: 42,
        userId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      singleObjectUtils.updateObject(queryClient, userId, item);

      expect(singleObjectUtils.objectExists(queryClient, userId)).toBe(true);
    });
  });

  describe('genericOptimisticUpdateUtils', () => {
    it('should create temporary IDs', () => {
      const tempId1 = genericOptimisticUpdateUtils.createTempId();
      const tempId2 = genericOptimisticUpdateUtils.createTempId();

      expect(tempId1).toBeLessThan(0);
      expect(tempId2).toBeLessThan(0);
      expect(tempId1).not.toBe(tempId2);
    });

    it('should identify temporary items', () => {
      const tempItem: TestItem = {
        id: -123,
        name: 'Temp',
        value: 100,
        rank: 1,
        userId: 'test',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const realItem: TestItem = {
        id: 123,
        name: 'Real',
        value: 100,
        rank: 1,
        userId: 'test',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      expect(genericOptimisticUpdateUtils.isTempItem(tempItem)).toBe(true);
      expect(genericOptimisticUpdateUtils.isTempItem(realItem)).toBe(false);
    });

    it('should filter temporary and real items', () => {
      const items: TestItem[] = [
        {
          id: -1,
          name: 'Temp 1',
          value: 100,
          rank: 1,
          userId: 'test',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 1,
          name: 'Real 1',
          value: 200,
          rank: 2,
          userId: 'test',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: -2,
          name: 'Temp 2',
          value: 300,
          rank: 3,
          userId: 'test',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ];

      const tempItems = genericOptimisticUpdateUtils.getTempItems(items);
      const realItems = genericOptimisticUpdateUtils.getRealItems(items);

      expect(tempItems).toHaveLength(2);
      expect(realItems).toHaveLength(1);
      expect(tempItems.map(item => item.id)).toEqual([-1, -2]);
      expect(realItems.map(item => item.id)).toEqual([1]);
    });
  });

  describe('genericCacheValidationUtils', () => {
    it('should validate sorting', () => {
      const sortedItems: TestItem[] = [
        { id: 1, name: 'A', value: 100, rank: 1, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
        { id: 2, name: 'B', value: 200, rank: 2, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
        { id: 3, name: 'C', value: 300, rank: 3, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
      ];

      const unsortedItems: TestItem[] = [
        { id: 1, name: 'A', value: 100, rank: 3, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
        { id: 2, name: 'B', value: 200, rank: 1, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
        { id: 3, name: 'C', value: 300, rank: 2, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
      ];

      const sortComparator = (a: TestItem, b: TestItem) => (a.rank ?? 0) - (b.rank ?? 0);

      expect(genericCacheValidationUtils.isProperlysorted(sortedItems, sortComparator)).toBe(true);
      expect(genericCacheValidationUtils.isProperlysorted(unsortedItems, sortComparator)).toBe(false);
    });

    it('should validate items', () => {
      const validItems: TestItem[] = [
        { id: 1, name: 'Valid', value: 100, rank: 1, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
      ];

      const invalidItems: TestItem[] = [
        { id: 0, name: '', value: 100, rank: 1, userId: '', createdAt: '', updatedAt: '' } as TestItem,
      ];

      const additionalValidator = (item: TestItem, index: number): string[] => {
        const errors: string[] = [];
        if (!item.name) errors.push(`Item at index ${index} missing name`);
        if (item.value === undefined) errors.push(`Item at index ${index} missing value`);
        return errors;
      };

      const validErrors = genericCacheValidationUtils.validateItems(validItems, additionalValidator);
      const invalidErrors = genericCacheValidationUtils.validateItems(invalidItems, additionalValidator);

      expect(validErrors).toHaveLength(0);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should find duplicates', () => {
      const itemsWithDuplicates: TestItem[] = [
        { id: 1, name: 'A', value: 100, rank: 1, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
        { id: 2, name: 'B', value: 200, rank: 2, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
        { id: 1, name: 'A Duplicate', value: 150, rank: 3, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
      ];

      const itemsWithoutDuplicates: TestItem[] = [
        { id: 1, name: 'A', value: 100, rank: 1, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
        { id: 2, name: 'B', value: 200, rank: 2, userId: 'test', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
      ];

      const duplicates = genericCacheValidationUtils.findDuplicates(itemsWithDuplicates);
      const noDuplicates = genericCacheValidationUtils.findDuplicates(itemsWithoutDuplicates);

      expect(duplicates).toEqual([1]);
      expect(noDuplicates).toEqual([]);
    });

    it('should validate user consistency', () => {
      const consistentItems: TestItem[] = [
        { id: 1, name: 'A', value: 100, rank: 1, userId: 'test-user', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
        { id: 2, name: 'B', value: 200, rank: 2, userId: 'test-user', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
      ];

      const inconsistentItems: TestItem[] = [
        { id: 1, name: 'A', value: 100, rank: 1, userId: 'test-user', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
        { id: 2, name: 'B', value: 200, rank: 2, userId: 'other-user', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
      ];

      const consistentErrors = genericCacheValidationUtils.validateUserConsistency(consistentItems, 'test-user');
      const inconsistentErrors = genericCacheValidationUtils.validateUserConsistency(inconsistentItems, 'test-user');

      expect(consistentErrors).toHaveLength(0);
      expect(inconsistentErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Pre-configured cache utilities', () => {
    describe('fixedExpenseCacheUtils', () => {
      it('should work with ExpenseItem type', () => {
        const userId = 'test-user';
        const expense: ExpenseItem = {
          id: 1,
          name: 'Test Expense',
          amount: 100,
          period: 'monthly',
          category: 'rent',
          rank: 1,
          userId,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        };

        fixedExpenseCacheUtils.addItem(queryClient, userId, expense);

        const expenses = fixedExpenseCacheUtils.getCurrentItems(queryClient, userId);
        expect(expenses).toHaveLength(1);
        expect(expenses[0]).toEqual(expense);
      });
    });

    describe('equipmentExpenseCacheUtils', () => {
      it('should work with EquipmentExpenseItem type', () => {
        const userId = 'test-user';
        const equipment: EquipmentExpenseItem = {
          id: 1,
          name: 'Test Equipment',
          amount: 1000,
          category: 'computer',
          purchaseDate: new Date('2023-01-01'),
          usage: 80,
          lifeSpan: 36,
          rank: 1,
          userId,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        };

        equipmentExpenseCacheUtils.addItem(queryClient, userId, equipment);

        const equipments = equipmentExpenseCacheUtils.getCurrentItems(queryClient, userId);
        expect(equipments).toHaveLength(1);
        expect(equipments[0]).toEqual(equipment);
      });
    });

    describe('billableCostCacheUtils', () => {
      it('should work with BillableCostItem type', () => {
        const userId = 'test-user';
        const billableCost: BillableCostItem = {
          id: 1,
          workDays: 22,
          hoursPerDay: 8,
          holidaysDays: 10,
          vacationsDays: 20,
          sickLeaveDays: 5,
          monthlySalary: 5000,
          taxes: 1000,
          fees: 200,
          margin: 20,
          billableHours: 160,
          userId,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        };

        billableCostCacheUtils.updateObject(queryClient, userId, billableCost);

        const retrieved = billableCostCacheUtils.getCurrentObject(queryClient, userId);
        expect(retrieved).toEqual(billableCost);
      });
    });
  });
});