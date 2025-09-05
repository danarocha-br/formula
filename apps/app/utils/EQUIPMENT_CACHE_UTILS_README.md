# Equipment Cache Utils

This module provides optimized cache management utilities for equipment expenses with drag-and-drop support and rank management. It extends the generic cache utilities framework to provide equipment-specific functionality.

## Overview

The equipment cache utilities solve performance issues related to broad cache invalidations by providing precise cache update operations. This is particularly important for equipment expenses which support drag-and-drop reordering and require efficient rank management.

## Key Features

- **Array-based cache management** for equipment expense lists
- **Drag-and-drop specific operations** for reordering equipment
- **Rank management utilities** for maintaining equipment order
- **Optimistic update support** for immediate UI feedback
- **Comprehensive error handling** and validation
- **Performance monitoring** and logging

## Main Utilities

### equipmentCacheUtils

Generic cache operations for equipment expenses:

```typescript
import { equipmentCacheUtils } from "@/utils/equipment-cache-utils";

// Add equipment to cache
equipmentCacheUtils.addItem(queryClient, userId, newEquipment);

// Update equipment in cache
equipmentCacheUtils.updateItem(queryClient, userId, updatedEquipment);

// Remove equipment from cache
equipmentCacheUtils.removeItem(queryClient, userId, equipmentId);

// Reorder equipment items
equipmentCacheUtils.reorderItems(queryClient, userId, reorderedItems);

// Get current equipment list
const items = equipmentCacheUtils.getCurrentItems(queryClient, userId);
```

### equipmentExpenseCacheUtils

Equipment-specific operations with enhanced functionality:

```typescript
import { equipmentExpenseCacheUtils } from "@/utils/equipment-cache-utils";

// Drag-and-drop reordering
equipmentExpenseCacheUtils.reorderByDragDrop(
  queryClient,
  userId,
  sourceIndex,
  destinationIndex
);

// Batch rank updates
equipmentExpenseCacheUtils.updateRanks(queryClient, userId, [
  { id: 1, rank: 3 },
  { id: 2, rank: 1 },
  { id: 3, rank: 2 },
]);

// Optimistic equipment creation
const optimisticItem = equipmentExpenseCacheUtils.addOptimisticEquipment(
  queryClient,
  userId,
  equipmentData
);

// Replace optimistic with real data
equipmentExpenseCacheUtils.replaceOptimisticEquipment(
  queryClient,
  userId,
  optimisticItem.id,
  realEquipment
);

// Get next available rank
const nextRank = equipmentExpenseCacheUtils.getNextRank(queryClient, userId);

// Validate equipment data
const errors = equipmentExpenseCacheUtils.validateEquipment(equipment);
```

### equipmentDragDropUtils

Specialized utilities for drag-and-drop operations:

```typescript
import { equipmentDragDropUtils } from "@/utils/equipment-cache-utils";

// Handle drag start
const draggedItem = equipmentDragDropUtils.handleDragStart(
  queryClient,
  userId,
  equipmentId
);

// Handle drag end
const updatedItems = equipmentDragDropUtils.handleDragEnd(
  queryClient,
  userId,
  draggedId,
  targetId
);

// Optimistic drag reorder (immediate UI update)
const previousItems = equipmentDragDropUtils.optimisticDragReorder(
  queryClient,
  userId,
  sourceIndex,
  destinationIndex
);

// Rollback if server update fails
equipmentDragDropUtils.rollbackDragReorder(queryClient, userId, previousItems);
```

### equipmentRankUtils

Rank management utilities for maintaining equipment order:

```typescript
import { equipmentRankUtils } from "@/utils/equipment-cache-utils";

// Normalize ranks to sequential order (1, 2, 3, ...)
equipmentRankUtils.normalizeRanks(queryClient, userId);

// Insert equipment at specific rank
equipmentRankUtils.insertAtRank(queryClient, userId, equipment, targetRank);

// Remove equipment and adjust remaining ranks
equipmentRankUtils.removeAndAdjustRanks(queryClient, userId, equipmentId);
```

## Usage Examples

### Basic Equipment Management

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { equipmentExpenseCacheUtils } from '@/utils/equipment-cache-utils';

function EquipmentManager({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const addEquipment = (equipmentData: Omit<EquipmentExpenseItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Add optimistic equipment for immediate UI update
    const optimisticItem = equipmentExpenseCacheUtils.addOptimisticEquipment(
      queryClient,
      userId,
      equipmentData
    );

    // Make server request
    createEquipmentMutation.mutate(equipmentData, {
      onSuccess: (realEquipment) => {
        // Replace optimistic with real data
        equipmentExpenseCacheUtils.replaceOptimisticEquipment(
          queryClient,
          userId,
          optimisticItem.id,
          realEquipment
        );
      },
      onError: () => {
        // Remove optimistic item on error
        equipmentExpenseCacheUtils.removeOptimisticEquipment(
          queryClient,
          userId,
          optimisticItem.id
        );
      }
    });
  };

  const updateEquipment = (updatedEquipment: EquipmentExpenseItem) => {
    // Validate before updating
    const errors = equipmentExpenseCacheUtils.validateEquipment(updatedEquipment);
    if (errors.length > 0) {
      console.error('Validation errors:', errors);
      return;
    }

    // Update cache immediately
    equipmentCacheUtils.updateItem(queryClient, userId, updatedEquipment);

    // Make server request
    updateEquipmentMutation.mutate(updatedEquipment);
  };

  const deleteEquipment = (equipmentId: number) => {
    // Remove from cache with rank adjustment
    equipmentRankUtils.removeAndAdjustRanks(queryClient, userId, equipmentId);

    // Make server request
    deleteEquipmentMutation.mutate(equipmentId);
  };

  return (
    // Your component JSX
  );
}
```

### Drag-and-Drop Implementation

```typescript
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { equipmentDragDropUtils } from '@/utils/equipment-cache-utils';

function DraggableEquipmentList({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Perform optimistic reorder
    const previousItems = equipmentDragDropUtils.optimisticDragReorder(
      queryClient,
      userId,
      activeIndex,
      overIndex
    );

    // Make server request to update ranks
    updateRanksMutation.mutate(
      { draggedId: active.id, targetId: over.id },
      {
        onError: () => {
          // Rollback on error
          equipmentDragDropUtils.rollbackDragReorder(queryClient, userId, previousItems);
        }
      }
    );
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {/* Your draggable equipment items */}
    </DndContext>
  );
}
```

### Mutation Hook Integration

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { equipmentExpenseCacheUtils } from "@/utils/equipment-cache-utils";

export const useCreateEquipmentExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEquipmentExpense,
    onMutate: async (variables) => {
      // Add optimistic equipment
      const optimisticItem = equipmentExpenseCacheUtils.addOptimisticEquipment(
        queryClient,
        variables.userId,
        variables
      );

      return { optimisticItem };
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic with real data
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
};
```

## Performance Benefits

### Before (with invalidateQueries)

- Broad cache invalidations cause unnecessary refetches
- Multiple components re-render unnecessarily
- Potential for infinite loops and stack overflow
- Poor user experience with loading states

### After (with precise cache updates)

- Only affected cache entries are updated
- Components only re-render when their data actually changes
- No unnecessary network requests
- Immediate UI feedback with optimistic updates
- Better error handling and rollback mechanisms

## Error Handling

The utilities include comprehensive error handling:

```typescript
// Validation errors
const errors = equipmentExpenseCacheUtils.validateEquipment(equipment);
if (errors.length > 0) {
  // Handle validation errors
}

// Cache operation errors
try {
  equipmentCacheUtils.updateItem(queryClient, userId, equipment);
} catch (error) {
  // Handle cache update errors
  console.error("Cache update failed:", error);
}

// Optimistic update rollback
onError: (error, variables, context) => {
  if (context?.previousItems) {
    equipmentDragDropUtils.rollbackDragReorder(
      queryClient,
      userId,
      context.previousItems
    );
  }
};
```

## Testing

The utilities come with comprehensive tests covering:

- Basic CRUD operations
- Drag-and-drop functionality
- Rank management
- Optimistic updates
- Error handling
- Edge cases

Run tests with:

```bash
npm test -- utils/__tests__/equipment-cache-utils.test.ts
```

## Best Practices

1. **Always validate** equipment data before cache operations
2. **Use optimistic updates** for better user experience
3. **Handle errors gracefully** with rollback mechanisms
4. **Normalize ranks** periodically to maintain consistency
5. **Monitor performance** using the built-in logging
6. **Avoid invalidateQueries** in favor of precise cache updates

## Integration with Existing Code

To migrate from invalidateQueries to precise cache updates:

1. Replace `onSettled` invalidations with `onSuccess` cache updates
2. Add optimistic updates in `onMutate`
3. Implement error rollback in `onError`
4. Use equipment-specific cache utilities instead of generic operations

This approach provides better performance, user experience, and maintainability while preventing the stack overflow issues that can occur with broad cache invalidations.
