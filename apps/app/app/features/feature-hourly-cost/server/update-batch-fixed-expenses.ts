
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
  (typeof client.api.expenses)["fixed-costs"]["$put"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["fixed-costs"]["$put"]
>;

// Extended response type for successful batch updates
type SuccessResponseType = {
  status: 200;
  success: true;
  data: ExpenseItem[];
};

export const useUpdateBatchFixedExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType, MutationContext>({
    mutationFn: async ({ json }) => {
      // Use circuit breaker to prevent infinite loops
      return circuitBreakers.updateExpense.execute(async () => {
        // Use retry logic with exponential backoff
        return retryWithBackoff(async () => {
          try {
            const response = await client.api.expenses["fixed-costs"].$put({
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
        }, {
          ...RetryConfigs.api,
          name: "updateBatchFixedExpense",
        });
      });
    },

    onMutate: async ({ json: batchUpdate }) => {
      const queryKey = reactQueryKeys.fixedExpenses.byUserId(batchUpdate.userId);

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousExpenses = queryClient.getQueryData(queryKey);

      // Optimistically update multiple expenses in the cache using precise cache utilities with circuit breaker
      try {
        circuitBreakers.cacheUpdate.executeSync(() => {
          if (batchUpdate.updates && batchUpdate.updates.length > 0) {
            // Convert updates format to ExpenseItem format for cache utilities
            const currentExpenses = expenseCacheUtils.getCurrentExpenses(queryClient, batchUpdate.userId);
            const updatedExpenses: ExpenseItem[] = currentExpenses.map(expense => {
              const update = batchUpdate.updates.find(u => u.id === expense.id);
              return update ? { ...expense, ...update.data } : expense;
            });

            // Check if this is a reorder operation (all updates have rank changes)
            const isReorderOperation = batchUpdate.updates.every(update =>
              update.data.rank !== undefined && update.data.rank !== null
            );

            if (isReorderOperation) {
              // Use reorder utility for drag-and-drop operations
              expenseCacheUtils.reorderExpenses(queryClient, batchUpdate.userId, updatedExpenses);
            } else {
              // Use batch update utility for other multi-expense updates
              expenseCacheUtils.updateMultipleExpenses(queryClient, batchUpdate.userId, updatedExpenses);
            }
          }
        });
      } catch (error) {
        // Fallback to manual cache update if utility fails
        queryClient.setQueryData(queryKey, (old: ExpenseItem[]) => {
          if (!old) {
            return [];
          }

          // Create a map of updates for efficient lookup
          const updatesMap = new Map(
            batchUpdate.updates?.map(update => [update.id, update.data]) || []
          );

          return old.map(expense => {
            const update = updatesMap.get(expense.id);
            return update ? { ...expense, ...update } : expense;
          });
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
      console.error("Batch update expense mutation failed:", {
        error: mutationError,
        userId: variables.json.userId,
        updateCount: variables.json.updates?.length || 0,
        circuitBreakerStatus: circuitBreakers.updateExpense.getStatus(),
      });
    },

    onSettled: (data, error, variables) => {
      // Use precise cache update instead of broad invalidation to prevent stack overflow
      if (data?.success && 'data' in data) {
        try {
          circuitBreakers.cacheUpdate.executeSync(() => {
            // Update cache with the actual server response
            const successData = data as SuccessResponseType;
            const isReorderOperation = successData.data.every((expense: ExpenseItem) =>
              expense.rank !== undefined && expense.rank !== null
            );

            if (isReorderOperation) {
              // Use reorder utility for drag-and-drop operations
              expenseCacheUtils.reorderExpenses(queryClient, variables.json.userId, successData.data);
            } else {
              // Use batch update utility for other multi-expense updates
              expenseCacheUtils.updateMultipleExpenses(queryClient, variables.json.userId, successData.data);
            }
          });
        } catch (cacheError) {
          console.error("Failed to update cache after successful batch mutation:", cacheError);
          // Fallback to invalidation only if cache update fails
          const queryKey = reactQueryKeys.fixedExpenses.byUserId(variables.json.userId);
          queryClient.invalidateQueries({ queryKey });
        }
      }
      // On error, the onError handler already rolled back the cache
      // No additional action needed to prevent unnecessary refetches
    },
  });

  return mutation;
};
