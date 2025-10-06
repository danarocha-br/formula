import { getTranslations } from "@/utils/translations";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";
import { EQUIPMENT_COST_CATEGORIES } from "@/app/constants";
import type { EquipmentExpenseItem } from "@/app/types";
import { equipmentExpenseCacheUtils } from "@/utils/equipment-cache-utils";

type ResponseType = {
  status: number;
  success: boolean;
  error?: string;
  data?: {
    id: number;
    name: string;
    amount: number;
    rank: number;
    category: string;
    purchaseDate: string;
    usage: number;
    lifeSpan: number;
    userId: string;
    createdAt: string;
    updatedAt: string;
  };
};

type RequestType = {
  json: {
    userId: string;
    name: string;
    amount: number;
    rank: number;
    category: string;
    purchaseDate: string;
    usage: number;
    lifeSpan: number;
  };
};

export const useCreateEquipmentExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json: newExpense }) => {
      try {
        const response = await client.api.expenses["equipment-costs"].$post({
          json: {
            userId: newExpense.userId,
            name: newExpense.name,
            amount: newExpense.amount,
            rank: newExpense.rank,
            category: newExpense.category,
            purchaseDate: newExpense.purchaseDate,
            usage: newExpense.usage,
            lifeSpan: newExpense.lifeSpan
          }
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

        return {
          status: data.status,
          success: data.success,
          data: {
            id: data.data.id,
            name: data.data.name,
            category: data.data.category,
            amount: data.data.amount,
            rank: data.data.rank,
            purchaseDate: data.data.purchaseDate,
            usage: data.data.usage,
            lifeSpan: data.data.lifeSpan,
            userId: data.data.userId,
            createdAt: data.data.createdAt,
            updatedAt: data.data.updatedAt
          }
        };
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error(t.validation.error["create-failed"]);
      }
    },

    onMutate: async ({ json: newExpense }) => {
      const queryKey = reactQueryKeys.equipmentExpenses.byUserId(newExpense.userId);

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousExpenses = equipmentExpenseCacheUtils.getCurrentItems(queryClient, newExpense.userId);

      // Validate equipment data before optimistic update
      const validationErrors = equipmentExpenseCacheUtils.validateEquipment({
        ...newExpense,
        id: 0, // Temporary ID for validation
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as EquipmentExpenseItem);

      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Use cache utilities for optimistic update
      const optimisticItem = equipmentExpenseCacheUtils.addOptimisticEquipment(
        queryClient,
        newExpense.userId,
        newExpense
      );

      return {
        previousExpenses,
        queryKey,
        tempId: optimisticItem.id,
        optimisticItem
      };
    },

    onError: (err, variables, context) => {
      // Rollback optimistic update using cache utilities
      if (context?.previousExpenses && context?.queryKey) {
        equipmentExpenseCacheUtils.replaceAllItems(
          queryClient,
          variables.json.userId,
          context.previousExpenses
        );
      }
    },

    onSuccess: (data, variables, context) => {
      // Replace temporary item with real server data using cache utilities
      if (context?.tempId && data.data) {
        equipmentExpenseCacheUtils.replaceOptimisticEquipment(
          queryClient,
          variables.json.userId,
          context.tempId,
          data.data as EquipmentExpenseItem
        );
      }
    },

    // Remove onSettled to avoid invalidation - we use precise cache updates instead
  });

  return mutation;
};
