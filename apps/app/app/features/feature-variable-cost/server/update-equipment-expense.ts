import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@repo/design-system/lib/rpc";
import { getTranslations } from "@/utils/translations";

type ResponseType = InferResponseType<
  (typeof client.api.expenses)["equipment-costs"]["$patch"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["equipment-costs"]["$patch"]
>;

export const useUpdateEquipmentExpense = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      try {
        const response = await client.api.expenses["equipment-costs"]["$patch"](
          {
            json,
          }
        );

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
      queryClient.invalidateQueries({ queryKey: ["equipment-expenses-list"] });
    },
  });

  return mutation;
};
