import { vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { EquipmentExpenseItem } from '../../app/types';
import {
  equipmentCacheUtils,
  equipmentExpenseCacheUtils,
  equipmentDragDropUtils,
  equipmentRankUtils,
} from '../equipment-cache-utils';

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
  console.group = vi.fn();
  console.groupEnd = vi.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

describe('Equipment Cache Utils', () => {
  let queryClient: QueryClient;
  const userId = 'test-user';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const createMockEquipment = (overrides: Partial<EquipmentExpenseItem> = {}): EquipmentExpenseItem => ({
    id: 1,
    name: 'Test Equipment',
    userId,
    rank: 1,
    amount: 1000,
    purchaseDate: new Date('2024-01-01'),
    usage: 100,
    lifeSpan: 12,
    category: 'computer',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('equipmentCacheUtils (Generic Cache Operations)', () => {
    it('should add equipment to cache', () => {
      const equipment = createMockEquipment();

      equipmentCacheUtils.addItem(queryClient, userId, equipment);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(equipment);
    });

    it('should update equipment in cache', () => {
      const equipment = createMockEquipment();
      equipmentCacheUtils.addItem(queryClient, userId, equipment);

      const updatedEquipment = { ...equipment, name: 'Updated Equipment', amount: 2000 };
      equipmentCacheUtils.updateItem(queryClient, userId, updatedEquipment);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items[0].name).toBe('Updated Equipment');
      expect(items[0].amount).toBe(2000);
    });

    it('should remove equipment from cache', () => {
      const equipment = createMockEquipment();
      equipmentCacheUtils.addItem(queryClient, userId, equipment);

      equipmentCacheUtils.removeItem(queryClient, userId, equipment.id);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(0);
    });

    it('should reorder equipment items', () => {
      const equipment1 = createMockEquipment({ id: 1, rank: 1, name: 'First' });
      const equipment2 = createMockEquipment({ id: 2, rank: 2, name: 'Second' });
      const equipment3 = createMockEquipment({ id: 3, rank: 3, name: 'Third' });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);
      equipmentCacheUtils.addItem(queryClient, userId, equipment3);

      // Reorder: move first to last with updated ranks
      const reorderedItems = [
        { ...equipment2, rank: 1 },
        { ...equipment3, rank: 2 },
        { ...equipment1, rank: 3 }
      ];
      equipmentCacheUtils.reorderItems(queryClient, userId, reorderedItems);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items.map(item => item.name)).toEqual(['Second', 'Third', 'First']);
    });

    it('should handle multiple item updates', () => {
      const equipment1 = createMockEquipment({ id: 1, name: 'First' });
      const equipment2 = createMockEquipment({ id: 2, name: 'Second' });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);

      const updates = [
        { ...equipment1, name: 'Updated First' },
        { ...equipment2, name: 'Updated Second' },
      ];

      equipmentCacheUtils.updateMultipleItems(queryClient, userId, updates);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items[0].name).toBe('Updated First');
      expect(items[1].name).toBe('Updated Second');
    });

    it('should check if equipment exists', () => {
      const equipment = createMockEquipment();

      expect(equipmentCacheUtils.itemExists(queryClient, userId, equipment.id)).toBe(false);

      equipmentCacheUtils.addItem(queryClient, userId, equipment);

      expect(equipmentCacheUtils.itemExists(queryClient, userId, equipment.id)).toBe(true);
    });

    it('should get specific equipment item', () => {
      const equipment = createMockEquipment();
      equipmentCacheUtils.addItem(queryClient, userId, equipment);

      const retrieved = equipmentCacheUtils.getItem(queryClient, userId, equipment.id);

      expect(retrieved).toEqual(equipment);
    });

    it('should replace temporary item with real item', () => {
      const tempEquipment = createMockEquipment({ id: -123 }); // Negative ID for temp
      const realEquipment = createMockEquipment({ id: 456 });

      equipmentCacheUtils.addItem(queryClient, userId, tempEquipment);
      equipmentCacheUtils.replaceTempItem(queryClient, userId, -123, realEquipment);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items[0].id).toBe(456);
      expect(items[0].name).toBe(realEquipment.name);
    });
  });

  describe('equipmentExpenseCacheUtils (Equipment-Specific Operations)', () => {
    it('should reorder by drag and drop', () => {
      const equipment1 = createMockEquipment({ id: 1, rank: 1, name: 'First' });
      const equipment2 = createMockEquipment({ id: 2, rank: 2, name: 'Second' });
      const equipment3 = createMockEquipment({ id: 3, rank: 3, name: 'Third' });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);
      equipmentCacheUtils.addItem(queryClient, userId, equipment3);

      // Move first item (index 0) to last position (index 2)
      equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, 0, 2);

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items.map(item => item.name)).toEqual(['Second', 'Third', 'First']);
      expect(items.map(item => item.rank)).toEqual([1, 2, 3]);
    });

    it('should update ranks for multiple items', () => {
      const equipment1 = createMockEquipment({ id: 1, rank: 1 });
      const equipment2 = createMockEquipment({ id: 2, rank: 2 });
      const equipment3 = createMockEquipment({ id: 3, rank: 3 });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);
      equipmentCacheUtils.addItem(queryClient, userId, equipment3);

      const rankUpdates = [
        { id: 1, rank: 3 },
        { id: 2, rank: 1 },
        { id: 3, rank: 2 },
      ];

      equipmentExpenseCacheUtils.updateRanks(queryClient, userId, rankUpdates);

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items[0].id).toBe(2); // rank 1
      expect(items[1].id).toBe(3); // rank 2
      expect(items[2].id).toBe(1); // rank 3
    });

    it('should add optimistic equipment', () => {
      const equipmentData = {
        name: 'New Equipment',
        userId,
        rank: 1,
        amount: 500,
        purchaseDate: new Date('2024-01-01'),
        usage: 80,
        lifeSpan: 24,
        category: 'monitor' as const,
      };

      const optimisticItem = equipmentExpenseCacheUtils.addOptimisticEquipment(
        queryClient,
        userId,
        equipmentData
      );

      expect(optimisticItem.id).toBeLessThan(0); // Temporary ID
      expect(optimisticItem.name).toBe('New Equipment');

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(optimisticItem);
    });

    it('should replace optimistic equipment with real data', () => {
      const equipmentData = {
        name: 'New Equipment',
        userId,
        rank: 1,
        amount: 500,
        purchaseDate: new Date('2024-01-01'),
        usage: 80,
        lifeSpan: 24,
        category: 'monitor' as const,
      };

      const optimisticItem = equipmentExpenseCacheUtils.addOptimisticEquipment(
        queryClient,
        userId,
        equipmentData
      );

      const realEquipment = createMockEquipment({ id: 123, name: 'Real Equipment' });

      equipmentExpenseCacheUtils.replaceOptimisticEquipment(
        queryClient,
        userId,
        optimisticItem.id,
        realEquipment
      );

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items[0].id).toBe(123);
      expect(items[0].name).toBe('Real Equipment');
    });

    it('should remove optimistic equipment', () => {
      const equipment = createMockEquipment();
      equipmentCacheUtils.addItem(queryClient, userId, equipment);

      const removedItem = equipmentExpenseCacheUtils.removeOptimisticEquipment(
        queryClient,
        userId,
        equipment.id
      );

      expect(removedItem).toEqual(equipment);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(0);
    });

    it('should get next available rank', () => {
      const equipment1 = createMockEquipment({ id: 1, rank: 1 });
      const equipment2 = createMockEquipment({ id: 2, rank: 3 }); // Gap in ranks

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);

      const nextRank = equipmentExpenseCacheUtils.getNextRank(queryClient, userId);

      expect(nextRank).toBe(4); // Max rank (3) + 1
    });

    it('should validate equipment data', () => {
      const validEquipment = createMockEquipment();
      const invalidEquipment = createMockEquipment({
        name: '',
        amount: -100,
        usage: 150,
        lifeSpan: -5,
        category: undefined as any,
      });

      expect(equipmentExpenseCacheUtils.validateEquipment(validEquipment)).toEqual([]);

      const errors = equipmentExpenseCacheUtils.validateEquipment(invalidEquipment);
      expect(errors).toContain('Missing name');
      expect(errors).toContain('Amount cannot be negative');
      expect(errors).toContain('Usage must be between 0 and 100');
      expect(errors).toContain('Life span must be positive');
      expect(errors).toContain('Missing category');
    });

    it('should batch update equipment', () => {
      const equipment1 = createMockEquipment({ id: 1, name: 'First' });
      const equipment2 = createMockEquipment({ id: 2, name: 'Second' });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);

      const updates = [
        { ...equipment1, name: 'Updated First', amount: 1500 },
        { ...equipment2, name: 'Updated Second', amount: 2500 },
      ];

      equipmentExpenseCacheUtils.batchUpdateEquipment(queryClient, userId, updates);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items[0].name).toBe('Updated First');
      expect(items[0].amount).toBe(1500);
      expect(items[1].name).toBe('Updated Second');
      expect(items[1].amount).toBe(2500);
    });
  });

  describe('equipmentDragDropUtils (Drag-and-Drop Operations)', () => {
    it('should handle drag start', () => {
      const equipment = createMockEquipment();
      equipmentCacheUtils.addItem(queryClient, userId, equipment);

      const draggedItem = equipmentDragDropUtils.handleDragStart(
        queryClient,
        userId,
        equipment.id
      );

      expect(draggedItem).toEqual(equipment);
    });

    it('should handle drag end', () => {
      const equipment1 = createMockEquipment({ id: 1, rank: 1, name: 'First' });
      const equipment2 = createMockEquipment({ id: 2, rank: 2, name: 'Second' });
      const equipment3 = createMockEquipment({ id: 3, rank: 3, name: 'Third' });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);
      equipmentCacheUtils.addItem(queryClient, userId, equipment3);

      const result = equipmentDragDropUtils.handleDragEnd(
        queryClient,
        userId,
        1, // Drag first item
        3  // Drop on third item
      );

      expect(result).not.toBeNull();
      expect(result!.map(item => item.name)).toEqual(['Second', 'Third', 'First']);
    });

    it('should return null for invalid drag end', () => {
      const equipment = createMockEquipment();
      equipmentCacheUtils.addItem(queryClient, userId, equipment);

      const result = equipmentDragDropUtils.handleDragEnd(
        queryClient,
        userId,
        999, // Non-existent ID
        equipment.id
      );

      expect(result).toBeNull();
    });

    it('should perform optimistic drag reorder', () => {
      const equipment1 = createMockEquipment({ id: 1, rank: 1, name: 'First' });
      const equipment2 = createMockEquipment({ id: 2, rank: 2, name: 'Second' });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);

      const previousItems = equipmentDragDropUtils.optimisticDragReorder(
        queryClient,
        userId,
        0, // Source index
        1  // Destination index
      );

      expect(previousItems).toHaveLength(2);
      expect(previousItems[0].name).toBe('First');
      expect(previousItems[1].name).toBe('Second');

      // Check that reorder actually happened
      const currentItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(currentItems[0].name).toBe('Second');
      expect(currentItems[1].name).toBe('First');
    });

    it('should rollback drag reorder', () => {
      const equipment1 = createMockEquipment({ id: 1, rank: 1, name: 'First' });
      const equipment2 = createMockEquipment({ id: 2, rank: 2, name: 'Second' });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);

      const originalItems = [equipment1, equipment2];

      // Perform some reorder
      equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, 0, 1);

      // Rollback
      equipmentDragDropUtils.rollbackDragReorder(queryClient, userId, originalItems);

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items[0].name).toBe('First');
      expect(items[1].name).toBe('Second');
    });
  });

  describe('equipmentRankUtils (Rank Management)', () => {
    it('should normalize ranks', () => {
      const equipment1 = createMockEquipment({ id: 1, rank: 5 });
      const equipment2 = createMockEquipment({ id: 2, rank: 10 });
      const equipment3 = createMockEquipment({ id: 3, rank: 15 });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);
      equipmentCacheUtils.addItem(queryClient, userId, equipment3);

      equipmentRankUtils.normalizeRanks(queryClient, userId);

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items.map(item => item.rank)).toEqual([1, 2, 3]);
    });

    it('should insert equipment at specific rank', () => {
      const equipment1 = createMockEquipment({ id: 1, rank: 1, name: 'First' });
      const equipment2 = createMockEquipment({ id: 2, rank: 2, name: 'Second' });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);

      const newEquipment = createMockEquipment({ id: 3, name: 'Inserted' });

      equipmentRankUtils.insertAtRank(queryClient, userId, newEquipment, 2);

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items.map(item => item.name)).toEqual(['First', 'Inserted', 'Second']);
      expect(items.map(item => item.rank)).toEqual([1, 2, 3]);
    });

    it('should remove equipment and adjust ranks', () => {
      const equipment1 = createMockEquipment({ id: 1, rank: 1, name: 'First' });
      const equipment2 = createMockEquipment({ id: 2, rank: 2, name: 'Second' });
      const equipment3 = createMockEquipment({ id: 3, rank: 3, name: 'Third' });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);
      equipmentCacheUtils.addItem(queryClient, userId, equipment3);

      equipmentRankUtils.removeAndAdjustRanks(queryClient, userId, 2); // Remove second item

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items.map(item => item.name)).toEqual(['First', 'Third']);
      expect(items.map(item => item.rank)).toEqual([1, 2]); // Third item rank adjusted from 3 to 2
    });

    it('should handle removing non-existent equipment', () => {
      const equipment = createMockEquipment();
      equipmentCacheUtils.addItem(queryClient, userId, equipment);

      equipmentRankUtils.removeAndAdjustRanks(queryClient, userId, 999); // Non-existent ID

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1); // Original item should still be there
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty cache gracefully', () => {
      expect(equipmentCacheUtils.getCurrentItems(queryClient, userId)).toEqual([]);
      expect(equipmentExpenseCacheUtils.getNextRank(queryClient, userId)).toBe(1);
      expect(equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId)).toEqual([]);
    });

    it('should handle invalid drag and drop indices', () => {
      const equipment = createMockEquipment();
      equipmentCacheUtils.addItem(queryClient, userId, equipment);

      // Same index
      equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, 0, 0);

      // Out of bounds
      equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, 0, 5);
      equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, -1, 0);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1); // Should remain unchanged
    });

    it('should handle updating non-existent equipment', () => {
      const nonExistentEquipment = createMockEquipment({ id: 999 });

      expect(() => {
        equipmentCacheUtils.updateItem(queryClient, userId, nonExistentEquipment);
      }).toThrow();
    });

    it('should handle getting non-existent equipment', () => {
      const result = equipmentExpenseCacheUtils.getEquipment(queryClient, userId, 999);
      expect(result).toBeUndefined();
    });

    it('should handle removing non-existent equipment', () => {
      const result = equipmentExpenseCacheUtils.removeOptimisticEquipment(
        queryClient,
        userId,
        999
      );
      expect(result).toBeUndefined();
    });
  });
});