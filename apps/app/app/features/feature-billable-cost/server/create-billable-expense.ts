import { getTranslations } from "@/utils/translations";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";

type ResponseType = InferResponseType<
  (typeof client.api.expenses)["billable-costs"]["$post"],
  201
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["billable-costs"]["$post"]
>;

export const useCreateBillableExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      try {
        const response = await client.api.expenses["billable-costs"].$post({
          json,
        });

        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("application/json")
        ) {
          throw new Error(t.validation.error["create-failed"]);
        }

        const data = await response.json();

        if (data.success === false) {
          throw new Error(t.validation.error["create-failed"]);
        }

        return data;
      } catch (error) {
        console.log(error);
        throw error instanceof Error
          ? error
          : new Error(t.validation.error["create-failed"]);
      }
    },

    onMutate: async ({ json: newExpense }) => {
      const queryKey = reactQueryKeys.billableExpenses.byUserId(newExpense.userId);

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousExpenses = queryClient.getQueryData(queryKey);

      // Optimistically update the cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return [{ ...newExpense, id: `temp-${Date.now()}` }];
        return [...old, { ...newExpense, id: `temp-${Date.now()}` }];
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
      const queryKey = reactQueryKeys.billableExpenses.byUserId(variables.json.userId);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return mutation;
};
