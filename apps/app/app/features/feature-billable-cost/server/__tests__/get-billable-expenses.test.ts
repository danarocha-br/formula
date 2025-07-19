/**
 * Tests for billable expenses query hooks
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createTestQueryClient, createQueryWrapper, mockData, mockResponses } from "@repo/design-system/lib/test-utils";
import { setupReactQueryTesting } from "@repo/design-system/lib/test-setup";
import { useGetBillableExpenses, getBillableExpenses } from "../get-billable-expenses";

// Mock the RPC client
const mockClient = {
  api: {
    expenses: {
      "billable-costs": {
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

describe("Billable Expenses Query Hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  describe("useGetBillableExpenses", () => {
    it("should fetch billable expenses successfully", async () => {
      const userId = "user-123";
      const mockExpense = mockData.billableExpense({ userId });

      mockClient.api.expenses["billable-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpense)
      );

      const { result } = renderHook(
        () => useGetBillableExpenses({ userId }),
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
      expect(result.current.data).toEqual(mockExpense);
      expect(result.current.error).toBeNull();
      expect(mockClient.api.expenses["billable-costs"].$get).toHaveBeenCalledWith({
        query: { userId },
      });
    });

    it("should handle API errors gracefully", async () => {
      const userId = "user-123";

      mockClient.api.expenses["billable-costs"].$get.mockResolvedValue(
        mockResponses.error(404, "Not Found")
      );

      const { result } = renderHook(
        () => useGetBillableExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      // Wait for error
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Failed to fetch billable expenses");
    });

    it("should not fetch when userId is empty", () => {
      const { result } = renderHook(
        () => useGetBillableExpenses({ userId: "" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(mockClient.api.expenses["billable-costs"].$get).not.toHaveBeenCalled();
    });

    it("should use correct stale time for billable expenses", async () => {
      const userId = "user-123";
      const mockExpense = mockData.billableExpense();

      mockClient.api.expenses["billable-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpense)
      );

      const { result } = renderHook(
        () => useGetBillableExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that the query has the correct stale time (3 minutes)
      const query = queryClient.getQueryCache().find(["billable-expenses-list", userId]);
      expect(query?.options.staleTime).toBe(3 * 60 * 1000);
    });

    it("should handle successful response with success flag", async () => {
      const userId = "user-123";
      const mockExpense = mockData.billableExpense();

      // Mock response with success: true
      mockClient.api.expenses["billable-costs"].$get.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockExpense }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const { result } = renderHook(
        () => useGetBillableExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockExpense);
    });

    it("should handle response with success: false", async () => {
      const userId = "user-123";

      // Mock response with success: false
      mockClient.api.expenses["billable-costs"].$get.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: false, error: "Validation failed" }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const { result } = renderHook(
        () => useGetBillableExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Failed to fetch billable expenses");
    });
  });

  describe("getBillableExpenses (server-side)", () => {
    it("should fetch billable expenses on server", async () => {
      const userId = "user-123";
      const mockExpense = mockData.billableExpense();

      mockClient.api.expenses["billable-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpense)
      );

      const result = await getBillableExpenses(userId);

      expect(result).toEqual(mockExpense);
      expect(mockClient.api.expenses["billable-costs"].$get).toHaveBeenCalledWith({
        query: { userId },
      });
    });

    it("should handle server-side errors", async () => {
      const userId = "user-123";

      mockClient.api.expenses["billable-costs"].$get.mockResolvedValue(
        mockResponses.error(500, "Server Error")
      );

      await expect(getBillableExpenses(userId)).rejects.toThrow("Failed to fetch billable expenses");
    });
  });

  describe("Query key integration", () => {
    it("should use the correct query key from the factory", () => {
      const userId = "user-123";
      const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");

      const expectedKey = reactQueryKeys.billableExpenses.byUserId(userId);

      renderHook(
        () => useGetBillableExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      const queries = queryClient.getQueryCache().getAll();
      expect(queries[0].queryKey).toEqual(expectedKey);
    });
  });
});