import { getTranslations } from "@/utils/translations";
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
        const response = await client.api.expenses["billable-costs"]["$post"]({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billable-expenses-list"] });
    },
  });

  return mutation;
};
