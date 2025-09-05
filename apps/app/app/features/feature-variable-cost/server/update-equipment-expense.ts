import { getTranslations } from "@/utils/translations";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";
import { equipmentExpenseCacheUtils } from "@/utils/equipment-cache-utils";
import type { EquipmentExpenseItem } from "@/app/types";

type ResponseType = InferResponseType<
  (typeof client.api.expenses)["equipment-costs"]["$patch"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["equipment-costs"]["$patch"]
>;

export const useUpdateEquipmentExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      try {
        const response = await client.api.expenses["equipment-costs"].$patch({
          json,
        });

        const data = await response.json();

        if (data.success === false) {
          throw new Error(t.validation.error["update-failed"]);
        }
        return data;
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error(t.validation.error["update-failed"]);
      }
    },

    onMutate: async ({ json: updatedExpense }) => {
      const queryKey = reactQueryKeys.equipmentExpenses.byUserId(updatedExpense.userId);

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value using cache utilities
      const previousExpenses = equipmentExpenseCacheUtils.getCurrentItems(queryClient, updatedExpense.userId);

      // Get the current item for validation and rollback
      const currentItem = equipmentExpenseCacheUtils.getEquipment(queryClient, updatedExpense.userId, updatedExpense.id);

      if (!currentItem) {
        throw new Error(`Equipment with ID ${updatedExpense.id} not found`);
      }

      // Create the updated item
      const updatedItem: EquipmentExpenseItem = {
        ...currentItem,
        ...updatedExpense,
        updatedAt: new Date().toISOString()
      };

      // Validate the updated equipment data
      const validationErrors = equipmentExpenseCacheUtils.validateEquipment(updatedItem);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Optimistically update the equipment using cache utilities
      equipmentExpenseCacheUtils.updateItem(queryClient, updatedExpense.userId, updatedItem);

      return {
        previousExpenses,
        queryKey,
        currentItem,
        updatedItem
      };
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
    },

    onSuccess: (data, variables, context) => {
      // Update with real server data if available
      if (data.data && context?.updatedItem) {
        const serverItem = data.data as EquipmentExpenseItem;
        equipmentExpenseCacheUtils.updateItem(queryClient, variables.json.userId, serverItem);
      }
    },

    // Remove onSettled to avoid invalidation - we use precise cache updates instead
  });

  return mutation;
};
