import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import type { QueryClient } from "@tanstack/react-query";
import type { EquipmentExpenseItem } from "../app/types";
import {
  createGenericCacheUtils,
  type CacheUtilsConfig,
  type GenericCacheUtils,
  genericOptimisticUpdateUtils,
} from "./query-cache-utils";

/**
 * Equipment-specific cache utilities for array-based cache management
 * Provides optimized cache operations for equipment expenses with drag-and-drop support
 */

/**
 * Configuration for equipment expense cache utilities
 */
const equipmentExpenseConfig: CacheUtilsConfig<EquipmentExpenseItem> = {
  queryKeyFactory: (userId: string) => reactQueryKeys.equipmentExpenses.byUserId(userId),
  sortComparator: (a: EquipmentExpenseItem, b: EquipmentExpenseItem) => (a.rank ?? 0) - (b.rank ?? 0),
  validateItem: (item: EquipmentExpenseItem): string[] => {
    const errors: string[] = [];
    if (!item.name) errors.push("Missing name");
    if (item.amount < 0) errors.push("Amount cannot be negative");
    if (!item.category) errors.push("Missing category");
    if (item.usage < 0 || item.usage > 100) errors.push("Usage must be between 0 and 100");
    if (item.lifeSpan <= 0) errors.push("Life span must be positive");
    return errors;
  },
  createOptimisticItem: (data: Partial<EquipmentExpenseItem>, userId: string): EquipmentExpenseItem => {
    const now = new Date().toISOString();
    const tempId = genericOptimisticUpdateUtils.createTempId();

    return {
      id: tempId,
      name: data.name || "New Equipment",
      userId,
      rank: data.rank ?? 0,
      amount: data.amount ?? 0,
      purchaseDate: data.purchaseDate || new Date(),
      usage: data.usage ?? 100,
      lifeSpan: data.lifeSpan ?? 12,
      category: data.category || "other",
      createdAt: now,
      updatedAt: now,
    } as EquipmentExpenseItem;
  },
  itemName: "equipment",
};

/**
 * Generic cache utilities instance for equipment expenses
 */
export const equipmentCacheUtils: GenericCacheUtils<EquipmentExpenseItem> =
  createGenericCacheUtils(equipmentExpenseConfig);

/**
 * Equipment-specific cache utilities with drag-and-drop and rank management support
 */
export const equipmentExpenseCacheUtils = {
  ...equipmentCacheUtils,

  /**
   * Drag-and-drop specific cache update for reordering equipment
   * Updates ranks for all affected items efficiently
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param sourceIndex - Original index of dragged item
   * @param destinationIndex - New index of dragged item
   */
  reorderByDragDrop: (
    queryClient: QueryClient,
    userId: string,
    sourceIndex: number,
    destinationIndex: number
  ): void => {
    const currentItems = equipmentCacheUtils.getCurrentItems(queryClient, userId);

    if (sourceIndex === destinationIndex ||
        sourceIndex < 0 || destinationIndex < 0 ||
        sourceIndex >= currentItems.length || destinationIndex >= currentItems.length) {
      return;
    }

    // Create new array with reordered items
    const reorderedItems = [...currentItems];
    const [draggedItem] = reorderedItems.splice(sourceIndex, 1);
    reorderedItems.splice(destinationIndex, 0, draggedItem);

    // Update ranks to match new positions
    const itemsWithUpdatedRanks = reorderedItems.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    equipmentCacheUtils.reorderItems(queryClient, userId, itemsWithUpdatedRanks);
  },

  /**
   * Updates ranks for multiple equipment items (batch rank update)
   * Useful for drag-and-drop operations that affect multiple items
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param rankUpdates - Array of {id, rank} objects
   */
  updateRanks: (
    queryClient: QueryClient,
    userId: string,
    rankUpdates: Array<{ id: number; rank: number }>
  ): void => {
    const currentItems = equipmentCacheUtils.getCurrentItems(queryClient, userId);
    const rankMap = new Map(rankUpdates.map(update => [update.id, update.rank]));

    const updatedItems = currentItems.map(item => {
      const newRank = rankMap.get(item.id);
      return newRank !== undefined ? { ...item, rank: newRank } : item;
    });

    equipmentCacheUtils.updateMultipleItems(queryClient, userId, updatedItems);
  },

  /**
   * Optimistic update for equipment creation with temporary ID
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param equipmentData - Partial equipment data
   * @returns Temporary equipment item for optimistic updates
   */
  addOptimisticEquipment: (
    queryClient: QueryClient,
    userId: string,
    equipmentData: Omit<EquipmentExpenseItem, "id" | "createdAt" | "updatedAt">
  ): EquipmentExpenseItem => {
    const optimisticItem = equipmentExpenseConfig.createOptimisticItem(equipmentData, userId);
    equipmentCacheUtils.addItem(queryClient, userId, optimisticItem);
    return optimisticItem;
  },

  /**
   * Replaces temporary equipment item with real server data
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param tempId - Temporary ID to replace
   * @param realEquipment - Real equipment data from server
   */
  replaceOptimisticEquipment: (
    queryClient: QueryClient,
    userId: string,
    tempId: number,
    realEquipment: EquipmentExpenseItem
  ): void => {
    equipmentCacheUtils.replaceTempItem(queryClient, userId, tempId, realEquipment);
  },

  /**
   * Optimistic update for equipment deletion
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param equipmentId - ID of equipment to remove
   * @returns Previous equipment data for rollback
   */
  removeOptimisticEquipment: (
    queryClient: QueryClient,
    userId: string,
    equipmentId: number
  ): EquipmentExpenseItem | undefined => {
    const removedItem = equipmentCacheUtils.getItem(queryClient, userId, equipmentId);
    equipmentCacheUtils.removeItem(queryClient, userId, equipmentId);
    return removedItem;
  },

  /**
   * Batch update for multiple equipment items (useful for drag-and-drop)
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param updates - Array of equipment updates
   */
  batchUpdateEquipment: (
    queryClient: QueryClient,
    userId: string,
    updates: EquipmentExpenseItem[]
  ): void => {
    equipmentCacheUtils.updateMultipleItems(queryClient, userId, updates);
  },

  /**
   * Gets equipment items sorted by rank (for consistent ordering)
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @returns Equipment items sorted by rank
   */
  getSortedEquipment: (
    queryClient: QueryClient,
    userId: string
  ): EquipmentExpenseItem[] => {
    const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
    return items.sort(equipmentExpenseConfig.sortComparator);
  },

  /**
   * Gets the next available rank for new equipment
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @returns Next available rank number
   */
  getNextRank: (
    queryClient: QueryClient,
    userId: string
  ): number => {
    const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
    const maxRank = Math.max(0, ...items.map(item => item.rank ?? 0));
    return maxRank + 1;
  },

  /**
   * Validates equipment data before cache operations
   * @param equipment - Equipment item to validate
   * @returns Array of validation errors (empty if valid)
   */
  validateEquipment: (equipment: EquipmentExpenseItem): string[] => {
    return equipmentExpenseConfig.validateItem(equipment);
  },

  /**
   * Checks if equipment exists in cache
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param equipmentId - ID of equipment to check
   * @returns True if equipment exists
   */
  equipmentExists: (
    queryClient: QueryClient,
    userId: string,
    equipmentId: number
  ): boolean => {
    return equipmentCacheUtils.itemExists(queryClient, userId, equipmentId);
  },

  /**
   * Gets specific equipment item from cache
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param equipmentId - ID of equipment to get
   * @returns Equipment item if found, undefined otherwise
   */
  getEquipment: (
    queryClient: QueryClient,
    userId: string,
    equipmentId: number
  ): EquipmentExpenseItem | undefined => {
    return equipmentCacheUtils.getItem(queryClient, userId, equipmentId);
  },
};

/**
 * Drag-and-drop specific utilities for equipment reordering
 */
export const equipmentDragDropUtils = {
  /**
   * Handles drag start event - stores the dragged item
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param equipmentId - ID of equipment being dragged
   * @returns Dragged equipment item or undefined if not found
   */
  handleDragStart: (
    queryClient: QueryClient,
    userId: string,
    equipmentId: number
  ): EquipmentExpenseItem | undefined => {
    return equipmentExpenseCacheUtils.getEquipment(queryClient, userId, equipmentId);
  },

  /**
   * Handles drag end event - performs the reorder operation
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param draggedId - ID of dragged equipment
   * @param targetId - ID of target equipment (where it was dropped)
   * @returns Updated equipment list or null if operation failed
   */
  handleDragEnd: (
    queryClient: QueryClient,
    userId: string,
    draggedId: number,
    targetId: number
  ): EquipmentExpenseItem[] | null => {
    const currentItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);

    const draggedIndex = currentItems.findIndex(item => item.id === draggedId);
    const targetIndex = currentItems.findIndex(item => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return null;
    }

    equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, draggedIndex, targetIndex);
    return equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
  },

  /**
   * Optimistic drag operation - immediately updates UI during drag
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param sourceIndex - Original index
   * @param destinationIndex - New index
   * @returns Previous state for potential rollback
   */
  optimisticDragReorder: (
    queryClient: QueryClient,
    userId: string,
    sourceIndex: number,
    destinationIndex: number
  ): EquipmentExpenseItem[] => {
    const previousItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
    equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, sourceIndex, destinationIndex);
    return previousItems;
  },

  /**
   * Rollback drag operation if server update fails
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param previousItems - Previous state to restore
   */
  rollbackDragReorder: (
    queryClient: QueryClient,
    userId: string,
    previousItems: EquipmentExpenseItem[]
  ): void => {
    equipmentCacheUtils.replaceAllItems(queryClient, userId, previousItems);
  },
};

/**
 * Equipment rank management utilities
 */
export const equipmentRankUtils = {
  /**
   * Recalculates ranks for all equipment to ensure sequential ordering
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   */
  normalizeRanks: (
    queryClient: QueryClient,
    userId: string
  ): void => {
    const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
    const normalizedItems = items.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    equipmentCacheUtils.replaceAllItems(queryClient, userId, normalizedItems);
  },

  /**
   * Inserts equipment at specific rank, adjusting other ranks accordingly
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param equipment - Equipment to insert
   * @param targetRank - Desired rank position
   */
  insertAtRank: (
    queryClient: QueryClient,
    userId: string,
    equipment: EquipmentExpenseItem,
    targetRank: number
  ): void => {
    const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);

    // Adjust ranks of existing items
    const adjustedItems = items.map(item =>
      item.rank >= targetRank ? { ...item, rank: item.rank + 1 } : item
    );

    // Add new equipment with target rank
    const newEquipment = { ...equipment, rank: targetRank };
    const updatedItems = [...adjustedItems, newEquipment].sort(equipmentExpenseConfig.sortComparator);

    equipmentCacheUtils.replaceAllItems(queryClient, userId, updatedItems);
  },

  /**
   * Removes equipment and adjusts ranks of remaining items
   * @param queryClient - React Query client instance
   * @param userId - User ID for the cache key
   * @param equipmentId - ID of equipment to remove
   */
  removeAndAdjustRanks: (
    queryClient: QueryClient,
    userId: string,
    equipmentId: number
  ): void => {
    const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
    const removedItem = items.find(item => item.id === equipmentId);

    if (!removedItem) return;

    // Remove item and adjust ranks
    const remainingItems = items
      .filter(item => item.id !== equipmentId)
      .map(item =>
        item.rank > removedItem.rank ? { ...item, rank: item.rank - 1 } : item
      );

    equipmentCacheUtils.replaceAllItems(queryClient, userId, remainingItems);
  },
};