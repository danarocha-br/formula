import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@repo/design-system/lib/rpc";
import { getTranslations } from "@/utils/translations";

type ResponseType = InferResponseType<
  (typeof client.api.expenses)["fixed-costs"][":userId"][":id"]["$delete"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.expenses)["fixed-costs"][":userId"][":id"]["$delete"]
>;

export const useDeleteFixedExpenses = () => {
  const queryClient = useQueryClient();
  const t = getTranslations();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      try {
        const response = await client.api.expenses["fixed-costs"][":userId"][
          ":id"
        ]["$delete"]({
          param,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(t.validation.error["delete-failed"]);
        }
        return data;
      } catch (error) {
        console.log(error);
        throw error instanceof Error
          ? error
          : new Error(t.validation.error["delete-failed"]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses-list"] });
    },
    onError: () => {
      toast.error(t.validation.error["delete-failed"]);
    },
  });

  return mutation;
};
