import { getTranslations } from "@/utils/translations";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";

type ResponseType = InferResponseType<
  (typeof client.api.expenses)["fixed-costs"][":userId"][":id"]["$delete"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["fixed-costs"][":userId"][":id"]["$delete"]
>;

export const useDeleteFixedExpenses = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      try {
        const response = await client.api.expenses["fixed-costs"][":userId"][":id"].$delete({
          param: {
            id: param.id,
            userId: param.userId,
          },
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

    onMutate: async ({ param }) => {
      const queryKey = reactQueryKeys.fixedExpenses.byUserId(param.userId);

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousExpenses = queryClient.getQueryData(queryKey);

      // Optimistically remove the expense from the cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return [];
        return old.filter((expense: any) => expense.id !== param.id);
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
      const queryKey = reactQueryKeys.fixedExpenses.byUserId(variables.param.userId);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return mutation;
};
