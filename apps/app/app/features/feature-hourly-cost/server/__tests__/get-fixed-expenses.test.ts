/**
 * Tests for fixed expenses query hooks
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createTestQueryClient, createQueryWrapper, mockData, mockResponses } from "@repo/design-system/lib/test-utils";
import { setupReactQueryTesting } from "@repo/design-system/lib/test-setup";
import { useGetFixedExpenses, getFixedExpenses } from "../get-fixed-expenses";

// Mock the RPC client
const mockClient = {
  api: {
    expenses: {
      "fixed-costs": {
        $get: jest.fn(),
      },
    },
  },
};

jest.mock("@repo/design-system/lib/rpc", () => ({
  client: mockClient,
}));

// Setup testing environment
setupReactQueryTesting();

describe("Fixed Expenses Query Hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  describe("useGetFixedExpenses", () => {
    it("should fetch fixed expenses successfully", async () => {
      const userId = "user-123";
      const mockExpenses = [
        mockData.fixedExpense({ id: "1", name: "Office Rent" }),
        mockData.fixedExpense({ id: "2", name: "Internet" }),
      ];

      mockClient.api.expenses["fixed-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpenses)
      );

      const { result } = renderHook(
        () => useGetFixedExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();

      // Wait for success
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockExpenses);
      expect(result.current.error).toBeNull();
      expect(mockClient.api.expenses["fixed-costs"].$get).toHaveBeenCalledWith({
        query: { userId },
      });
    });

    it("should handle API errors gracefully", async () => {
      const userId = "user-123";

      mockClient.api.expenses["fixed-costs"].$get.mockResolvedValue(
        mockResponses.error(500, "Internal Server Error")
      );

      const { result } = renderHook(
        () => useGetFixedExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      // Wait for error
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Failed to fetch fixed expenses");
    });

    it("should not fetch when userId is empty", () => {
      const { result } = renderHook(
        () => useGetFixedExpenses({ userId: "" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(mockClient.api.expenses["fixed-costs"].$get).not.toHaveBeenCalled();
    });

    it("should use correct query key", () => {
      const userId = "user-123";

      renderHook(
        () => useGetFixedExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      const queries = queryClient.getQueryCache().getAll();
      expect(queries).toHaveLength(1);
      expect(queries[0].queryKey).toEqual(["fixed-expenses-list", userId]);
    });

    it("should respect stale time configuration", async () => {
      const userId = "user-123";
      const mockExpenses = [mockData.fixedExpense()];

      mockClient.api.expenses["fixed-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpenses)
      );

      const { result } = renderHook(
        () => useGetFixedExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that the query has the correct stale time (5 minutes)
      const query = queryClient.getQueryCache().find(["fixed-expenses-list", userId]);
      expect(query?.options.staleTime).toBe(5 * 60 * 1000);
    });
  });

  describe("getFixedExpenses (server-side)", () => {
    it("should fetch fixed expenses on server", async () => {
      const userId = "user-123";
      const mockExpenses = [mockData.fixedExpense()];

      mockClient.api.expenses["fixed-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpenses)
      );

      const result = await getFixedExpenses(userId);

      expect(result).toEqual(mockExpenses);
      expect(mockClient.api.expenses["fixed-costs"].$get).toHaveBeenCalledWith({
        query: { userId },
      });
    });

    it("should handle server-side errors", async () => {
      const userId = "user-123";

      mockClient.api.expenses["fixed-costs"].$get.mockResolvedValue(
        mockResponses.error(500, "Server Error")
      );

      await expect(getFixedExpenses(userId)).rejects.toThrow("Failed to fetch fixed expenses");
    });

    it("should handle network errors", async () => {
      const userId = "user-123";

      mockClient.api.expenses["fixed-costs"].$get.mockRejectedValue(
        new Error("Network Error")
      );

      await expect(getFixedExpenses(userId)).rejects.toThrow("Network Error");
    });
  });

  describe("Integration with React Query keys", () => {
    it("should use the correct query key from the factory", () => {
      const userId = "user-123";
      const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");

      const expectedKey = reactQueryKeys.fixedExpenses.byUserId(userId);

      renderHook(
        () => useGetFixedExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      const queries = queryClient.getQueryCache().getAll();
      expect(queries[0].queryKey).toEqual(expectedKey);
    });

    it("should enable cache sharing between components", async () => {
      const userId = "user-123";
      const mockExpenses = [mockData.fixedExpense()];

      mockClient.api.expenses["fixed-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpenses)
      );

      // First hook call
      const { result: result1 } = renderHook(
        () => useGetFixedExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second hook call should use cached data
      const { result: result2 } = renderHook(
        () => useGetFixedExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      // Should immediately have data from cache
      expect(result2.current.data).toEqual(mockExpenses);
      expect(result2.current.isLoading).toBe(false);

      // Should only have called the API once
      expect(mockClient.api.expenses["fixed-costs"].$get).toHaveBeenCalledTimes(1);
    });
  });
});