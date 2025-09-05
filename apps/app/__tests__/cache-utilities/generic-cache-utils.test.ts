/**
 * Comprehensive unit tests for generic cache utilities
 * Tests all CRUD operations, error handling, and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  createGenericCacheUtils,
  createSingleObjectCacheUtils,
  type CacheUtilsConfig,
  type BaseCacheItem,
  type RankableItem,
} from '../../utils/query-cache-utils';

// Test interfaces
interface TestItem extends RankableItem {
  name: string;
  value: number;
}

interface TestSingleItem extends BaseCacheItem {
  name: string;
  value: number;
}

describe('Generic Cache Utils', () => {
  let queryClient: QueryClient;
  let config: CacheUtilsConfig<TestItem>;
  let singleConfig: CacheUtilsConfig<TestSingleItem>;
  let cacheUtils: ReturnType<typeof createGenericCacheUtils<TestItem>>;
  let singleCacheUtils: ReturnType<typeof createSingleObjectCacheUtils<TestSingleItem>>;

  const userId = 'test-user-123';
  const testQueryKey = ['test-items', userId];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    config = {
      queryKeyFactory: (userId: string) => ['test-items', userId],
      sortComparator: (a: TestItem, b: TestItem) => (a.rank ?? 0) - (b.rank ?? 0),
      validateItem: (item: TestItem) => {
        const errors: string[] = [];
        if (!item.name) errors.push('Name is required');
        if (item.value < 0) errors.push('Value must be positive');
        return errors;
      },
      createOptimisticItem: (data: Partial<TestItem>, userId: string) => ({
        id: -Date.now(),
        userId,
        name: data.name || 'Test Item',
        value: data.value || 0,
        rank: data.rank || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      itemName: 'test-item',
    };

    singleConfig = {
      queryKeyFactory: (userId: string) => ['test-single', userId],
      sortComparator: () => 0, // Not used for single objects
      validateItem: (item: TestSingleItem) => {
        const errors: string[] = [];
        if (!item.name) errors.push('Name is required');
        if (item.value < 0) errors.push('Value must be positive');
        return errors;
      },
      createOptimisticItem: (data: Partial<TestSingleItem>, userId: string) => ({
        id: -Date.now(),
        userId,
        name: data.name || 'Test Single Item',
        value: data.value || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      itemName: 'test-single-item',
    };

    cacheUtils = createGenericCacheUtils(config);
    singleCacheUtils = createSingleObjectCacheUtils(singleConfig);
  });

  describe('Array-based Cache Utils', () => {
    describe('addItem', () => {
      it('should add new item to empty cache', () => {
        const newItem: TestItem = {
          id: 1,
          userId,
          name: 'Test Item 1',
          value: 100,
          rank: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        cacheUtils.addItem(queryClient, userId, newItem);

        const items = cacheUtils.getCurrentItems(queryClient, userId);
        expect(items).toHaveLength(1);
        expect(items[0]).toEqual(newItem);
      });

      it('should add item to existing cache and maintain sort order', () => {
        const existingItems: TestItem[] = [
          {
            id: 1,
            userId,
            name: 'Item 1',
            value: 100,
            rank: 2,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ];

        queryClient.setQueryData(testQueryKey, existingItems);

        const newItem: TestItem = {
          id: 2,
          userId,
          name: 'Item 2',
          value: 200,
          rank: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        cacheUtils.addItem(queryClient, userId, newItem);

        const items = cacheUtils.getCurrentItems(queryClient, userId);
        expect(items).toHaveLength(2);
        expect(items[0].rank).toBe(1);
        expect(items[1].rank).toBe(2);
      });

      it('should replace existing item with same ID', () => {
        const existingItem: TestItem = {
          id: 1,
          userId,
          name: 'Original Item',
          value: 100,
          rank: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        queryClient.setQueryData(testQueryKey, [existingItem]);

        const updatedItem: TestItem = {
          ...existingItem,
          name: 'Updated Item',
          value: 200,
        };

        cacheUtils.addItem(queryClient, userId, updatedItem);

        const items = cacheUtils.getCurrentItems(queryClient, userId);
        expect(items).toHaveLength(1);
        expect(items[0].name).toBe('Updated Item');
        expect(items[0].value).toBe(200);
      });
    });

    describe('updateItem', () => {
      it('should update existing item', () => {
        const existingItem: TestItem = {
          id: 1,
          userId,
          name: 'Original Item',
          value: 100,
          rank: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        queryClient.setQueryData(testQueryKey, [existingItem]);

        const updatedItem: TestItem = {
          ...existingItem,
          name: 'Updated Item',
          value: 200,
        };

        cacheUtils.updateItem(queryClient, userId, updatedItem);

        const items = cacheUtils.getCurrentItems(queryClient, userId);
        expect(items[0].name).toBe('Updated Item');
        expect(items[0].value).toBe(200);
      });

      it('should throw error when updating non-existent item', () => {
        const nonExistentItem: TestItem = {
          id: 999,
          userId,
          name: 'Non-existent Item',
          value: 100,
          rank: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        expect(() => {
          cacheUtils.updateItem(queryClient, userId, nonExistentItem);
        }).toThrow();
      });
    });

    describe('removeItem', () => {
      it('should remove item from cache', () => {
        const items: TestItem[] = [
          {
            id: 1,
            userId,
            name: 'Item 1',
            value: 100,
            rank: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            userId,
            name: 'Item 2',
            value: 200,
            rank: 2,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ];

        queryClient.setQueryData(testQueryKey, items);

        cacheUtils.removeItem(queryClient, userId, 1);

        const remainingItems = cacheUtils.getCurrentItems(queryClient, userId);
        expect(remainingItems).toHaveLength(1);
        expect(remainingItems[0].id).toBe(2);
      });

      it('should handle removing non-existent item gracefully', () => {
        const items: TestItem[] = [
          {
            id: 1,
            userId,
            name: 'Item 1',
            value: 100,
            rank: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ];

        queryClient.setQueryData(testQueryKey, items);

        cacheUtils.removeItem(queryClient, userId, 999);

        const remainingItems = cacheUtils.getCurrentItems(queryClient, userId);
        expect(remainingItems).toHaveLength(1);
      });
    });

    describe('removeMultipleItems', () => {
      it('should remove multiple items from cache', () => {
        const items: TestItem[] = [
          {
            id: 1,
            userId,
            name: 'Item 1',
            value: 100,
            rank: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            userId,
            name: 'Item 2',
            value: 200,
            rank: 2,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 3,
            userId,
            name: 'Item 3',
            value: 300,
            rank: 3,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ];

        queryClient.setQueryData(testQueryKey, items);

        cacheUtils.removeMultipleItems(queryClient, userId, [1, 3]);

        const remainingItems = cacheUtils.getCurrentItems(queryClient, userId);
        expect(remainingItems).toHaveLength(1);
        expect(remainingItems[0].id).toBe(2);
      });
    });

    describe('reorderItems', () => {
      it('should reorder items in cache', () => {
        const items: TestItem[] = [
          {
            id: 1,
            userId,
            name: 'Item 1',
            value: 100,
            rank: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            userId,
            name: 'Item 2',
            value: 200,
            rank: 2,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ];

        queryClient.setQueryData(testQueryKey, items);

        // Update ranks to reflect new order
        const reorderedItems = [
          { ...items[1], rank: 1 }, // Item 2 becomes rank 1
          { ...items[0], rank: 2 }, // Item 1 becomes rank 2
        ];
        cacheUtils.reorderItems(queryClient, userId, reorderedItems);

        const currentItems = cacheUtils.getCurrentItems(queryClient, userId);
        expect(currentItems[0].id).toBe(2); // Item with rank 1
        expect(currentItems[1].id).toBe(1); // Item with rank 2
      });
    });

    describe('utility methods', () => {
      beforeEach(() => {
        const items: TestItem[] = [
          {
            id: 1,
            userId,
            name: 'Item 1',
            value: 100,
            rank: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            userId,
            name: 'Item 2',
            value: 200,
            rank: 2,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ];

        queryClient.setQueryData(testQueryKey, items);
      });

      it('should check if item exists', () => {
        expect(cacheUtils.itemExists(queryClient, userId, 1)).toBe(true);
        expect(cacheUtils.itemExists(queryClient, userId, 999)).toBe(false);
      });

      it('should get specific item', () => {
        const item = cacheUtils.getItem(queryClient, userId, 1);
        expect(item).toBeDefined();
        expect(item?.name).toBe('Item 1');

        const nonExistentItem = cacheUtils.getItem(queryClient, userId, 999);
        expect(nonExistentItem).toBeUndefined();
      });

      it('should replace temporary item with real item', () => {
        const tempItem: TestItem = {
          id: -123,
          userId,
          name: 'Temp Item',
          value: 50,
          rank: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        cacheUtils.addItem(queryClient, userId, tempItem);

        const realItem: TestItem = {
          id: 3,
          userId,
          name: 'Real Item',
          value: 50,
          rank: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        cacheUtils.replaceTempItem(queryClient, userId, -123, realItem);

        const items = cacheUtils.getCurrentItems(queryClient, userId);
        expect(items.find(item => item.id === -123)).toBeUndefined();
        expect(items.find(item => item.id === 3)).toBeDefined();
      });
    });
  });

  describe('Single Object Cache Utils', () => {
    const singleQueryKey = ['test-single', userId];

    describe('updateObject', () => {
      it('should update single object in cache', () => {
        const item: TestSingleItem = {
          id: 1,
          userId,
          name: 'Single Item',
          value: 100,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        singleCacheUtils.updateObject(queryClient, userId, item);

        const currentItem = singleCacheUtils.getCurrentObject(queryClient, userId);
        expect(currentItem).toEqual(item);
      });

      it('should replace existing object', () => {
        const originalItem: TestSingleItem = {
          id: 1,
          userId,
          name: 'Original Item',
          value: 100,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        queryClient.setQueryData(singleQueryKey, originalItem);

        const updatedItem: TestSingleItem = {
          id: 2,
          userId,
          name: 'Updated Item',
          value: 200,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        singleCacheUtils.updateObject(queryClient, userId, updatedItem);

        const currentItem = singleCacheUtils.getCurrentObject(queryClient, userId);
        expect(currentItem).toEqual(updatedItem);
      });
    });

    describe('getCurrentObject', () => {
      it('should return null when no object exists', () => {
        const currentItem = singleCacheUtils.getCurrentObject(queryClient, userId);
        expect(currentItem).toBeNull();
      });

      it('should return existing object', () => {
        const item: TestSingleItem = {
          id: 1,
          userId,
          name: 'Single Item',
          value: 100,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        queryClient.setQueryData(singleQueryKey, item);

        const currentItem = singleCacheUtils.getCurrentObject(queryClient, userId);
        expect(currentItem).toEqual(item);
      });
    });

    describe('objectExists', () => {
      it('should return false when no object exists', () => {
        expect(singleCacheUtils.objectExists(queryClient, userId)).toBe(false);
      });

      it('should return true when object exists', () => {
        const item: TestSingleItem = {
          id: 1,
          userId,
          name: 'Single Item',
          value: 100,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        queryClient.setQueryData(singleQueryKey, item);

        expect(singleCacheUtils.objectExists(queryClient, userId)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle cache operation errors gracefully', () => {
      // Mock queryClient.setQueryData to throw an error
      const originalSetQueryData = queryClient.setQueryData;
      queryClient.setQueryData = vi.fn().mockImplementation(() => {
        throw new Error('Cache operation failed');
      });

      const newItem: TestItem = {
        id: 1,
        userId,
        name: 'Test Item',
        value: 100,
        rank: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(() => {
        cacheUtils.addItem(queryClient, userId, newItem);
      }).toThrow('Cache add failed');

      // Restore original method
      queryClient.setQueryData = originalSetQueryData;
    });

    it('should validate items and log warnings for invalid data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const invalidItem: TestItem = {
        id: 1,
        userId,
        name: '', // Invalid: empty name
        value: -100, // Invalid: negative value
        rank: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      cacheUtils.addItem(queryClient, userId, invalidItem);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validation errors'),
        expect.arrayContaining(['Name is required', 'Value must be positive'])
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cache gracefully', () => {
      const items = cacheUtils.getCurrentItems(queryClient, userId);
      expect(items).toEqual([]);

      const item = cacheUtils.getItem(queryClient, userId, 1);
      expect(item).toBeUndefined();

      expect(cacheUtils.itemExists(queryClient, userId, 1)).toBe(false);
    });

    it('should handle undefined ranks in sorting', () => {
      const items: TestItem[] = [
        {
          id: 2,
          userId,
          name: 'Item 2',
          value: 200,
          rank: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 1,
          userId,
          name: 'Item 1',
          value: 100,
          rank: undefined,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 3,
          userId,
          name: 'Item 3',
          value: 300,
          rank: undefined,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      queryClient.setQueryData(testQueryKey, items);

      const sortedItems = cacheUtils.getCurrentItems(queryClient, userId);
      // Items with undefined ranks are treated as 0, so they come first
      // The sort is stable, so original order is preserved for equal ranks
      expect(sortedItems[0].rank).toBe(1);
      expect(sortedItems[1].rank).toBeUndefined();
      expect(sortedItems[2].rank).toBeUndefined();
      expect(sortedItems[0].id).toBe(2);
      expect(sortedItems[1].id).toBe(1);
      expect(sortedItems[2].id).toBe(3);
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset: TestItem[] = Array.from({ length: 1000 }, (_, index) => ({
        id: index + 1,
        userId,
        name: `Item ${index + 1}`,
        value: (index + 1) * 10,
        rank: index + 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }));

      queryClient.setQueryData(testQueryKey, largeDataset);

      const startTime = performance.now();
      const items = cacheUtils.getCurrentItems(queryClient, userId);
      const endTime = performance.now();

      expect(items).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});