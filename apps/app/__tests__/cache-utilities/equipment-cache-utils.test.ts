/**
 * Comprehensive unit tests for equipment cache utilities
 * Tests array-based cache management, drag-and-drop operations, and rank management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { reactQueryKeys } from '@repo/database/cache-keys/react-query-keys';
import {
  equipmentCacheUtils,
  equipmentExpenseCacheUtils,
  equipmentDragDropUtils,
  equipmentRankUtils,
} from '../../utils/equipment-cache-utils';
import type { EquipmentExpenseItem } from '../../app/types';

describe('Equipment Cache Utils', () => {
  let queryClient: QueryClient;
  const userId = 'test-user-123';
  const queryKey = reactQueryKeys.equipmentExpenses.byUserId(userId);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
  });

  const createTestEquipment = (overrides: Partial<EquipmentExpenseItem> = {}): EquipmentExpenseItem => ({
    id: 1,
    userId,
    name: 'Test Equipment',
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

  describe('Basic Cache Operations', () => {
    it('should add equipment to empty cache', () => {
      const equipment = createTestEquipment();

      equipmentCacheUtils.addItem(queryClient, userId, equipment);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(equipment);
    });

    it('should add equipment and maintain sort order by rank', () => {
      const equipment1 = createTestEquipment({ id: 1, rank: 2, name: 'Equipment 1' });
      const equipment2 = createTestEquipment({ id: 2, rank: 1, name: 'Equipment 2' });

      equipmentCacheUtils.addItem(queryClient, userId, equipment1);
      equipmentCacheUtils.addItem(queryClient, userId, equipment2);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(2);
      expect(items[0].rank).toBe(1);
      expect(items[1].rank).toBe(2);
      expect(items[0].name).toBe('Equipment 2');
      expect(items[1].name).toBe('Equipment 1');
    });

    it('should update existing equipment', () => {
      const originalEquipment = createTestEquipment();
      queryClient.setQueryData(queryKey, [originalEquipment]);

      const updatedEquipment = { ...originalEquipment, name: 'Updated Equipment', amount: 3000 };
      equipmentCacheUtils.updateItem(queryClient, userId, updatedEquipment);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items[0].name).toBe('Updated Equipment');
      expect(items[0].amount).toBe(3000);
    });

    it('should remove equipment from cache', () => {
      const equipment1 = createTestEquipment({ id: 1 });
      const equipment2 = createTestEquipment({ id: 2 });
      queryClient.setQueryData(queryKey, [equipment1, equipment2]);

      equipmentCacheUtils.removeItem(queryClient, userId, 1);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(2);
    });

    it('should remove multiple equipment items', () => {
      const equipment1 = createTestEquipment({ id: 1 });
      const equipment2 = createTestEquipment({ id: 2 });
      const equipment3 = createTestEquipment({ id: 3 });
      queryClient.setQueryData(queryKey, [equipment1, equipment2, equipment3]);

      equipmentCacheUtils.removeMultipleItems(queryClient, userId, [1, 3]);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(2);
    });
  });

  describe('Equipment-Specific Cache Operations', () => {
    it('should get sorted equipment by rank', () => {
      const equipment1 = createTestEquipment({ id: 1, rank: 3, name: 'Equipment 1' });
      const equipment2 = createTestEquipment({ id: 2, rank: 1, name: 'Equipment 2' });
      const equipment3 = createTestEquipment({ id: 3, rank: 2, name: 'Equipment 3' });

      queryClient.setQueryData(queryKey, [equipment1, equipment2, equipment3]);

      const sortedItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(sortedItems).toHaveLength(3);
      expect(sortedItems[0].rank).toBe(1);
      expect(sortedItems[1].rank).toBe(2);
      expect(sortedItems[2].rank).toBe(3);
    });

    it('should get next available rank', () => {
      const equipment1 = createTestEquipment({ id: 1, rank: 1 });
      const equipment2 = createTestEquipment({ id: 2, rank: 3 });
      queryClient.setQueryData(queryKey, [equipment1, equipment2]);

      const nextRank = equipmentExpenseCacheUtils.getNextRank(queryClient, userId);
      expect(nextRank).toBe(4);
    });

    it('should get next rank for empty cache', () => {
      const nextRank = equipmentExpenseCacheUtils.getNextRank(queryClient, userId);
      expect(nextRank).toBe(1);
    });

    it('should validate equipment data', () => {
      const validEquipment = createTestEquipment();
      const errors = equipmentExpenseCacheUtils.validateEquipment(validEquipment);
      expect(errors).toEqual([]);

      const invalidEquipment = createTestEquipment({
        name: '',
        amount: -100,
        usage: 150,
        lifeSpan: 0,
      });
      const validationErrors = equipmentExpenseCacheUtils.validateEquipment(invalidEquipment);
      expect(validationErrors).toContain('Missing name');
      expect(validationErrors).toContain('Amount cannot be negative');
      expect(validationErrors).toContain('Usage must be between 0 and 100');
      expect(validationErrors).toContain('Life span must be positive');
    });

    it('should check if equipment exists', () => {
      const equipment = createTestEquipment({ id: 1 });
      queryClient.setQueryData(queryKey, [equipment]);

      expect(equipmentExpenseCacheUtils.equipmentExists(queryClient, userId, 1)).toBe(true);
      expect(equipmentExpenseCacheUtils.equipmentExists(queryClient, userId, 999)).toBe(false);
    });

    it('should get specific equipment item', () => {
      const equipment1 = createTestEquipment({ id: 1, name: 'Equipment 1' });
      const equipment2 = createTestEquipment({ id: 2, name: 'Equipment 2' });
      queryClient.setQueryData(queryKey, [equipment1, equipment2]);

      const foundEquipment = equipmentExpenseCacheUtils.getEquipment(queryClient, userId, 1);
      expect(foundEquipment).toEqual(equipment1);

      const notFoundEquipment = equipmentExpenseCacheUtils.getEquipment(queryClient, userId, 999);
      expect(notFoundEquipment).toBeUndefined();
    });
  });

  describe('Optimistic Updates', () => {
    it('should add optimistic equipment with temporary ID', () => {
      const equipmentData = {
        userId,
        name: 'New Equipment',
        category: 'software' as const,
        amount: 500,
        purchaseDate: new Date(),
        usage: 100,
        lifeSpan: 12,
        rank: 1,
      };

      const optimisticItem = equipmentExpenseCacheUtils.addOptimisticEquipment(
        queryClient,
        userId,
        equipmentData
      );

      expect(optimisticItem.id).toBeLessThan(0); // Temporary ID should be negative
      expect(optimisticItem.name).toBe('New Equipment');

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBeLessThan(0);
    });

    it('should replace optimistic equipment with real data', () => {
      const optimisticData = {
        userId,
        name: 'Optimistic Equipment',
        category: 'computer' as const,
        amount: 1000,
        purchaseDate: new Date(),
        usage: 80,
        lifeSpan: 24,
        rank: 1,
      };

      const optimisticItem = equipmentExpenseCacheUtils.addOptimisticEquipment(
        queryClient,
        userId,
        optimisticData
      );

      const realEquipment = createTestEquipment({
        id: 123,
        name: 'Real Equipment',
        amount: 1000,
      });

      equipmentExpenseCacheUtils.replaceOptimisticEquipment(
        queryClient,
        userId,
        optimisticItem.id,
        realEquipment
      );

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(123);
      expect(items[0].name).toBe('Real Equipment');
    });

    it('should remove optimistic equipment and return previous data', () => {
      const equipment = createTestEquipment({ id: 1 });
      queryClient.setQueryData(queryKey, [equipment]);

      const removedItem = equipmentExpenseCacheUtils.removeOptimisticEquipment(
        queryClient,
        userId,
        1
      );

      expect(removedItem).toEqual(equipment);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(0);
    });

    it('should batch update multiple equipment items', () => {
      const equipment1 = createTestEquipment({ id: 1, name: 'Equipment 1' });
      const equipment2 = createTestEquipment({ id: 2, name: 'Equipment 2' });
      queryClient.setQueryData(queryKey, [equipment1, equipment2]);

      const updates = [
        { ...equipment1, name: 'Updated Equipment 1', amount: 3000 },
        { ...equipment2, name: 'Updated Equipment 2', amount: 4000 },
      ];

      equipmentExpenseCacheUtils.batchUpdateEquipment(queryClient, userId, updates);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items[0].name).toBe('Updated Equipment 1');
      expect(items[0].amount).toBe(3000);
      expect(items[1].name).toBe('Updated Equipment 2');
      expect(items[1].amount).toBe(4000);
    });
  });

  describe('Drag and Drop Operations', () => {
    beforeEach(() => {
      const equipment1 = createTestEquipment({ id: 1, rank: 1, name: 'Equipment 1' });
      const equipment2 = createTestEquipment({ id: 2, rank: 2, name: 'Equipment 2' });
      const equipment3 = createTestEquipment({ id: 3, rank: 3, name: 'Equipment 3' });
      queryClient.setQueryData(queryKey, [equipment1, equipment2, equipment3]);
    });

    it('should reorder equipment by drag and drop indices', () => {
      // Move item from index 0 to index 2 (Equipment 1 to position 3)
      equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, 0, 2);

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items[0].name).toBe('Equipment 2');
      expect(items[0].rank).toBe(1);
      expect(items[1].name).toBe('Equipment 3');
      expect(items[1].rank).toBe(2);
      expect(items[2].name).toBe('Equipment 1');
      expect(items[2].rank).toBe(3);
    });

    it('should handle invalid drag and drop indices', () => {
      const originalItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);

      // Test same source and destination
      equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, 1, 1);
      let items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items).toEqual(originalItems);

      // Test out of bounds indices
      equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, -1, 1);
      items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items).toEqual(originalItems);

      equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, 0, 10);
      items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items).toEqual(originalItems);
    });

    it('should update ranks for multiple items', () => {
      const rankUpdates = [
        { id: 1, rank: 3 },
        { id: 2, rank: 1 },
        { id: 3, rank: 2 },
      ];

      equipmentExpenseCacheUtils.updateRanks(queryClient, userId, rankUpdates);

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items[0].id).toBe(2);
      expect(items[0].rank).toBe(1);
      expect(items[1].id).toBe(3);
      expect(items[1].rank).toBe(2);
      expect(items[2].id).toBe(1);
      expect(items[2].rank).toBe(3);
    });

    it('should handle drag start event', () => {
      const draggedItem = equipmentDragDropUtils.handleDragStart(queryClient, userId, 1);
      expect(draggedItem).toBeDefined();
      expect(draggedItem?.id).toBe(1);
      expect(draggedItem?.name).toBe('Equipment 1');

      const nonExistentItem = equipmentDragDropUtils.handleDragStart(queryClient, userId, 999);
      expect(nonExistentItem).toBeUndefined();
    });

    it('should handle drag end event', () => {
      const result = equipmentDragDropUtils.handleDragEnd(queryClient, userId, 1, 3);
      expect(result).toBeDefined();
      expect(result).toHaveLength(3);

      // Equipment 1 should now be at the end
      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items[2].id).toBe(1);
    });

    it('should handle drag end with invalid IDs', () => {
      const result = equipmentDragDropUtils.handleDragEnd(queryClient, userId, 999, 1);
      expect(result).toBeNull();

      const result2 = equipmentDragDropUtils.handleDragEnd(queryClient, userId, 1, 999);
      expect(result2).toBeNull();
    });

    it('should perform optimistic drag reorder', () => {
      const previousItems = equipmentDragDropUtils.optimisticDragReorder(
        queryClient,
        userId,
        0,
        2
      );

      expect(previousItems).toHaveLength(3);
      expect(previousItems[0].rank).toBe(1);

      // Check that reorder happened
      const currentItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(currentItems[2].id).toBe(1); // First item moved to last position
    });

    it('should rollback drag reorder', () => {
      const originalItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);

      // Perform reorder
      equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, 0, 2);

      // Rollback
      equipmentDragDropUtils.rollbackDragReorder(queryClient, userId, originalItems);

      const restoredItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(restoredItems).toEqual(originalItems);
    });
  });

  describe('Rank Management', () => {
    it('should normalize ranks to sequential order', () => {
      const equipment1 = createTestEquipment({ id: 1, rank: 5 });
      const equipment2 = createTestEquipment({ id: 2, rank: 10 });
      const equipment3 = createTestEquipment({ id: 3, rank: 2 });
      queryClient.setQueryData(queryKey, [equipment1, equipment2, equipment3]);

      equipmentRankUtils.normalizeRanks(queryClient, userId);

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items[0].rank).toBe(1);
      expect(items[1].rank).toBe(2);
      expect(items[2].rank).toBe(3);
      expect(items[0].id).toBe(3); // Originally rank 2
      expect(items[1].id).toBe(1); // Originally rank 5
      expect(items[2].id).toBe(2); // Originally rank 10
    });

    it('should insert equipment at specific rank', () => {
      const equipment1 = createTestEquipment({ id: 1, rank: 1 });
      const equipment2 = createTestEquipment({ id: 2, rank: 2 });
      const equipment3 = createTestEquipment({ id: 3, rank: 3 });
      queryClient.setQueryData(queryKey, [equipment1, equipment2, equipment3]);

      const newEquipment = createTestEquipment({ id: 4, name: 'New Equipment' });
      equipmentRankUtils.insertAtRank(queryClient, userId, newEquipment, 2);

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items).toHaveLength(4);
      expect(items[0].rank).toBe(1);
      expect(items[1].rank).toBe(2);
      expect(items[1].id).toBe(4); // New equipment at rank 2
      expect(items[2].rank).toBe(3);
      expect(items[2].id).toBe(2); // Original rank 2 equipment moved to rank 3
      expect(items[3].rank).toBe(4);
      expect(items[3].id).toBe(3); // Original rank 3 equipment moved to rank 4
    });

    it('should remove equipment and adjust ranks', () => {
      const equipment1 = createTestEquipment({ id: 1, rank: 1 });
      const equipment2 = createTestEquipment({ id: 2, rank: 2 });
      const equipment3 = createTestEquipment({ id: 3, rank: 3 });
      const equipment4 = createTestEquipment({ id: 4, rank: 4 });
      queryClient.setQueryData(queryKey, [equipment1, equipment2, equipment3, equipment4]);

      equipmentRankUtils.removeAndAdjustRanks(queryClient, userId, 2);

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items).toHaveLength(3);
      expect(items[0].rank).toBe(1);
      expect(items[0].id).toBe(1);
      expect(items[1].rank).toBe(2);
      expect(items[1].id).toBe(3); // Originally rank 3, now rank 2
      expect(items[2].rank).toBe(3);
      expect(items[2].id).toBe(4); // Originally rank 4, now rank 3
    });

    it('should handle removing non-existent equipment', () => {
      const equipment1 = createTestEquipment({ id: 1, rank: 1 });
      const equipment2 = createTestEquipment({ id: 2, rank: 2 });
      queryClient.setQueryData(queryKey, [equipment1, equipment2]);

      equipmentRankUtils.removeAndAdjustRanks(queryClient, userId, 999);

      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(items).toHaveLength(2);
      expect(items[0].rank).toBe(1);
      expect(items[1].rank).toBe(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty cache gracefully', () => {
      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toEqual([]);

      const sortedItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      expect(sortedItems).toEqual([]);

      const nextRank = equipmentExpenseCacheUtils.getNextRank(queryClient, userId);
      expect(nextRank).toBe(1);
    });

    it('should handle undefined ranks in sorting', () => {
      const equipment1 = createTestEquipment({ id: 1, rank: undefined });
      const equipment2 = createTestEquipment({ id: 2, rank: 1 });
      const equipment3 = createTestEquipment({ id: 3, rank: undefined });

      queryClient.setQueryData(queryKey, [equipment1, equipment2, equipment3]);

      const sortedItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      // Items with undefined ranks are treated as 0, so they come first
      // The sort is stable, so original order is preserved for equal ranks
      expect(sortedItems[0].rank).toBeUndefined();
      expect(sortedItems[0].id).toBe(1);
      expect(sortedItems[1].rank).toBeUndefined();
      expect(sortedItems[1].id).toBe(3);
      expect(sortedItems[2].rank).toBe(1);
      expect(sortedItems[2].id).toBe(2);
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset: EquipmentExpenseItem[] = Array.from({ length: 1000 }, (_, index) =>
        createTestEquipment({
          id: index + 1,
          name: `Equipment ${index + 1}`,
          rank: index + 1,
        })
      );

      queryClient.setQueryData(queryKey, largeDataset);

      const startTime = performance.now();
      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      const endTime = performance.now();

      expect(items).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle concurrent operations', () => {
      const equipment1 = createTestEquipment({ id: 1, rank: 1 });
      const equipment2 = createTestEquipment({ id: 2, rank: 2 });
      queryClient.setQueryData(queryKey, [equipment1, equipment2]);

      // Simulate concurrent add and remove operations
      const newEquipment = createTestEquipment({ id: 3, rank: 3 });
      equipmentCacheUtils.addItem(queryClient, userId, newEquipment);
      equipmentCacheUtils.removeItem(queryClient, userId, 1);

      const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toHaveLength(2);
      expect(items.find(item => item.id === 1)).toBeUndefined();
      expect(items.find(item => item.id === 3)).toBeDefined();
    });
  });
});