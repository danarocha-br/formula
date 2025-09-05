import { getTranslations } from "@/utils/translations";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";
import { equipmentExpenseCacheUtils } from "@/utils/equipment-cache-utils";
import type { EquipmentExpenseItem } from "@/app/types";

// Request type for batch equipment updates
type RequestType = {
  json: {
    userId: string;
    updates: Array<{
      id: number;
      data: Partial<EquipmentExpenseItem>;
    }>;
  };
};

// Response type for successful batch updates
type SuccessResponseType = {
  status: 200;
  success: true;
  data: EquipmentExpenseItem[];
};

// Response type for failed batch updates
type ErrorResponseType = {
  status: number;
  success: false;
  error: string;
};

type ResponseType = SuccessResponseType | ErrorResponseType;

/**
 * Hook for batch updating equipment expenses
 * Primarily used for drag-and-drop operations that affect multiple items
 * Uses precise cache management to avoid invalidations
 */
export const useUpdateBatchEquipmentExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json: batchUpdate }) => {
      try {
        const response = await client.api.expenses["equipment-costs"].$put({
          json: {
            userId: batchUpdate.userId,
            updates: batchUpdate.updates
          }
        });

        const data = await response.json();

        if (data.success === false) {
          throw new Error(t.validation.error["update-failed"]);
        }

        return data as ResponseType;
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error(t.validation.error["update-failed"]);
      }
    },

    onMutate: async ({ json: batchUpdate }) => {
      const queryKey = reactQueryKeys.equipmentExpenses.byUserId(batchUpdate.userId);

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value using cache utilities
      const previousExpenses = equipmentExpenseCacheUtils.getCurrentItems(queryClient, batchUpdate.userId);

      try {
        if (batchUpdate.updates && batchUpdate.updates.length > 0) {
          // Get current expenses for validation and updates
          const currentExpenses = equipmentExpenseCacheUtils.getCurrentItems(queryClient, batchUpdate.userId);

          // Apply updates to create the new state
          const updatedExpenses: EquipmentExpenseItem[] = currentExpenses.map(expense => {
            const update = batchUpdate.updates.find(u => u.id === expense.id);
            if (update) {
              const updatedItem = {
                ...expense,
                ...update.data,
                updatedAt: new Date().toISOString()
              };

              // Validate the updated item
              const validationErrors = equipmentExpenseCacheUtils.validateEquipment(updatedItem);
              if (validationErrors.length > 0) {
                throw new Error(`Validation failed for equipment ${expense.id}: ${validationErrors.join(', ')}`);
              }

              return updatedItem;
            }
            return expense;
          });

          // Check if this is a reorder operation (all updates have rank changes)
          const isReorderOperation = batchUpdate.updates.every(update =>
            update.data.rank !== undefined && update.data.rank !== null
          );

          if (isReorderOperation) {
            // Use reorder utility for drag-and-drop operations
            equipmentExpenseCacheUtils.reorderItems(queryClient, batchUpdate.userId, updatedExpenses);
          } else {
            // Use batch update utility for other multi-equipment updates
            equipmentExpenseCacheUtils.batchUpdateEquipment(queryClient, batchUpdate.userId, updatedExpenses);
          }
        }

        return {
          previousExpenses,
          queryKey,
          isReorderOperation: batchUpdate.updates.every(update =>
            update.data.rank !== undefined && update.data.rank !== null
          )
        };
      } catch (validationError) {
        // If validation fails, restore previous state and re-throw
        equipmentExpenseCacheUtils.replaceAllItems(queryClient, batchUpdate.userId, previousExpenses);
        throw validationError;
      }
    },

    onError: (err, variables, context) => {
      // Rollback optimistic update using cache utilities
      if (context?.previousExpenses) {
        equipmentExpenseCacheUtils.replaceAllItems(
          queryClient,
          variables.json.userId,
          context.previousExpenses
        );
      }

      // Log the error for monitoring
      console.error("Batch update equipment expense mutation failed:", {
        error: err,
        userId: variables.json.userId,
        updateCount: variables.json.updates?.length || 0,
        context
      });
    },

    onSuccess: (data, variables, context) => {
      // Update cache with real server data if available
      if (data.success && 'data' in data && data.data) {
        const successData = data as SuccessResponseType;

        if (context?.isReorderOperation) {
          // Use reorder utility for drag-and-drop operations
          equipmentExpenseCacheUtils.reorderItems(queryClient, variables.json.userId, successData.data);
        } else {
          // Use batch update utility for other multi-equipment updates
          equipmentExpenseCacheUtils.batchUpdateEquipment(queryClient, variables.json.userId, successData.data);
        }
      }
    },

    // Remove onSettled to avoid invalidation - we use precise cache updates instead
  });

  return mutation;
};

/**
 * Specialized hook for drag-and-drop reordering operations
 * Provides a simpler interface for rank-only updates
 */
export const useReorderEquipmentExpenses = () => {
  const batchUpdateMutation = useUpdateBatchEquipmentExpense();

  return {
    ...batchUpdateMutation,
    reorderEquipment: (userId: string, reorderedItems: EquipmentExpenseItem[]) => {
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        data: { rank: index + 1 }
      }));

      return batchUpdateMutation.mutate({
        json: {
          userId,
          updates
        }
      });
    },
    reorderEquipmentAsync: async (userId: string, reorderedItems: EquipmentExpenseItem[]) => {
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        data: { rank: index + 1 }
      }));

      return batchUpdateMutation.mutateAsync({
        json: {
          userId,
          updates
        }
      });
    }
  };
};

/**
 * Hook for optimistic drag-and-drop operations
 * Provides immediate UI feedback during drag operations
 */
export const useOptimisticEquipmentReorder = () => {
  const queryClient = useQueryClient();

  return {
    /**
     * Optimistically reorder equipment during drag operation
     */
    optimisticReorder: (userId: string, sourceIndex: number, destinationIndex: number) => {
      return equipmentExpenseCacheUtils.reorderByDragDrop(queryClient, userId, sourceIndex, destinationIndex);
    },

    /**
     * Get current sorted equipment for drag operations
     */
    getSortedEquipment: (userId: string) => {
      return equipmentExpenseCacheUtils.getSortedEquipment(queryClient, userId);
    },

    /**
     * Rollback optimistic reorder if needed
     */
    rollbackReorder: (userId: string, previousItems: EquipmentExpenseItem[]) => {
      equipmentExpenseCacheUtils.replaceAllItems(queryClient, userId, previousItems);
    }
  };
};