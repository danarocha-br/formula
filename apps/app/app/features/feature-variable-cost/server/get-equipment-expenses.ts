import { useQuery } from "@tanstack/react-query";
import { client } from "@repo/design-system/lib/rpc";

interface useGetEquipmentExpenses {
  userId: string;
}

export const useGetEquipmentExpenses = ({ userId }: useGetEquipmentExpenses) => {
  const query = useQuery({
    queryKey: ["equipment-expenses-list", userId],
    queryFn: async () => {
      const response = await client.api.expenses["equipment-costs"]["$get"]({
        query: { userId },
      });

      const responseData = await response.json();

      if (responseData.success !== true) {
        throw new Error("Failed to fetch equipment expenses.");
      }

      return responseData.data;
    },
  });

  return query;
};
