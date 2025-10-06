import { getTranslations } from "../../../../utils/translations";
import { billableCostSpecializedUtils, type BillableCostItem } from "../../../../utils/query-cache-utils";
import { circuitBreakers } from "../../../../utils/circuit-breaker";
import { retryWithBackoff, RetryConfigs } from "../../../../utils/retry-with-backoff";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type ResponseType = {
  status: number;
  success: boolean;
  error?: string;
  data?: BillableCostItem;
};

type RequestType = {
  json: {
    userId: string;
  };
};

import type { QueryKey } from "@tanstack/react-query";

interface OptimisticUpdateContext {
  previousData: BillableCostItem | null;
  queryKey: QueryKey;
}

export const useCreateBillableExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType, OptimisticUpdateContext>({
    mutationFn: async ({ json }) => {
      // Use circuit breaker and retry logic for the API call
      return circuitBreakers.createExpense.execute(async () => {
        return retryWithBackoff(async () => {
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
        }, {
          ...RetryConfigs.mutation,
          name: "createBillableExpense",
        });
      });
    },

    onMutate: async ({ json: newExpense }) => {
      const userId = newExpense.userId;

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({
        queryKey: ["billable-expenses", userId]
      });

      // Create default billable cost item for optimistic update
      const defaultFormData = {
        work_days: 5,
        hours_per_day: 6,
        holiday_days: 12,
        vacation_days: 30,
        sick_leave: 3,
        monthly_salary: 0,
        taxes: 0,
        fees: 0,
        margin: 0,
      };

      // Create optimistic billable cost item with defaults
      const optimisticItem = billableCostSpecializedUtils.createBillableCostItem(
        userId,
        defaultFormData
      );

      // Create optimistic update using specialized utilities
      const context = billableCostSpecializedUtils.createOptimisticUpdate(
        queryClient,
        userId,
        optimisticItem
      );

      // Return context for rollback on error
      return context;
    },

    onError: (err, variables, context) => {
      // Rollback optimistic update using specialized utilities
      if (context) {
        billableCostSpecializedUtils.rollbackOptimisticUpdate(
          queryClient,
          variables.json.userId,
          context.previousData
        );
      }
    },

    onSuccess: (data, variables) => {
      // Update cache with real server data using precise cache updates
      if (data.success && 'data' in data && data.data) {
        const transformedData = billableCostSpecializedUtils.transformServerResponse(data.data);
        billableCostSpecializedUtils.updateFromFormData(
          queryClient,
          variables.json.userId,
          {
            work_days: transformedData.workDays,
            hours_per_day: transformedData.hoursPerDay,
            holiday_days: transformedData.holidaysDays,
            vacation_days: transformedData.vacationsDays,
            sick_leave: transformedData.sickLeaveDays,
            monthly_salary: transformedData.monthlySalary,
            taxes: transformedData.taxes,
            fees: transformedData.fees,
            margin: transformedData.margin,
          },
          transformedData.billableHours
        );
      }
    },

    // Removed onSettled with invalidateQueries - using precise cache updates instead
  });

  return mutation;
};
