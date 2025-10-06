import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { client } from "@repo/design-system/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetBillableExpensesParams {
  userId: string;
}

/**
 * Client-side hook for fetching billable expenses
 */
export const useGetBillableExpenses = ({ userId }: UseGetBillableExpensesParams) => {
  return useQuery({
    queryKey: reactQueryKeys.billableExpenses.byUserId(userId),
    queryFn: async () => {
      const response = await client.api.expenses["billable-costs"].$get({
        query: { userId },
      });

      const responseData = await response.json();

      if (responseData.success !== true) {
        console.error('Failed to fetch billable expenses:', responseData);
        throw new Error(responseData.error || "Failed to fetch billable expenses");
      }

      return responseData.data;
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes - billable expenses change more frequently
    gcTime: 8 * 60 * 1000, // 8 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 or auth errors, but do retry on network errors
      if (error.message?.includes('404') || error.message?.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 2; // Only retry twice
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
};

/**
 * Server-side fetcher for prefetching billable expenses
 * Use this in server components for initial data loading
 */
export async function getBillableExpenses(userId: string) {
  const response = await client.api.expenses["billable-costs"].$get({
    query: { userId },
  });

  const responseData = await response.json();

  if (responseData.success !== true) {
    throw new Error("Failed to fetch billable expenses");
  }

  return responseData.data;
}
