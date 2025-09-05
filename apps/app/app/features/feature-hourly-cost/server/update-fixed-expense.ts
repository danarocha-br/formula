import { ErrorPatterns, createApiErrorHandler } from "@/utils/api-error-handler";
import { expenseCacheUtils } from "@/utils/query-cache-utils";
import { } from "@/utils/retry-with-backoff";
import { getTranslations } from "@/utils/translations";
// Note: Server-side hooks use getTranslations() directly since they don't have React context
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
  (typeof client.api.expenses)["fixed-costs"][":id"]["$patch"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["fixed-costs"][":id"]["$patch"]
>;

// Extended response type for successful updates
type SuccessResponseType = {
  status: 200;
  success: true;
  data: {
    name: string;
    amount: number;
    category: string;
  };
};

export const useUpdateFixedExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();
  const handleApiError = createApiErrorHandler(t);
  const errorPatterns = ErrorPatterns.UPDATE(t);

  const mutation = useMutation<ResponseType, Error, RequestType, MutationContext>({
    mutationFn: async ({ json, param: { id } }) => {
      // Use circuit breaker to prevent infinite loops
      return circuitBreakers.updateExpense.execute(async () => {
        // Use retry logic with exponential backoff
        return retryWithBackoff(async () => {
          try {
            const response = await client.api.expenses["fixed-costs"][":id"].$patch(
              {
                json,
                param: { id },
              }
            );

            const data = await response.json();

            if (data.success === false) {
              throw new Error(errorPatterns.default);
            }
            return data;
          } catch (error) {
            const errorMessage = handleApiError(error, errorPatterns.default);
            throw new Error(errorMessage);
          }
        }, {
          ...RetryConfigs.api,
          name: "updateFixedExpense",
        });
      });
    },

    onMutate: async ({ json: updatedExpense, param: { id } }) => {
      const queryKey = reactQueryKeys.fixedExpenses.byUserId(
        updatedExpense.userId
      );

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousExpenses = queryClient.getQueryData(queryKey);

      // Optimistically update the expense in the cache using precise cache utilities with circuit breaker
      try {
        circuitBreakers.cacheUpdate.executeSync(() => {
          // Get the existing expense to merge with updates
          const existingExpense = expenseCacheUtils.getExpense(
            queryClient,
            updatedExpense.userId,
            Number(id)
          );

          if (existingExpense) {
            const updatedExpenseItem: ExpenseItem = {
              ...existingExpense,
              ...updatedExpense,
              id: Number(id),
            };
            expenseCacheUtils.updateExpense(queryClient, updatedExpense.userId, updatedExpenseItem);
          }
        });
      } catch (error) {
        // Fallback to manual cache update if utility fails
        queryClient.setQueryData(queryKey, (old: ExpenseItem[]) => {
          if (!old) {
            return [];
          }
          return old.map(expense =>
            expense.id === Number(id) ? { ...expense, ...updatedExpense, id: Number(id) } : expense
          );
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
      console.error("Update expense mutation failed:", {
        error: mutationError,
        userId: variables.json.userId,
        expenseId: variables.param.id,
        circuitBreakerStatus: circuitBreakers.updateExpense.getStatus(),
      });
    },

    onSettled: (data, error, variables) => {
      // Use precise cache update instead of broad invalidation to prevent stack overflow
      if (data?.success && 'data' in data) {
        try {
          circuitBreakers.cacheUpdate.executeSync(() => {
            // Update cache with the actual server response
            // The API returns partial data, so we need to merge with existing expense
            const successData = data as SuccessResponseType;
            const existingExpense = expenseCacheUtils.getExpense(
              queryClient,
              variables.json.userId,
              Number(variables.param.id)
            );

            if (existingExpense) {
              const updatedExpense: ExpenseItem = {
                ...existingExpense,
                ...successData.data,
                id: Number(variables.param.id),
              };
              expenseCacheUtils.updateExpense(queryClient, variables.json.userId, updatedExpense);
            }
          });
        } catch (cacheError) {
          console.error("Failed to update cache after successful mutation:", cacheError);
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
