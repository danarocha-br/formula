import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@repo/design-system/lib/rpc";
import { getTranslations } from "@/utils/translations";

type ResponseType = InferResponseType<
  (typeof client.api.expenses)["fixed-costs"][":id"]["$patch"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["fixed-costs"][":id"]["$patch"]
>;

export const useUpdateFixedExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json, param: { id } }) => {
      try {
        const response = await client.api.expenses["fixed-costs"][":id"][
          "$patch"
        ]({
          json,
          param: { id },
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
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["fixed-expenses-list", variables.json.userId],
      });
    },
  });

  return mutation;
};
