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
    workDays?: number;
    hoursPerDay?: number;
    holidaysDays?: number;
    vacationsDays?: number;
    sickLeaveDays?: number;
    billableHours?: number;
    monthlySalary?: number;
    taxes?: number;
    fees?: number;
    margin?: number;
  };
};

import type { QueryKey } from "@tanstack/react-query";

interface OptimisticUpdateContext {
  previousData: BillableCostItem | null;
  queryKey: QueryKey;
}

export const useUpdateBillableExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType, OptimisticUpdateContext>({
    mutationFn: async ({ json }) => {
      // Use circuit breaker and retry logic for the API call
      return circuitBreakers.updateExpense.execute(async () => {
        return retryWithBackoff(async () => {
          try {
            const response = await client.api.expenses["billable-costs"].$patch({
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
          ...RetryConfigs.mutation,
          name: "updateBillableExpense",
        });
      });
    },

    onMutate: async ({ json: updatedExpense }) => {
      const userId = updatedExpense.userId;

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({
        queryKey: billableCostSpecializedUtils.getCurrentBillableCost(queryClient, userId) ?
          ["billable-expenses", userId] : undefined
      });

      // Validate form data before optimistic update
      const formData = {
        work_days: updatedExpense.workDays,
        hours_per_day: updatedExpense.hoursPerDay,
        holiday_days: updatedExpense.holidaysDays,
        vacation_days: updatedExpense.vacationsDays,
        sick_leave: updatedExpense.sickLeaveDays,
        monthly_salary: updatedExpense.monthlySalary,
        taxes: updatedExpense.taxes,
        fees: updatedExpense.fees,
        margin: updatedExpense.margin,
      };

      const validationErrors = billableCostSpecializedUtils.validateFormData(formData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
      }

      // Create optimistic update using specialized utilities
      const optimisticData: Partial<BillableCostItem> = {
        workDays: updatedExpense.workDays,
        hoursPerDay: updatedExpense.hoursPerDay,
        holidaysDays: updatedExpense.holidaysDays,
        vacationsDays: updatedExpense.vacationsDays,
        sickLeaveDays: updatedExpense.sickLeaveDays,
        monthlySalary: updatedExpense.monthlySalary,
        taxes: updatedExpense.taxes,
        fees: updatedExpense.fees,
        margin: updatedExpense.margin,
        billableHours: billableCostSpecializedUtils.calculateBillableHours(formData),
        updatedAt: new Date().toISOString(),
      };

      const context = billableCostSpecializedUtils.createOptimisticUpdate(
        queryClient,
        userId,
        optimisticData
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
