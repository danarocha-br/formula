/**
 * Tests for fixed expenses mutation hooks
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createTestQueryClient, createQueryWrapper, mockData, mockResponses } from "@repo/design-system/lib/test-utils";
import { setupReactQueryTesting } from "@repo/design-system/lib/test-setup";
import { useCreateFixedExpenses } from "../create-fixed-expenses";

// Mock the RPC client
const mockClient = {
  api: {
    expenses: {
      "fixed-costs": {
        $post: jest.fn(),
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
        "create-failed": "Failed to create expense",
      },
    },
  }),
}));

// Setup testing environment
setupReactQueryTesting();

describe("useCreateFixedExpenses", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  it("should create fixed expense successfully", async () => {
    const newExpense = mockData.fixedExpense({ id: undefined });
    const createdExpense = { ...newExpense, id: "new-id" };

    mockClient.api.expenses["fixed-costs"].$post.mockResolvedValue(
      mockResponses.created(createdExpense)
    );

    const { result } = renderHook(
      () => useCreateFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Initially idle
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);

    // Trigger mutation
    act(() => {
      result.current.mutate({ json: newExpense });
    });

    // Should be loading
    expect(result.current.isPending).toBe(true);

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeDefined();
    expect(mockClient.api.expenses["fixed-costs"].$post).toHaveBeenCalledWith({
      json: newExpense,
    });
  });

  it("should handle mutation errors", async () => {
    const newExpense = mockData.fixedExpense({ id: undefined });

    mockClient.api.expenses["fixed-costs"].$post.mockResolvedValue(
      mockResponses.error(400, "Validation Error")
    );

    const { result } = renderHook(
      () => useCreateFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Trigger mutation
    act(() => {
      result.current.mutate({ json: newExpense });
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Failed to create expense");
  });

  it("should handle optimistic updates correctly", async () => {
    const userId = "user-123";
    const existingExpenses = [mockData.fixedExpense({ id: "1" })];
    const newExpense = mockData.fixedExpense({ id: undefined, userId, name: "New Expense" });
    const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    // Pre-populate cache
    queryClient.setQueryData(queryKey, existingExpenses);

    // Mock successful response with delay
    mockClient.api.expenses["fixed-costs"].$post.mockImplementation(
      () => new Promise(resolve =>
        setTimeout(() => resolve(mockResponses.created({ ...newExpense, id: "real-id" })), 100)
      )
    );

    const { result } = renderHook(
      () => useCreateFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Trigger mutation
    act(() => {
      result.current.mutate({ json: newExpense });
    });

    // Check optimistic update - should immediately add to cache
    const cacheData = queryClient.getQueryData(queryKey) as any[];
    expect(cacheData).toHaveLength(2);
    expect(cacheData[1].name).toBe("New Expense");
    expect(cacheData[1].id).toMatch(/^temp-/);

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Cache should be invalidated and refetched
    // Note: In a real scenario, the invalidation would trigger a refetch
  });

  it("should rollback optimistic updates on error", async () => {
    const userId = "user-123";
    const existingExpenses = [mockData.fixedExpense({ id: "1" })];
    const newExpense = mockData.fixedExpense({ id: undefined, userId, name: "New Expense" });
    const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    // Pre-populate cache
    queryClient.setQueryData(queryKey, existingExpenses);

    // Mock error response
    mockClient.api.expenses["fixed-costs"].$post.mockResolvedValue(
      mockResponses.error(500, "Server Error")
    );

    const { result } = renderHook(
      () => useCreateFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Trigger mutation
    act(() => {
      result.current.mutate({ json: newExpense });
    });

    // Check optimistic update
    let cacheData = queryClient.getQueryData(queryKey) as any[];
    expect(cacheData).toHaveLength(2);

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Cache should be rolled back to original state
    cacheData = queryClient.getQueryData(queryKey) as any[];
    expect(cacheData).toEqual(existingExpenses);
  });

  it("should invalidate queries after successful mutation", async () => {
    const userId = "user-123";
    const newExpense = mockData.fixedExpense({ id: undefined, userId });
    const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    // Pre-populate cache
    queryClient.setQueryData(queryKey, [mockData.fixedExpense()]);

    mockClient.api.expenses["fixed-costs"].$post.mockResolvedValue(
      mockResponses.created({ ...newExpense, id: "new-id" })
    );

    const { result } = renderHook(
      () => useCreateFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Spy on invalidateQueries
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    // Trigger mutation
    act(() => {
      result.current.mutate({ json: newExpense });
    });

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have invalidated the correct query
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey });
  });

  it("should handle network errors", async () => {
    const newExpense = mockData.fixedExpense({ id: undefined });

    mockClient.api.expenses["fixed-costs"].$post.mockRejectedValue(
      new Error("Network Error")
    );

    const { result } = renderHook(
      () => useCreateFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Trigger mutation
    act(() => {
      result.current.mutate({ json: newExpense });
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Network Error");
  });

  it("should handle response with success: false", async () => {
    const newExpense = mockData.fixedExpense({ id: undefined });

    mockClient.api.expenses["fixed-costs"].$post.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, error: "Validation failed" }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const { result } = renderHook(
      () => useCreateFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Trigger mutation
    act(() => {
      result.current.mutate({ json: newExpense });
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe("Failed to create expense");
  });

  it("should use correct query key for cache operations", async () => {
    const userId = "user-123";
    const newExpense = mockData.fixedExpense({ id: undefined, userId });
    const { reactQueryKeys } = require("@repo/database/cache-keys/react-query-keys");
    const expectedQueryKey = reactQueryKeys.fixedExpenses.byUserId(userId);

    mockClient.api.expenses["fixed-costs"].$post.mockResolvedValue(
      mockResponses.created({ ...newExpense, id: "new-id" })
    );

    const { result } = renderHook(
      () => useCreateFixedExpenses(),
      { wrapper: createQueryWrapper(queryClient) }
    );

    // Spy on query client methods
    const cancelQueriesSpy = jest.spyOn(queryClient, 'cancelQueries');
    const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

    // Trigger mutation
    act(() => {
      result.current.mutate({ json: newExpense });
    });

    // Should use the correct query key
    expect(cancelQueriesSpy).toHaveBeenCalledWith({ queryKey: expectedQueryKey });
    expect(setQueryDataSpy).toHaveBeenCalledWith(expectedQueryKey, expect.any(Function));
  });
});