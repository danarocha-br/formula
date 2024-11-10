import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@repo/design-system/lib/rpc";
import { getTranslations } from "@/utils/translations";

type ResponseType = InferResponseType<
  (typeof client.api.expenses)["fixed-costs"]["$post"],
  201
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["fixed-costs"]["$post"]
>;

export const useCreateFixedExpenses = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      try {
        const response = await client.api.expenses["fixed-costs"]["$post"]({
          json,
        });

        const data = await response.json();

        if (!response.ok) {
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
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses-list"] });
    },
  });

  return mutation;
};
