/**
 * Example tests demonstrating React Query testing patterns
 * This file shows how to test query and mutation hooks using our test utilities
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import {
  createTestQueryClient,
  createQueryWrapper,
  mockData,
  mockResponses,
  testHelpers,
} from "../lib/test-utils";
import { setupReactQueryTesting, setupMockTimers } from "../lib/test-setup";

// Mock the RPC client
const mockClient = {
  api: {
    expenses: {
      "fixed-costs": {
        $get: jest.fn(),
        $post: jest.fn(),
      },
    },
  },
};

jest.mock("@repo/design-system/lib/rpc", () => ({
  client: mockClient,
}));

// Setup React Query testing environment
setupReactQueryTesting();
setupMockTimers();

describe("React Query Hook Testing Examples", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  describe("Query Hook Testing", () => {
    // Mock implementation of a query hook for testing
    const useGetFixedExpenses = ({ userId }: { userId: string }) => {
      const { useQuery } = require("@tanstack/react-query");
      const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");

      return useQuery({
        queryKey: reactQueryKeys.fixedExpenses.byUserId(userId),
        queryFn: async () => {
          const response = await mockClient.api.expenses["fixed-costs"].$get({
            query: { userId },
          });

          if (!response.ok) {
            throw new Error("Failed to fetch expenses");
          }

          const { data } = await response.json();
          return data;
        },
        enabled: !!userId,
      });
    };

    it("should fetch expenses successfully", async () => {
      const mockExpenses = [mockData.fixedExpense(), mockData.fixedExpense({ id: "2" })];
      mockClient.api.expenses["fixed-costs"].$get.mockResolvedValue(
        mockResponses.success(mockExpenses)
      );

      const { result } = renderHook(
        () => useGetFixedExpenses({ userId: "user-1" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      // Initially loading
      testHelpers.expectQueryToBeLoading(result);

      // Wait for success
      await waitFor(() => {
        testHelpers.expectQueryToBeSuccess(result, mockExpenses);
      });

      expect(mockClient.api.expenses["fixed-costs"].$get).toHaveBeenCalledWith({
        query: { userId: "user-1" },
      });
    });

    it("should handle error states", async () => {
      const errorResponse = mockResponses.error(500, "Server Error");
      mockClient.api.expenses["fixed-costs"].$get.mockResolvedValue(errorResponse);

      const { result } = renderHook(
        () => useGetFixedExpenses({ userId: "user-1" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      // Wait for error
      await waitFor(() => {
        testHelpers.expectQueryToBeError(result);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Failed to fetch expenses");
    });

    it("should not fetch when userId is not provided", () => {
      const { result } = renderHook(
        () => useGetFixedExpenses({ userId: "" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockClient.api.expenses["fixed-costs"].$get).not.toHaveBeenCalled();
    });
  });

  describe("Mutation Hook Testing", () => {
    // Mock implementation of a mutation hook for testing
    const useCreateFixedExpense = () => {
      const { useMutation, useQueryClient } = require("@tanstack/react-query");
      const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
      const queryClient = useQueryClient();

      return useMutation({
        mutationFn: async (newExpense: any) => {
          const response = await mockClient.api.expenses["fixed-costs"].$post({
            json: newExpense,
          });

          if (!response.ok) {
            throw new Error("Failed to create expense");
          }

          return response.json();
        },
        onSuccess: (data, variables) => {
          queryClient.invalidateQueries({
            queryKey: reactQueryKeys.fixedExpenses.byUserId(variables.userId),
          });
        },
      });
    };

    it("should create expense successfully", async () => {
      const newExpense = mockData.fixedExpense();
      const createdExpense = { ...newExpense, id: "new-id" };

      mockClient.api.expenses["fixed-costs"].$post.mockResolvedValue(
        mockResponses.created(createdExpense)
      );

      const { result } = renderHook(
        () => useCreateFixedExpense(),
        { wrapper: createQueryWrapper(queryClient) }
      );

      // Initially idle
      testHelpers.expectMutationToBeIdle(result);

      // Trigger mutation
      result.current.mutate(newExpense);

      // Should be loading
      testHelpers.expectMutationToBeLoading(result);

      // Wait for success
      await waitFor(() => {
        testHelpers.expectMutationToBeSuccess(result);
      });

      expect(mockClient.api.expenses["fixed-costs"].$post).toHaveBeenCalledWith({
        json: newExpense,
      });
    });

    it("should handle mutation errors", async () => {
      const newExpense = mockData.fixedExpense();
      const errorResponse = mockResponses.error(400, "Validation Error");

      mockClient.api.expenses["fixed-costs"].$post.mockResolvedValue(errorResponse);

      const { result } = renderHook(
        () => useCreateFixedExpense(),
        { wrapper: createQueryWrapper(queryClient) }
      );

      // Trigger mutation
      result.current.mutate(newExpense);

      // Wait for error
      await waitFor(() => {
        testHelpers.expectMutationToBeError(result);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Failed to create expense");
    });
  });

  describe("Optimistic Updates Testing", () => {
    it("should handle optimistic updates correctly", async () => {
      const userId = "user-1";
      const existingExpenses = [mockData.fixedExpense({ id: "1" })];
      const newExpense = mockData.fixedExpense({ id: "temp-123", name: "New Expense" });

      // Pre-populate cache
      const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
      queryClient.setQueryData(
        reactQueryKeys.fixedExpenses.byUserId(userId),
        existingExpenses
      );

      // Mock successful response
      mockClient.api.expenses["fixed-costs"].$post.mockResolvedValue(
        mockResponses.created({ ...newExpense, id: "real-id" })
      );

      // Test optimistic update logic here
      // This would require implementing the actual optimistic update hook
      // For brevity, we're showing the testing pattern
    });
  });

  describe("Cache Management Testing", () => {
    it("should invalidate queries correctly", async () => {
      const userId = "user-1";
      const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
      const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

      // Set initial data
      queryClient.setQueryData(queryKey, [mockData.fixedExpense()]);

      // Verify data is in cache
      expect(queryClient.getQueryData(queryKey)).toBeDefined();

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey });

      // Verify invalidation
      const queryState = queryClient.getQueryState(queryKey);
      expect(queryState?.isInvalidated).toBe(true);
    });

    it("should handle cache updates", () => {
      const userId = "user-1";
      const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
      const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

      const initialData = [mockData.fixedExpense({ id: "1" })];
      const updatedData = [
        mockData.fixedExpense({ id: "1", name: "Updated Expense" }),
      ];

      // Set initial data
      queryClient.setQueryData(queryKey, initialData);
      expect(queryClient.getQueryData(queryKey)).toEqual(initialData);

      // Update data
      queryClient.setQueryData(queryKey, updatedData);
      expect(queryClient.getQueryData(queryKey)).toEqual(updatedData);
    });
  });
});