import { getTranslations } from "@/utils/translations";
import { client } from "@repo/design-system/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono";

type ResponseType = InferResponseType<
  (typeof client.api.expenses)["billable-costs"]["$patch"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["billable-costs"]["$patch"]
>;

export const useUpdateBillableExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      try {
        const response = await client.api.expenses["billable-costs"]["$patch"]({
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billable-expenses-list"] });
    },
  });

  return mutation;
};
