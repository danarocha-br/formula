import { getTranslations } from "@/utils/translations";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";

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

      // Snapshot the previous value
      const previousExpenses = queryClient.getQueryData(queryKey);

      // Optimistically update the expense in the cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return [];
        return old.map((expense: any) =>
          expense.id === updatedExpense.id
            ? { ...expense, ...updatedExpense }
            : expense
        );
      });

      // Return a context object with the snapshotted value
      return { previousExpenses, queryKey };
    },

    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousExpenses && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousExpenses);
      }
    },

    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure we have the latest data
      const queryKey = reactQueryKeys.equipmentExpenses.byUserId(variables.json.userId);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return mutation;
};
