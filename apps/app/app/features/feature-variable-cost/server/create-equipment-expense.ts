import { getTranslations } from "@/utils/translations";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";
import { EQUIPMENT_COST_CATEGORIES } from "@/app/constants";
import type { EquipmentExpenseItem } from "@/app/types";

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
      const tempId = Date.now();

      await queryClient.cancelQueries({ queryKey });

      const previousExpenses = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: EquipmentExpenseItem[] = []) => {
        if (!old) return [{ ...newExpense, id: tempId }];
        return [...old, { ...newExpense, id: tempId }];
      });

      return { previousExpenses, queryKey, tempId };
    },
    onError: (err, variables, context) => {
      if (context?.previousExpenses && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousExpenses);
      }
    },
    onSuccess: (data, variables, context) => {
      const queryKey = reactQueryKeys.equipmentExpenses.byUserId(variables.json.userId);

      queryClient.setQueryData(queryKey, (old: EquipmentExpenseItem[] = []) => {
        if (!old || !context?.tempId) return [...old, data.data];

        return old.map(expense =>
          expense.id === context.tempId ? { ...data.data } : expense
        );
      });
    },
    onSettled: (data, error, variables) => {
      const queryKey = reactQueryKeys.equipmentExpenses.byUserId(variables.json.userId);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return mutation;
};
