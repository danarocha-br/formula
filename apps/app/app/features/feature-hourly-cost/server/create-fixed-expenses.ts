import type { ExpenseItem } from "@/app/types";
import { expenseCacheUtils, optimisticUpdateUtils } from "@/utils/query-cache-utils";
import { retryWithBackoff, RetryConfigs } from "@/utils/retry-with-backoff";
import { circuitBreakers } from "@/utils/circuit-breaker";
import { getTranslations } from "@/utils/translations";
// Note: Server-side hooks use getTranslations() directly since they don't have React context
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";

type ResponseType = InferResponseType<
  (typeof client.api.expenses)["fixed-costs"]["$post"],
  201
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["fixed-costs"]["$post"]
>;

// Enhanced mutation context for better error handling
interface MutationContext {
  previousExpenses: ExpenseItem[] | undefined;
  queryKey: readonly string[];
  optimisticExpense: ExpenseItem;
}

export const useCreateFixedExpenses = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType, MutationContext>({
    mutationFn: async ({ json }) => {
      // Use circuit breaker to prevent infinite loops
      return circuitBreakers.createExpense.execute(async () => {
        // Use retry logic with exponential backoff
        return retryWithBackoff(async () => {
          try {
            const response = await client.api.expenses["fixed-costs"].$post({
              json,
            });

            const data = await response.json();

            if (data.success === false) {
              throw new Error(t.validation.error["create-failed"]);
            }
            return data;
          } catch (error) {
            throw error instanceof Error
              ? error
              : new Error(t.validation.error["create-failed"]);
          }
        }, {
          ...RetryConfigs.api,
          name: "createFixedExpense",
        });
      });
    },

    onMutate: async ({ json: newExpense }) => {
      const queryKey = reactQueryKeys.fixedExpenses.byUserId(newExpense.userId);

      try {
        // Cancel any outgoing refetches to avoid overwriting our optimistic update
        await queryClient.cancelQueries({ queryKey });

        // Snapshot the previous value for rollback
        const previousExpenses = expenseCacheUtils.getCurrentExpenses(queryClient, newExpense.userId);

        // Create optimistic expense with temporary ID
        const optimisticExpense = optimisticUpdateUtils.createOptimisticExpense(
          {
            name: newExpense.name,
            amount: newExpense.amount,
            category: newExpense.category,
            period: newExpense.period || 'monthly',
            rank: newExpense.rank,
          },
          newExpense.userId
        );

        // Optimistically add the expense using cache utilities with circuit breaker
        circuitBreakers.cacheUpdate.executeSync(() => {
          expenseCacheUtils.addExpense(queryClient, newExpense.userId, optimisticExpense);
        });

        // Return context for error handling and success updates
        return {
          previousExpenses,
          queryKey,
          optimisticExpense,
        };
      } catch (optimisticError) {
        // If optimistic update fails, return minimal context
        return {
          previousExpenses: expenseCacheUtils.getCurrentExpenses(queryClient, newExpense.userId),
          queryKey,
          optimisticExpense: optimisticUpdateUtils.createOptimisticExpense(
            {
              name: newExpense.name,
              amount: newExpense.amount,
              category: newExpense.category,
              period: newExpense.period || 'monthly',
              rank: newExpense.rank,
            },
            newExpense.userId
          ),
        };
      }
    },

    onSuccess: (data, variables, context) => {
      try {
        if (data.success && context && 'data' in data) {
          // Create the complete expense item from API response
          const realExpense: ExpenseItem = {
            id: data.data.id,
            name: data.data.name,
            amount: data.data.amount,
            category: data.data.category,
            period: data.data.period as 'monthly' | 'yearly',
            rank: data.data.rank,
            userId: variables.json.userId,
            // API doesn't return these, so we'll use current timestamp
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Replace the optimistic expense with the real one using circuit breaker
          circuitBreakers.cacheUpdate.executeSync(() => {
            optimisticUpdateUtils.replaceTempExpense(
              queryClient,
              variables.json.userId,
              context.optimisticExpense.id,
              realExpense
            );
          });
        }
      } catch (cacheError) {
        // If cache update fails, fall back to invalidation (but this should be rare)
        const queryKey = reactQueryKeys.fixedExpenses.byUserId(variables.json.userId);
        queryClient.invalidateQueries({ queryKey });
      }
    },

    onError: (mutationError, variables, context) => {
      try {
        if (context) {
          // Use circuit breaker for cache rollback operations
          circuitBreakers.cacheUpdate.executeSync(() => {
            // Remove the optimistic expense that failed
            expenseCacheUtils.removeExpense(
              queryClient,
              variables.json.userId,
              context.optimisticExpense.id
            );

            // If we have previous expenses, restore them as a fallback
            if (context.previousExpenses) {
              expenseCacheUtils.replaceAllExpenses(
                queryClient,
                variables.json.userId,
                context.previousExpenses
              );
            }
          });
        }
      } catch (rollbackError) {
        console.error("Failed to rollback optimistic update:", rollbackError);
        // If rollback fails, invalidate to ensure consistency
        const queryKey = reactQueryKeys.fixedExpenses.byUserId(variables.json.userId);
        queryClient.invalidateQueries({ queryKey });
      }

      // Log the error for monitoring
      console.error("Create expense mutation failed:", {
        error: mutationError,
        userId: variables.json.userId,
        expenseName: variables.json.name,
        circuitBreakerStatus: circuitBreakers.createExpense.getStatus(),
      });
    },

    // Remove onSettled to avoid invalidateQueries that cause stack overflow
    // The cache is now managed precisely through onSuccess and onError
  });

  return mutation;
};
