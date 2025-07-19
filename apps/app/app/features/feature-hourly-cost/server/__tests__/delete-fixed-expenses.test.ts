/**
 * Tests for delete fixed expenses mutation hook
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createTestQueryClient, createQueryWrapper, mockData, mockResponses } from "@repo/design-system/lib/test-utils";
import { setupReactQueryTesting } from "@repo/design-system/lib/test-setup";
import { useDeleteFixedExpenses } from "../delete-fixed-expenses";

// Mock the RPC client
const mockClient = {
  api: {
    expenses: {
      "fixed-costs": {
        ":userId": {
          ":id": {
            $delete: jest.fn(),
          },
        },
      },
    },
  },
};

jest.mock("@repo/design-system/lib/rpc", () => ({
  client: mockClient,
}));

// Mock translations
jest.mock("@/utils/translations", () => ({
  getTranslations: () => ({
    validation: {
      error: {
        "delete-failed": "Failed to delete expense",
      },
    },
  }),
}));

// Setup testing environment
setupReactQueryTesting();

describe("useDeleteFixedExpenses", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  it("should delete fixed expense successfully", async () => {
    const userId = "user-123";
    const expenseId = "expense-1";

    mockClient.api.expenses["fixed-costs"][":userId"][":id"].$delete.mockResolvedValue(
      mockResponses.success({ id: expenseId })
    );

    const { result } = renderHook(
      () => useDeleteFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Initially idle
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);

    // Trigger mutation
    act(() => {
      result.current.mutate({
        param: { userId, id: expenseId }
      });
    });

    // Should be loading
    expect(result.current.isPending).toBe(true);

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeDefined();
    expect(mockClient.api.expenses["fixed-costs"][":userId"][":id"].$delete).toHaveBeenCalledWith({
      param: { userId, id: expenseId },
    });
  });

  it("should handle deletion errors", async () => {
    const userId = "user-123";
    const expenseId = "expense-1";

    mockClient.api.expenses["fixed-costs"][":userId"][":id"].$delete.mockResolvedValue(
      mockResponses.error(404, "Not Found")
    );

    const { result } = renderHook(
      () => useDeleteFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Trigger mutation
    act(() => {
      result.current.mutate({
        param: { userId, id: expenseId }
      });
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Failed to delete expense");
  });

  it("should handle optimistic updates correctly", async () => {
    const userId = "user-123";
    const expenseId = "expense-1";
    const existingExpenses = [
      mockData.fixedExpense({ id: "expense-1", name: "To Delete" }),
      mockData.fixedExpense({ id: "expense-2", name: "To Keep" }),
    ];
    const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    // Pre-populate cache
    queryClient.setQueryData(queryKey, existingExpenses);

    // Mock successful response with delay
    mockClient.api.expenses["fixed-costs"][":userId"][":id"].$delete.mockImplementation(
      () => new Promise(resolve =>
        setTimeout(() => resolve(mockResponses.success({ id: expenseId })), 100)
      )
    );

    const { result } = renderHook(
      () => useDeleteFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Trigger mutation
    act(() => {
      result.current.mutate({
        param: { userId, id: expenseId }
      });
    });

    // Check optimistic update - should immediately remove from cache
    const cacheData = queryClient.getQueryData(queryKey) as any[];
    expect(cacheData).toHaveLength(1);
    expect(cacheData[0].id).toBe("expense-2");
    expect(cacheData[0].name).toBe("To Keep");

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("should rollback optimistic updates on error", async () => {
    const userId = "user-123";
    const expenseId = "expense-1";
    const existingExpenses = [
      mockData.fixedExpense({ id: "expense-1", name: "To Delete" }),
      mockData.fixedExpense({ id: "expense-2", name: "To Keep" }),
    ];
    const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    // Pre-populate cache
    queryClient.setQueryData(queryKey, existingExpenses);

    // Mock error response
    mockClient.api.expenses["fixed-costs"][":userId"][":id"].$delete.mockResolvedValue(
      mockResponses.error(500, "Server Error")
    );

    const { result } = renderHook(
      () => useDeleteFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Trigger mutation
    act(() => {
      result.current.mutate({
        param: { userId, id: expenseId }
      });
    });

    // Check optimistic update
    let cacheData = queryClient.getQueryData(queryKey) as any[];
    expect(cacheData).toHaveLength(1);

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Cache should be rolled back to original state
    cacheData = queryClient.getQueryData(queryKey) as any[];
    expect(cacheData).toEqual(existingExpenses);
  });

  it("should invalidate queries after successful deletion", async () => {
    const userId = "user-123";
    const expenseId = "expense-1";
    const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    // Pre-populate cache
    queryClient.setQueryData(queryKey, [mockData.fixedExpense({ id: expenseId })]);

    mockClient.api.expenses["fixed-costs"][":userId"][":id"].$delete.mockResolvedValue(
      mockResponses.success({ id: expenseId })
    );

    const { result } = renderHook(
      () => useDeleteFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Spy on invalidateQueries
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    // Trigger mutation
    act(() => {
      result.current.mutate({
        param: { userId, id: expenseId }
      });
    });

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have invalidated the correct query
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey });
  });

  it("should handle network errors", async () => {
    const userId = "user-123";
    const expenseId = "expense-1";

    mockClient.api.expenses["fixed-costs"][":userId"][":id"].$delete.mockRejectedValue(
      new Error("Network timeout")
    );

    const { result } = renderHook(
      () => useDeleteFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Trigger mutation
    act(() => {
      result.current.mutate({
        param: { userId, id: expenseId }
      });
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Network timeout");
  });

  it("should handle response with success: false", async () => {
    const userId = "user-123";
    const expenseId = "expense-1";

    mockClient.api.expenses["fixed-costs"][":userId"][":id"].$delete.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, error: "Cannot delete" }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const { result } = renderHook(
      () => useDeleteFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Trigger mutation
    act(() => {
      result.current.mutate({
        param: { userId, id: expenseId }
      });
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Failed to delete expense");
  });

  it("should not affect other expenses during optimistic update", async () => {
    const userId = "user-123";
    const expenseToDelete = "expense-1";
    const existingExpenses = [
      mockData.fixedExpense({ id: "expense-1", name: "To Delete" }),
      mockData.fixedExpense({ id: "expense-2", name: "To Keep 1" }),
      mockData.fixedExpense({ id: "expense-3", name: "To Keep 2" }),
    ];
    const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    // Pre-populate cache
    queryClient.setQueryData(queryKey, existingExpenses);

    mockClient.api.expenses["fixed-costs"][":userId"][":id"].$delete.mockResolvedValue(
      mockResponses.success({ id: expenseToDelete })
    );

    const { result } = renderHook(
      () => useDeleteFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Trigger mutation
    act(() => {
      result.current.mutate({
        param: { userId, id: expenseToDelete }
      });
    });

    // Check optimistic update - should only remove the target expense
    const cacheData = queryClient.getQueryData(queryKey) as any[];
    expect(cacheData).toHaveLength(2);
    expect(cacheData.find((e: any) => e.id === "expense-1")).toBeUndefined();
    expect(cacheData.find((e: any) => e.id === "expense-2")).toBeDefined();
    expect(cacheData.find((e: any) => e.id === "expense-3")).toBeDefined();
  });
});