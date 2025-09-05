import { getTranslations } from "@/utils/translations";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";

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
    onSuccess: (_, { userId }) => {
      // Invalidate and refetch the equipment expenses list
      const queryKey = reactQueryKeys.equipmentExpenses.byUserId(userId);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return mutation;
};
