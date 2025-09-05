import { expenseCacheUtils } from "@/utils/query-cache-utils";
import { QueryClient, } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpenseItem } from "../../../types";
import { useDeleteFixedExpenses } from "../delete-fixed-expenses";
import { useUpdateBatchFixedExpense } from "../update-batch-fixed-expenses";
import { useUpdateFixedExpense } from "../update-fixed-expense";

// Mock the RPC client
vi.mock("@repo/design-system/lib/rpc", () => ({
  client: {
    api: {
      expenses: {
        "fixed-costs": {
          ":id": {
            $patch: vi.fn(),
          },
          ":userId": {
            ":id": {
              $delete: vi.fn(),
            },
          },
          $put: vi.fn(),
        },
      },
    },
  },
}));

// Mock translations
vi.mock("@/utils/translations", () => ({
  getTranslations: () => ({
    validation: {
      error: {
        "update-failed": "Update failed",
        "delete-failed": "Delete failed",
      },
    },
  }),
}));

// Mock cache utilities
vi.mock("@/utils/query-cache-utils", () => ({
  expenseCacheUtils: {
    updateExpense: vi.fn(),
    removeExpense: vi.fn(),
    reorderExpenses: vi.fn(),
    updateMultipleExpenses: vi.fn(),
    getExpense: vi.fn(),
    getCurrentExpenses: vi.fn(),
  },
}));

const mockExpense: ExpenseItem = {
  id: 1,
  name: "Test Expense",
  amount: 100,
  category: "office",
  period: "monthly",
  rank: 1,
  userId: "user-123",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("Refactored Mutation Hooks - Cache Management", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: any }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  describe("useUpdateFixedExpense", () => {
    it("should use precise cache updates instead of invalidateQueries", async () => {
      const mockUpdateExpense = vi.mocked(expenseCacheUtils.updateExpense);
      const mockGetExpense = vi.mocked(expenseCacheUtils.getExpense);

      // Mock successful API response
      const { client } = await import("@repo/design-system/lib/rpc");
      vi.mocked(client.api.expenses["fixed-costs"][":id"].$patch).mockResolvedValue({
        json: () => Promise.resolve({
          status: 200,
          success: true,
          data: { name: "Updated Expense", amount: 150, category: "office" },
        }),
      } as any);

      // Mock existing expense in cache
      mockGetExpense.mockReturnValue(mockExpense);

      const { result } = renderHook(() => useUpdateFixedExpense(), { wrapper });

      // Execute mutation
      result.current.mutate({
        json: {
          name: "Updated Expense",
          amount: 150,
          userId: "user-123",
        },
        param: { id: "1" },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify cache utilities were used for optimistic update
      expect(mockUpdateExpense).toHaveBeenCalledWith(
        queryClient,
        "user-123",
        expect.objectContaining({
          id: 1,
          name: "Updated Expense",
          amount: 150,
        })
      );

      // Verify cache utilities were used in onSettled
      expect(mockGetExpense).toHaveBeenCalledWith(queryClient, "user-123", 1);
    });
  });

  describe("useDeleteFixedExpenses", () => {
    it("should use precise cache updates for delete operations", async () => {
      const mockRemoveExpense = vi.mocked(expenseCacheUtils.removeExpense);

      // Mock successful API response
      const { client } = await import("@repo/design-system/lib/rpc");
      vi.mocked(client.api.expenses["fixed-costs"][":userId"][":id"].$delete).mockResolvedValue({
        json: () => Promise.resolve({
          status: 204,
          success: true,
        }),
      } as any);

      const { result } = renderHook(() => useDeleteFixedExpenses(), { wrapper });

      // Execute mutation
      result.current.mutate({
        param: { id: "1", userId: "user-123" },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify cache utilities were used for optimistic delete
      expect(mockRemoveExpense).toHaveBeenCalledWith(queryClient, "user-123", 1);
    });
  });

  describe("useUpdateBatchFixedExpense", () => {
    it("should use precise cache updates for batch operations", async () => {
      const mockUpdateMultipleExpenses = vi.mocked(expenseCacheUtils.updateMultipleExpenses);
      const mockGetCurrentExpenses = vi.mocked(expenseCacheUtils.getCurrentExpenses);

      // Mock current expenses in cache
      mockGetCurrentExpenses.mockReturnValue([mockExpense]);

      // Mock successful API response
      const { client } = await import("@repo/design-system/lib/rpc");
      vi.mocked(client.api.expenses["fixed-costs"].$put).mockResolvedValue({
        json: () => Promise.resolve({
          status: 200,
          success: true,
          data: [{ ...mockExpense, amount: 200 }],
        }),
      } as any);

      const { result } = renderHook(() => useUpdateBatchFixedExpense(), { wrapper });

      // Execute mutation
      result.current.mutate({
        json: {
          userId: "user-123",
          updates: [
            {
              id: 1,
              data: { amount: 200 },
            },
          ],
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify cache utilities were used for optimistic update
      expect(mockGetCurrentExpenses).toHaveBeenCalledWith(queryClient, "user-123");
      expect(mockUpdateMultipleExpenses).toHaveBeenCalled();
    });

    it("should detect reorder operations and use reorderExpenses utility", async () => {
      const mockReorderExpenses = vi.mocked(expenseCacheUtils.reorderExpenses);
      const mockGetCurrentExpenses = vi.mocked(expenseCacheUtils.getCurrentExpenses);

      // Mock current expenses in cache
      mockGetCurrentExpenses.mockReturnValue([mockExpense]);

      // Mock successful API response with rank changes
      const { client } = await import("@repo/design-system/lib/rpc");
      vi.mocked(client.api.expenses["fixed-costs"].$put).mockResolvedValue({
        json: () => Promise.resolve({
          status: 200,
          success: true,
          data: [{ ...mockExpense, rank: 2 }],
        }),
      } as any);

      const { result } = renderHook(() => useUpdateBatchFixedExpense(), { wrapper });

      // Execute mutation with rank changes (reorder operation)
      result.current.mutate({
        json: {
          userId: "user-123",
          updates: [
            {
              id: 1,
              data: { rank: 2 },
            },
          ],
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify reorder utility was used in onSettled
      expect(mockReorderExpenses).toHaveBeenCalledWith(
        queryClient,
        "user-123",
        [{ ...mockExpense, rank: 2 }]
      );
    });
  });

  describe("Error Handling", () => {
    it("should properly rollback optimistic updates on error", async () => {
      const mockUpdateExpense = vi.mocked(expenseCacheUtils.updateExpense);

      // Mock API error
      const { client } = await import("@repo/design-system/lib/rpc");
      vi.mocked(client.api.expenses["fixed-costs"][":id"].$patch).mockRejectedValue(
        new Error("Network error")
      );

      const { result } = renderHook(() => useUpdateFixedExpense(), { wrapper });

      // Set initial cache data
      const queryKey = ["fixed-expenses-list", "user-123"];
      queryClient.setQueryData(queryKey, [mockExpense]);

      // Execute mutation
      result.current.mutate({
        json: {
          name: "Updated Expense",
          userId: "user-123",
        },
        param: { id: "1" },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify optimistic update was attempted
      expect(mockUpdateExpense).toHaveBeenCalled();

      // Verify cache was rolled back (the onError handler should restore previous state)
      const finalCacheData = queryClient.getQueryData(queryKey);
      expect(finalCacheData).toEqual([mockExpense]);
    });
  });
});