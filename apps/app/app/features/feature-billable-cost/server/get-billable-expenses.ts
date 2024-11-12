import { useQuery } from "@tanstack/react-query";
import { client } from "@repo/design-system/lib/rpc";

interface useGetBillableExpenses {
  userId: string;
}

export const useGetBillableExpenses = ({ userId }: useGetBillableExpenses) => {
  const query = useQuery({
    queryKey: ["billable-expenses-list", userId],
    queryFn: async () => {
      const response = await client.api.expenses["billable-costs"]["$get"]({
        query: { userId },
      });

      const responseData = await response.json();

      if (responseData.success !== true) {
        throw new Error("Failed to fetch billable expenses.");
      }

      return responseData.data;
    },
  });

  return query;
};
