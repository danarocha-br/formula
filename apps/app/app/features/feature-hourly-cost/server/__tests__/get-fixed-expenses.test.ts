/**
 * Tests for fixed expenses query hooks
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createTestQueryClient, createQueryWrapper, mockData, mockResponses } from "../../../../../test-utils";
import { useGetFixedExpenses, getFixedExpenses } from "../get-fixed-expenses";
import { vi } from 'vitest';

// Mock the RPC client
vi.mock("@repo/design-system/lib/rpc", () => ({
  client: {
    api: {
      expenses: {
        "fixed-costs": {
          $get: vi.fn(),
        },
      },
    },
  },
}));

describe("Fixed Expenses Query Hooks", () => {
  let queryClient: QueryClient;
  let mockGet: any;

  beforeEach(async () => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();

    // Get the mocked function
    const { client } = await import("@repo/design-system/lib/rpc");
    mockGet = client.api.expenses["fixed-costs"].$get;
  });

  describe("useGetFixedExpenses", () => {
    it("should fetch fixed expenses successfully", async () => {
      const userId = "user-123";
      const mockExpenses = [
        mockData.fixedExpense({ id: "1", name: "Office Rent" }),
        mockData.fixedExpense({ id: "2", name: "Internet" }),
      ];

      mockGet.mockResolvedValue(
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
      expect(mockGet).toHaveBeenCalledWith({
        query: { userId },
      });
    });

    it("should handle API errors gracefully", async () => {
      const userId = "user-123";

      mockGet.mockResolvedValue(
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
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("getFixedExpenses (server-side)", () => {
    it("should fetch fixed expenses on server", async () => {
      const userId = "user-123";
      const mockExpenses = [mockData.fixedExpense()];

      mockGet.mockResolvedValue(
        mockResponses.success(mockExpenses)
      );

      const result = await getFixedExpenses(userId);

      expect(result).toEqual(mockExpenses);
      expect(mockGet).toHaveBeenCalledWith({
        query: { userId },
      });
    });

    it("should handle server-side errors", async () => {
      const userId = "user-123";

      mockGet.mockResolvedValue(
        mockResponses.error(500, "Server Error")
      );

      await expect(getFixedExpenses(userId)).rejects.toThrow("Failed to fetch fixed expenses");
    });
  });
});