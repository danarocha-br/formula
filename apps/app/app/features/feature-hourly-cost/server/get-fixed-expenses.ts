import { client } from "@repo/design-system/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface useGetFixedExpenses {
  userId: string;
}

export const useGetFixedExpenses = ({ userId }: useGetFixedExpenses) => {
  const query = useQuery({
    queryKey: ["fixed-expenses-list", userId],
    queryFn: async () => {
      const response = await client.api.expenses["fixed-costs"]["$get"]({
        query: { userId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch expenses.");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!userId,
  });

  return query;
};
