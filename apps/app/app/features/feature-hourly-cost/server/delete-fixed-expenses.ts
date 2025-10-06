
import { expenseCacheUtils } from "@/utils/query-cache-utils";
import { retryWithBackoff, RetryConfigs } from "@/utils/retry-with-backoff";
import { circuitBreakers } from "@/utils/circuit-breaker";
import { getTranslations } from "@/utils/translations";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";
import type { ExpenseItem } from "../../../types";

interface MutationContext {
  previousExpenses: ExpenseItem[] | undefined;
  queryKey: readonly string[];
}

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

  const mutation = useMutation<ResponseType, Error, RequestType, MutationContext>({
    mutationFn: async ({ param }) => {
      // Use circuit breaker to prevent infinite loops
      return circuitBreakers.deleteExpense.execute(async () => {
        // Use retry logic with exponential backoff
        return retryWithBackoff(async () => {
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
        }, {
          ...RetryConfigs.api,
          name: "deleteFixedExpense",
        });
      });
    },

    onMutate: async ({ param }) => {
      const queryKey = reactQueryKeys.fixedExpenses.byUserId(param.userId);

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousExpenses = queryClient.getQueryData(queryKey);

      // Optimistically remove the expense from the cache using precise cache utilities with circuit breaker
      try {
        circuitBreakers.cacheUpdate.executeSync(() => {
          expenseCacheUtils.removeExpense(queryClient, param.userId, Number(param.id));
        });
      } catch (error) {
        console.warn("Failed to optimistically remove expense:", error);
        // Fallback to manual cache update if utility fails
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return [];
          return old.filter((expense: any) => expense.id !== Number(param.id));
        });
      }

      // Return a context object with the snapshotted value
      return { previousExpenses: previousExpenses as ExpenseItem[], queryKey };
    },

    onError: (mutationError, variables, context: MutationContext | undefined) => {
      try {
        // If the mutation fails, use the context returned from onMutate to roll back
        if (context?.previousExpenses && context?.queryKey) {
          circuitBreakers.cacheUpdate.executeSync(() => {
            queryClient.setQueryData(context.queryKey, context.previousExpenses);
          });
        }
      } catch (rollbackError) {
        console.error("Failed to rollback optimistic update:", rollbackError);
        // If rollback fails, invalidate to ensure consistency
        if (context?.queryKey) {
          queryClient.invalidateQueries({ queryKey: context.queryKey });
        }
      }

      // Log the error for monitoring
      console.error("Delete expense mutation failed:", {
        error: mutationError,
        userId: variables.param.userId,
        expenseId: variables.param.id,
        circuitBreakerStatus: circuitBreakers.deleteExpense.getStatus(),
      });
    },

    onSettled: (data, error, variables) => {
      // Use precise cache update instead of broad invalidation to prevent stack overflow
      if (data?.success) {
        // For delete operations, the optimistic update already removed the item
        // No additional cache update needed on success
      }
      // On error, the onError handler already rolled back the cache
      // No additional action needed to prevent unnecessary refetches
    },
  });

  return mutation;
};
