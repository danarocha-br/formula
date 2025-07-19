import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetFixedExpensesParams {
  userId: string;
}

/**
 * Client-side hook for fetching fixed expenses
 */
export const useGetFixedExpenses = ({ userId }: UseGetFixedExpensesParams) => {
  return useQuery({
    queryKey: reactQueryKeys.fixedExpenses.byUserId(userId),
    queryFn: async () => {
      const response = await client.api.expenses["fixed-costs"].$get({
        query: { userId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch fixed expenses");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - expenses don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Server-side fetcher for prefetching fixed expenses
 * Use this in server components for initial data loading
 */
export async function getFixedExpenses(userId: string) {
  const response = await client.api.expenses["fixed-costs"].$get({
    query: { userId },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch fixed expenses");
  }

  const { data } = await response.json();
  return data;
}
