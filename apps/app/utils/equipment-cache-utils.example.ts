/**
 * Equipment Cache Utils Usage Examples
 *
 * This file demonstrates how to use the equipment cache utilities
 * for optimized React Query cache management with drag-and-drop support.
 */

import { useQueryClient, useMutation } from '@tanstack/react-query';
import type { EquipmentExpenseItem } from '../app/types';
import {
  equipmentCacheUtils,
  equipmentExpenseCacheUtils,
  equipmentDragDropUtils,
  equipmentRankUtils,
} from './equipment-cache-utils';

// Example 1: Basic Equipment Management Hook
export function useEquipmentManager(userId: string) {
  const queryClient = useQueryClient();

  const addEquipment = (equipmentData: Omit<EquipmentExpenseItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Validate equipment data first
    const tempEquipment = {
      ...equipmentData,
      id: -1, // Temporary ID for validation
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as EquipmentExpenseItem;

    const errors = equipmentExpenseCacheUtils.validateEquipment(tempEquipment);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Get next available rank
    const rank = equipmentExpenseCacheUtils.getNextRank(queryClient, userId);
    const equipmentWithRank = { ...equipmentData, rank };

    // Add optimistic equipment for immediate UI update
    const optimisticItem = equipmentExpenseCacheUtils.addOptimisticEquipment(
      queryClient,
      userId,
      equipmentWithRank
    );

    return optimisticItem;
  };

  const updateEquipment = (updatedEquipment: EquipmentExpenseItem) => {
    // Validate before updating
    const errors = equipmentExpenseCacheUtils.validateEquipment(updatedEquipment);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Check if equipment exists
    if (!equipmentExpenseCacheUtils.equipmentExists(queryClient, userId, updatedEquipment.id)) {
      throw new Error('Equipment not found in cache');
    }

    // Update cache immediately
    equipmentCacheUtils.updateItem(queryClient, userId, updatedEquipment);
  };

  const deleteEquipment = (equipmentId: number) => {
    // Remove from cache with rank adjustment
    equipmentRankUtils.removeAndAdjustRanks(queryClient, userId, equipmentId);
  };

  const reorderEquipment = (sourceIndex: number, destinationIndex: number) => {
    // Perform drag-and-drop reorder
    equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, sourceIndex, destinationIndex);
  };

  const getCurrentEquipment = () => {
    return equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
  };

  return {
    addEquipment,
    updateEquipment,
    deleteEquipment,
    reorderEquipment,
    getCurrentEquipment,
  };
}

// Example 2: Optimized Create Equipment Mutation
export function useCreateEquipmentExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      userId: string;
      name: string;
      amount: number;
      category: string;
      purchaseDate: Date;
      usage: number;
      lifeSpan: number;
    }) => {
      // Simulate API call
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        throw new Error('Failed to create equipment');
      }

      return response.json() as EquipmentExpenseItem;
    },

    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['equipment-expenses-list', variables.userId]
      });

      // Get next rank for the new equipment
      const rank = equipmentExpenseCacheUtils.getNextRank(queryClient, variables.userId);

      // Add optimistic equipment
      const optimisticItem = equipmentExpenseCacheUtils.addOptimisticEquipment(
        queryClient,
        variables.userId,
        { ...variables, rank }
      );

      // Return context for rollback
      return { optimisticItem };
    },

    onSuccess: (data, variables, context) => {
      // Replace optimistic item with real server data
      if (context?.optimisticItem) {
        equipmentExpenseCacheUtils.replaceOptimisticEquipment(
          queryClient,
          variables.userId,
          context.optimisticItem.id,
          data
        );
      }
    },

    onError: (error, variables, context) => {
      // Remove optimistic item on error
      if (context?.optimisticItem) {
        equipmentExpenseCacheUtils.removeOptimisticEquipment(
          queryClient,
          variables.userId,
          context.optimisticItem.id
        );
      }
    },

    // Note: No onSettled with invalidateQueries - we use precise cache updates
  });
}

// Example 3: Optimized Update Equipment Mutation
export function useUpdateEquipmentExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      userId: string;
      equipmentId: number;
      updates: Partial<EquipmentExpenseItem>;
    }) => {
      // Simulate API call
      const response = await fetch(`/api/equipment/${variables.equipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables.updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update equipment');
      }

      return response.json() as EquipmentExpenseItem;
    },

    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['equipment-expenses-list', variables.userId]
      });

      // Get current equipment
      const currentEquipment = equipmentExpenseCacheUtils.getEquipment(
        queryClient,
        variables.userId,
        variables.equipmentId
      );

      if (!currentEquipment) {
        throw new Error('Equipment not found');
      }

      // Create updated equipment
      const updatedEquipment = { ...currentEquipment, ...variables.updates };

      // Validate updated equipment
      const errors = equipmentExpenseCacheUtils.validateEquipment(updatedEquipment);
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      // Update cache optimistically
      equipmentCacheUtils.updateItem(queryClient, variables.userId, updatedEquipment);

      // Return context for rollback
      return { previousEquipment: currentEquipment };
    },

    onSuccess: (data, variables) => {
      // Update cache with real server data
      equipmentCacheUtils.updateItem(queryClient, variables.userId, data);
    },

    onError: (error, variables, context) => {
      // Rollback to previous state
      if (context?.previousEquipment) {
        equipmentCacheUtils.updateItem(queryClient, variables.userId, context.previousEquipment);
      }
    },
  });
}

// Example 4: Optimized Delete Equipment Mutation
export function useDeleteEquipmentExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { userId: string; equipmentId: number }) => {
      // Simulate API call
      const response = await fetch(`/api/equipment/${variables.equipmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete equipment');
      }

      return { success: true };
    },

    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['equipment-expenses-list', variables.userId]
      });

      // Get current equipment for rollback
      const removedEquipment = equipmentExpenseCacheUtils.removeOptimisticEquipment(
        queryClient,
        variables.userId,
        variables.equipmentId
      );

      // Return context for rollback
      return { removedEquipment };
    },

    onError: (error, variables, context) => {
      // Restore removed equipment on error
      if (context?.removedEquipment) {
        // Re-insert at original rank
        equipmentRankUtils.insertAtRank(
          queryClient,
          variables.userId,
          context.removedEquipment,
          context.removedEquipment.rank
        );
      }
    },

    // Note: No onSuccess needed - optimistic update already handled the removal
  });
}

// Example 5: Batch Update Equipment Ranks (for drag-and-drop)
export function useUpdateEquipmentRanks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      userId: string;
      rankUpdates: Array<{ id: number; rank: number }>;
    }) => {
      // Simulate API call
      const response = await fetch('/api/equipment/ranks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables.rankUpdates),
      });

      if (!response.ok) {
        throw new Error('Failed to update equipment ranks');
      }

      return response.json() as EquipmentExpenseItem[];
    },

    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['equipment-expenses-list', variables.userId]
      });

      // Get current items for rollback
      const previousItems = equipmentExpenseCacheUtils.getSortedEquipment(
        queryClient,
        variables.userId
      );

      // Update ranks optimistically
      equipmentExpenseCacheUtils.updateRanks(queryClient, variables.userId, variables.rankUpdates);

      // Return context for rollback
      return { previousItems };
    },

    onSuccess: (data, variables) => {
      // Update cache with server data (in case of any server-side changes)
      equipmentCacheUtils.replaceAllItems(queryClient, variables.userId, data);
    },

    onError: (error, variables, context) => {
      // Rollback to previous state
      if (context?.previousItems) {
        equipmentCacheUtils.replaceAllItems(queryClient, variables.userId, context.previousItems);
      }
    },
  });
}

// Example 6: Drag-and-Drop Component Integration
export function useDragAndDropEquipment(userId: string) {
  const queryClient = useQueryClient();
  const updateRanksMutation = useUpdateEquipmentRanks();

  const handleDragEnd = (draggedId: number, targetId: number) => {
    // Get current items
    const currentItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);

    const draggedIndex = currentItems.findIndex(item => item.id === draggedId);
    const targetIndex = currentItems.findIndex(item => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      return;
    }

    // Perform optimistic reorder
    const previousItems = equipmentDragDropUtils.optimisticDragReorder(
      queryClient,
      userId,
      draggedIndex,
      targetIndex
    );

    // Get updated items to calculate new ranks
    const updatedItems = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
    const rankUpdates = updatedItems.map((item, index) => ({
      id: item.id,
      rank: index + 1,
    }));

    // Update ranks on server
    updateRanksMutation.mutate(
      { userId, rankUpdates },
      {
        onError: () => {
          // Rollback on error
          equipmentDragDropUtils.rollbackDragReorder(queryClient, userId, previousItems);
        },
      }
    );
  };

  const handleDragStart = (equipmentId: number) => {
    return equipmentDragDropUtils.handleDragStart(queryClient, userId, equipmentId);
  };

  return {
    handleDragEnd,
    handleDragStart,
    isUpdating: updateRanksMutation.isPending,
  };
}

// Example 7: Equipment List Component with Cache Integration
export function useEquipmentList(userId: string) {
  const queryClient = useQueryClient();

  const getEquipmentList = () => {
    return equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
  };

  const getEquipmentById = (equipmentId: number) => {
    return equipmentExpenseCacheUtils.getEquipment(queryClient, userId, equipmentId);
  };

  const validateEquipmentList = () => {
    const items = getEquipmentList();
    const errors: string[] = [];

    items.forEach((item, index) => {
      const itemErrors = equipmentExpenseCacheUtils.validateEquipment(item);
      if (itemErrors.length > 0) {
        errors.push(`Item ${index + 1} (${item.name}): ${itemErrors.join(', ')}`);
      }
    });

    return errors;
  };

  const normalizeRanks = () => {
    equipmentRankUtils.normalizeRanks(queryClient, userId);
  };

  const getNextRank = () => {
    return equipmentExpenseCacheUtils.getNextRank(queryClient, userId);
  };

  return {
    getEquipmentList,
    getEquipmentById,
    validateEquipmentList,
    normalizeRanks,
    getNextRank,
  };
}

// Example 8: Performance Monitoring Integration
export function useEquipmentPerformanceMonitor(userId: string) {
  const queryClient = useQueryClient();

  const getCacheStats = () => {
    const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);

    return {
      totalItems: items.length,
      validItems: items.filter(item =>
        equipmentExpenseCacheUtils.validateEquipment(item).length === 0
      ).length,
      rankGaps: items.some((item, index) => item.rank !== index + 1),
      duplicateRanks: new Set(items.map(item => item.rank)).size !== items.length,
    };
  };

  const performHealthCheck = () => {
    const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
    const issues: string[] = [];

    // Check for validation errors
    items.forEach((item, index) => {
      const errors = equipmentExpenseCacheUtils.validateEquipment(item);
      if (errors.length > 0) {
        issues.push(`Item ${index + 1}: ${errors.join(', ')}`);
      }
    });

    // Check for rank issues
    const ranks = items.map(item => item.rank);
    const uniqueRanks = new Set(ranks);

    if (uniqueRanks.size !== ranks.length) {
      issues.push('Duplicate ranks detected');
    }

    const expectedRanks = Array.from({ length: items.length }, (_, i) => i + 1);
    const hasGaps = !ranks.every((rank, index) => rank === expectedRanks[index]);

    if (hasGaps) {
      issues.push('Rank gaps detected');
    }

    return {
      healthy: issues.length === 0,
      issues,
      stats: getCacheStats(),
    };
  };

  return {
    getCacheStats,
    performHealthCheck,
  };
}

// Example 9: Error Recovery Utilities
export function useEquipmentErrorRecovery(userId: string) {
  const queryClient = useQueryClient();

  const recoverFromCacheCorruption = () => {
    try {
      // Normalize ranks to fix any rank issues
      equipmentRankUtils.normalizeRanks(queryClient, userId);

      // Validate all items
      const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
      const validItems = items.filter(item =>
        equipmentExpenseCacheUtils.validateEquipment(item).length === 0
      );

      // Replace cache with only valid items
      if (validItems.length !== items.length) {
        equipmentCacheUtils.replaceAllItems(queryClient, userId, validItems);
        console.warn(`Removed ${items.length - validItems.length} invalid equipment items`);
      }

      return { success: true, recoveredItems: validItems.length };
    } catch (error) {
      console.error('Failed to recover from cache corruption:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const clearCache = () => {
    equipmentCacheUtils.replaceAllItems(queryClient, userId, []);
  };

  const exportCacheData = () => {
    const items = equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
    return {
      timestamp: new Date().toISOString(),
      userId,
      items,
      stats: {
        totalItems: items.length,
        validItems: items.filter(item =>
          equipmentExpenseCacheUtils.validateEquipment(item).length === 0
        ).length,
      },
    };
  };

  return {
    recoverFromCacheCorruption,
    clearCache,
    exportCacheData,
  };
}

// Example usage in a React component:
/*
function EquipmentManagementComponent({ userId }: { userId: string }) {
  const equipmentManager = useEquipmentManager(userId);
  const createMutation = useCreateEquipmentExpense();
  const updateMutation = useUpdateEquipmentExpense();
  const deleteMutation = useDeleteEquipmentExpense();
  const dragAndDrop = useDragAndDropEquipment(userId);
  const performanceMonitor = useEquipmentPerformanceMonitor(userId);

  const handleAddEquipment = async (equipmentData: any) => {
    try {
      const optimisticItem = equipmentManager.addEquipment(equipmentData);

      await createMutation.mutateAsync({
        userId,
        ...equipmentData,
      });

      console.log('Equipment added successfully');
    } catch (error) {
      console.error('Failed to add equipment:', error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      dragAndDrop.handleDragEnd(Number(active.id), Number(over.id));
    }
  };

  // Component JSX...
}
*/