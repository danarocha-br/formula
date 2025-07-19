/**
 * Tests for equipment expenses query hooks
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createTestQueryClient, createQueryWrapper, mockData, mockResponses } from "@repo/design-system/lib/test-utils";
import { setupReactQueryTesting } from "@repo/design-system/lib/test-setup";
import { useGetEquipmentExpenses, getEquipmentExpenses } from "../get-equipment-expenses";

// Mock the RPC client
const mockClient = {
  api: {
    expenses: {
      "equipment-costs": {
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

describe("Equipment Expenses Query Hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  describe("useGetEquipmentExpenses", () => {
    it("should fetch equipment expenses successfully", async () => {
      const userId = "user-123";
      const mockExpenses = [
        mockData.equipmentExpense({ id: "1", name: "MacBook Pro" }),
        mockData.equipmentExpense({ id: "2", name: "Monitor" }),
      ];

      mockClient.api.expenses["equipment-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpenses)
      );

      const { result } = renderHook(
        () => useGetEquipmentExpenses({ userId }),
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
      expect(mockClient.api.expenses["equipment-costs"].$get).toHaveBeenCalledWith({
        query: { userId },
      });
    });

    it("should handle API errors gracefully", async () => {
      const userId = "user-123";

      mockClient.api.expenses["equipment-costs"].$get.mockResolvedValue(
        mockResponses.error(403, "Forbidden")
      );

      const { result } = renderHook(
        () => useGetEquipmentExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      // Wait for error
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Failed to fetch equipment expenses");
    });

    it("should not fetch when userId is empty", () => {
      const { result } = renderHook(
        () => useGetEquipmentExpenses({ userId: "" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
      expect(mockClient.api.expenses["equipment-costs"].$get).not.toHaveBeenCalled();
    });

    it("should use correct stale time for equipment expenses", async () => {
      const userId = "user-123";
      const mockExpenses = [mockData.equipmentExpense()];

      mockClient.api.expenses["equipment-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpenses)
      );

      const { result } = renderHook(
        () => useGetEquipmentExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that the query has the correct stale time (10 minutes)
      const query = queryClient.getQueryCache().find(["equipment-expenses-list", userId]);
      expect(query?.options.staleTime).toBe(10 * 60 * 1000);
    });

    it("should handle successful response with success flag", async () => {
      const userId = "user-123";
      const mockExpenses = [mockData.equipmentExpense()];

      // Mock response with success: true
      mockClient.api.expenses["equipment-costs"].$get.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockExpenses }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const { result } = renderHook(
        () => useGetEquipmentExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockExpenses);
    });

    it("should handle response with success: false", async () => {
      const userId = "user-123";

      // Mock response with success: false
      mockClient.api.expenses["equipment-costs"].$get.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: false, error: "Access denied" }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const { result } = renderHook(
        () => useGetEquipmentExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Failed to fetch equipment expenses");
    });
  });

  describe("getEquipmentExpenses (server-side)", () => {
    it("should fetch equipment expenses on server", async () => {
      const userId = "user-123";
      const mockExpenses = [mockData.equipmentExpense()];

      mockClient.api.expenses["equipment-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpenses)
      );

      const result = await getEquipmentExpenses(userId);

      expect(result).toEqual(mockExpenses);
      expect(mockClient.api.expenses["equipment-costs"].$get).toHaveBeenCalledWith({
        query: { userId },
      });
    });

    it("should handle server-side errors", async () => {
      const userId = "user-123";

      mockClient.api.expenses["equipment-costs"].$get.mockResolvedValue(
        mockResponses.error(500, "Server Error")
      );

      await expect(getEquipmentExpenses(userId)).rejects.toThrow("Failed to fetch equipment expenses");
    });

    it("should handle network errors", async () => {
      const userId = "user-123";

      mockClient.api.expenses["equipment-costs"].$get.mockRejectedValue(
        new Error("Network timeout")
      );

      await expect(getEquipmentExpenses(userId)).rejects.toThrow("Network timeout");
    });
  });

  describe("Query key integration", () => {
    it("should use the correct query key from the factory", () => {
      const userId = "user-123";
      const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");

      const expectedKey = reactQueryKeys.equipmentExpenses.byUserId(userId);

      renderHook(
        () => useGetEquipmentExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      const queries = queryClient.getQueryCache().getAll();
      expect(queries[0].queryKey).toEqual(expectedKey);
    });

    it("should enable cache sharing between components", async () => {
      const userId = "user-123";
      const mockExpenses = [mockData.equipmentExpense()];

      mockClient.api.expenses["equipment-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpenses)
      );

      // First hook call
      const { result: result1 } = renderHook(
        () => useGetEquipmentExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second hook call should use cached data
      const { result: result2 } = renderHook(
        () => useGetEquipmentExpenses({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      // Should immediately have data from cache
      expect(result2.current.data).toEqual(mockExpenses);
      expect(result2.current.isLoading).toBe(false);

      // Should only have called the API once
      expect(mockClient.api.expenses["equipment-costs"].$get).toHaveBeenCalledTimes(1);
    });
  });
});