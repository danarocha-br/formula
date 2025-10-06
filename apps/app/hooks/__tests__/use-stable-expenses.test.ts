import type { QueryClient } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpenseItem } from "../../app/types";
import { createQueryWrapper, createTestQueryClient } from "../../test-utils";
import { useStableExpenses } from "../use-stable-expenses";

// Mock the get-fixed-expenses hook
vi.mock("../../app/features/feature-hourly-cost/server/get-fixed-expenses", () => ({
  useGetFixedExpenses: vi.fn(),
}));

import { useGetFixedExpenses } from "../../app/features/feature-hourly-cost/server/get-fixed-expenses";

const mockUseGetFixedExpenses = vi.mocked(useGetFixedExpenses);

describe("useStableExpenses", () => {
  let queryClient: QueryClient;

  const createMockExpense = (overrides: Partial<ExpenseItem> = {}): ExpenseItem => ({
    id: 1,
    name: "Test Expense",
    userId: "test-user",
    amount: 100,
    rank: 1,
    period: "monthly",
    category: "rent",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("basic functionality", () => {
    it("should return empty array when no data", () => {
      mockUseGetFixedExpenses.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      } as any);

      const { result } = renderHook(
        () => useStableExpenses({ userId: "test-user" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.expenses).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it("should return loading state", () => {
      mockUseGetFixedExpenses.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        isSuccess: false,
        isFetching: true,
      } as any);

      const { result } = renderHook(
        () => useStableExpenses({ userId: "test-user" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.expenses).toEqual([]);
    });

    it("should return error state", () => {
      const mockError = new Error("Failed to fetch");
      mockUseGetFixedExpenses.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: mockError,
        isSuccess: false,
        isFetching: false,
      } as any);

      const { result } = renderHook(
        () => useStableExpenses({ userId: "test-user" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
      expect(result.current.expenses).toEqual([]);
    });
  });

  describe("sorting functionality", () => {
    it("should sort expenses by rank in ascending order", () => {
      const expenses = [
        createMockExpense({ id: 1, rank: 3, name: "Third" }),
        createMockExpense({ id: 2, rank: 1, name: "First" }),
        createMockExpense({ id: 3, rank: 2, name: "Second" }),
      ];

      mockUseGetFixedExpenses.mockReturnValue({
        data: expenses,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      } as any);

      const { result } = renderHook(
        () => useStableExpenses({ userId: "test-user" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.expenses).toHaveLength(3);
      expect(result.current.expenses[0].name).toBe("First");
      expect(result.current.expenses[1].name).toBe("Second");
      expect(result.current.expenses[2].name).toBe("Third");
    });

    it("should handle undefined ranks by placing them at the end", () => {
      const expenses = [
        createMockExpense({ id: 1, rank: 2, name: "Second" }),
        createMockExpense({ id: 2, rank: undefined as any, name: "Last" }),
        createMockExpense({ id: 3, rank: 1, name: "First" }),
      ];

      mockUseGetFixedExpenses.mockReturnValue({
        data: expenses,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      } as any);

      const { result } = renderHook(
        () => useStableExpenses({ userId: "test-user" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.expenses).toHaveLength(3);
      expect(result.current.expenses[0].name).toBe("First");
      expect(result.current.expenses[1].name).toBe("Second");
      expect(result.current.expenses[2].name).toBe("Last");
    });

    it("should use ID as secondary sort when ranks are equal", () => {
      const expenses = [
        createMockExpense({ id: 3, rank: 1, name: "Third by ID" }),
        createMockExpense({ id: 1, rank: 1, name: "First by ID" }),
        createMockExpense({ id: 2, rank: 1, name: "Second by ID" }),
      ];

      mockUseGetFixedExpenses.mockReturnValue({
        data: expenses,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      } as any);

      const { result } = renderHook(
        () => useStableExpenses({ userId: "test-user" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.expenses).toHaveLength(3);
      expect(result.current.expenses[0].name).toBe("First by ID");
      expect(result.current.expenses[1].name).toBe("Second by ID");
      expect(result.current.expenses[2].name).toBe("Third by ID");
    });
  });

  describe("reference stability", () => {
    it("should return the same reference when data hasn't changed", () => {
      const expenses = [
        createMockExpense({ id: 1, rank: 1, name: "Test" }),
      ];

      mockUseGetFixedExpenses.mockReturnValue({
        data: expenses,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      } as any);

      const { result, rerender } = renderHook(
        () => useStableExpenses({ userId: "test-user" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      const firstResult = result.current.expenses;

      // Rerender with the same data
      rerender();

      const secondResult = result.current.expenses;

      // Should be the same reference
      expect(firstResult).toBe(secondResult);
    });

    it("should return a new reference when data changes", () => {
      const initialExpenses = [
        createMockExpense({ id: 1, rank: 1, name: "Test" }),
      ];

      mockUseGetFixedExpenses.mockReturnValue({
        data: initialExpenses,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      } as any);

      const { result, rerender } = renderHook(
        () => useStableExpenses({ userId: "test-user" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      const firstResult = result.current.expenses;

      // Update with new data
      const updatedExpenses = [
        createMockExpense({ id: 1, rank: 1, name: "Updated Test" }),
      ];

      mockUseGetFixedExpenses.mockReturnValue({
        data: updatedExpenses,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      } as any);

      rerender();

      const secondResult = result.current.expenses;

      // Should be a different reference
      expect(firstResult).not.toBe(secondResult);
      expect(secondResult[0].name).toBe("Updated Test");
    });
  });

  describe("edge cases", () => {
    it("should handle null data gracefully", () => {
      mockUseGetFixedExpenses.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      } as any);

      const { result } = renderHook(
        () => useStableExpenses({ userId: "test-user" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.expenses).toEqual([]);
    });

    it("should handle non-array data gracefully", () => {
      mockUseGetFixedExpenses.mockReturnValue({
        data: "invalid data" as any,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      } as any);

      const { result } = renderHook(
        () => useStableExpenses({ userId: "test-user" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.expenses).toEqual([]);
    });

    it("should handle empty array", () => {
      mockUseGetFixedExpenses.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      } as any);

      const { result } = renderHook(
        () => useStableExpenses({ userId: "test-user" }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      expect(result.current.expenses).toEqual([]);
    });
  });

  describe("performance", () => {
    it("should not recalculate when userId changes but data is the same", () => {
      const expenses = [
        createMockExpense({ id: 1, rank: 1, name: "Test" }),
      ];

      mockUseGetFixedExpenses.mockReturnValue({
        data: expenses,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      } as any);

      const { result, rerender } = renderHook(
        ({ userId }) => useStableExpenses({ userId }),
        {
          wrapper: createQueryWrapper(queryClient),
          initialProps: { userId: "user1" }
        }
      );

      const firstResult = result.current.expenses;

      // Change userId but keep same data
      rerender({ userId: "user2" });

      const secondResult = result.current.expenses;

      // Should be the same reference since data didn't change
      expect(firstResult).toBe(secondResult);
    });
  });
});