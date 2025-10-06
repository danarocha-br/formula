import { getTranslations } from "@/utils/translations";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";
import { equipmentExpenseCacheUtils, equipmentRankUtils } from "@/utils/equipment-cache-utils";
import type { EquipmentExpenseItem } from "@/app/types";

const t = getTranslations();

type ResponseType = InferResponseType<
  (typeof client.api.expenses)["equipment-costs"][":userId"][":id"]["$delete"],
  204
>;

type RequestType = InferRequestType<
  (typeof client.api.expenses)["equipment-costs"][":userId"][":id"]["$delete"]
>;

export const useDeleteEquipmentExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param: { userId, id } }) => {
      try {
        const response = await client.api.expenses["equipment-costs"][":userId"][":id"].$delete({
          param: { userId, id },
        });

        const data = await response.json();

        if (data.success === false) {
          throw new Error(t.validation.error["delete-failed"]);
        }

        return data;
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error(t.validation.error["delete-failed"]);
      }
    },

    onMutate: async ({ param: { userId, id } }) => {
      const queryKey = reactQueryKeys.equipmentExpenses.byUserId(userId);
      const equipmentId = parseInt(id, 10);

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value using cache utilities
      const previousExpenses = equipmentExpenseCacheUtils.getCurrentItems(queryClient, userId);

      // Get the item being deleted for validation and rollback
      const itemToDelete = equipmentExpenseCacheUtils.getEquipment(queryClient, userId, equipmentId);

      if (!itemToDelete) {
        throw new Error(`Equipment with ID ${equipmentId} not found`);
      }

      // Optimistically remove the equipment and adjust ranks using cache utilities
      equipmentRankUtils.removeAndAdjustRanks(queryClient, userId, equipmentId);

      return {
        previousExpenses,
        queryKey,
        deletedItem: itemToDelete,
        equipmentId
      };
    },

    onError: (err, variables, context) => {
      // Rollback optimistic update using cache utilities
      if (context?.previousExpenses) {
        equipmentExpenseCacheUtils.replaceAllItems(
          queryClient,
          variables.param.userId,
          context.previousExpenses
        );
      }
    },

    onSuccess: (data, variables, context) => {
      // The optimistic update already handled the deletion and rank adjustment
      // No additional cache updates needed since we used precise cache management
    },

    // Remove onSettled to avoid invalidation - we use precise cache updates instead
  });

  return mutation;
};
