import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@repo/design-system/lib/rpc";
import { getTranslations } from "@/utils/translations";

type ResponseType = InferResponseType<
  (typeof client.api.expenses)["equipment-costs"]["$post"],
  201
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["equipment-costs"]["$post"]
>;

export const useCreateEquipmentExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      try {
        const response = await client.api.expenses["equipment-costs"]["$post"]({
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
      queryClient.invalidateQueries({ queryKey: ["equipment-expenses-list"] });
    },
  });

  return mutation;
};
