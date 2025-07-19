import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetEquipmentExpensesParams {
  userId: string;
}

/**
 * Client-side hook for fetching equipment expenses
 */
export const useGetEquipmentExpenses = ({ userId }: UseGetEquipmentExpensesParams) => {
  return useQuery({
    queryKey: reactQueryKeys.equipmentExpenses.byUserId(userId),
    queryFn: async () => {
      const response = await client.api.expenses["equipment-costs"].$get({
        query: { userId },
      });

      const responseData = await response.json();

      if (responseData.success !== true) {
        throw new Error("Failed to fetch equipment expenses");
      }

      return responseData.data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes - equipment expenses change less frequently
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};

/**
 * Server-side fetcher for prefetching equipment expenses
 * Use this in server components for initial data loading
 */
export async function getEquipmentExpenses(userId: string) {
  const response = await client.api.expenses["equipment-costs"].$get({
    query: { userId },
  });

  const responseData = await response.json();

  if (responseData.success !== true) {
    throw new Error("Failed to fetch equipment expenses");
  }

  return responseData.data;
}
