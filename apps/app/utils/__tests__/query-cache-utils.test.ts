import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpenseItem } from "../../app/types";
import {
  type CacheUpdateError,
  cacheValidationUtils,
  expenseCacheUtils,
  optimisticUpdateUtils,
} from "../query-cache-utils";

// Mock the react-query-keys module
vi.mock("@repo/database/cache-keys/react-query-keys", () => ({
  reactQueryKeys: {
    fixedExpenses: {
      byUserId: (userId: string) => ["fixed-expenses-list", userId],
    },
  },
}));

describe("Query Cache Utils", () => {
  let queryClient: QueryClient;
  const mockUserId = "test-user-123";

  const createMockExpense = (overrides: Partial<ExpenseItem> = {}): ExpenseItem => ({
    id: 1,
    name: "Test Expense",
    userId: mockUserId,
    amount: 100,
    rank: 1,
    period: "monthly" as const,
    category: "rent",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("expenseCacheUtils", () => {
    describe("addExpense", () => {
      it("should add a new expense to empty cache", () => {
        const newExpense = createMockExpense();

        expenseCacheUtils.addExpense(queryClient, mockUserId, newExpense);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(newExpense);
      });

      it("should add expense to existing cache and maintain sort order", () => {
        const expense1 = createMockExpense({ id: 1, rank: 2 });
        const expense2 = createMockExpense({ id: 2, rank: 1 });

        expenseCacheUtils.addExpense(queryClient, mockUserId, expense1);
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense2);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe(2); // Should be first due to rank 1
        expect(result[1].id).toBe(1); // Should be second due to rank 2
      });

      it("should replace existing expense with same ID", () => {
        const originalExpense = createMockExpense({ id: 1, name: "Original" });
        const updatedExpense = createMockExpense({ id: 1, name: "Updated" });

        expenseCacheUtils.addExpense(queryClient, mockUserId, originalExpense);
        expenseCacheUtils.addExpense(queryClient, mockUserId, updatedExpense);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Updated");
      });

      it("should handle cache errors gracefully", () => {
        // Mock setQueryData to throw an error
        const originalSetQueryData = queryClient.setQueryData;
        queryClient.setQueryData = vi.fn().mockImplementation(() => {
          throw new Error("Cache error");
        });

        const newExpense = createMockExpense();

        expect(() => {
          expenseCacheUtils.addExpense(queryClient, mockUserId, newExpense);
        }).toThrow();

        // Restore original method
        queryClient.setQueryData = originalSetQueryData;
      });
    });

    describe("updateExpense", () => {
      it("should update existing expense", () => {
        const originalExpense = createMockExpense({ id: 1, name: "Original" });
        const updatedExpense = createMockExpense({ id: 1, name: "Updated" });

        expenseCacheUtils.addExpense(queryClient, mockUserId, originalExpense);
        expenseCacheUtils.updateExpense(queryClient, mockUserId, updatedExpense);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result[0].name).toBe("Updated");
      });

      it("should throw error when updating non-existent expense", () => {
        const nonExistentExpense = createMockExpense({ id: 999 });

        expect(() => {
          expenseCacheUtils.updateExpense(queryClient, mockUserId, nonExistentExpense);
        }).toThrow();
      });

      it("should maintain sort order after update", () => {
        const expense1 = createMockExpense({ id: 1, rank: 1 });
        const expense2 = createMockExpense({ id: 2, rank: 2 });

        expenseCacheUtils.addExpense(queryClient, mockUserId, expense1);
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense2);

        // Update expense2 to have rank 0 (should move to first position)
        const updatedExpense2 = createMockExpense({ id: 2, rank: 0 });
        expenseCacheUtils.updateExpense(queryClient, mockUserId, updatedExpense2);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result[0].id).toBe(2); // Should be first now
        expect(result[1].id).toBe(1);
      });
    });

    describe("removeExpense", () => {
      it("should remove expense from cache", () => {
        const expense1 = createMockExpense({ id: 1 });
        const expense2 = createMockExpense({ id: 2 });

        expenseCacheUtils.addExpense(queryClient, mockUserId, expense1);
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense2);

        expenseCacheUtils.removeExpense(queryClient, mockUserId, 1);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
      });

      it("should handle removing non-existent expense gracefully", () => {
        const expense1 = createMockExpense({ id: 1 });
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense1);

        // Should not throw error
        expenseCacheUtils.removeExpense(queryClient, mockUserId, 999);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
      });
    });

    describe("removeMultipleExpenses", () => {
      it("should remove multiple expenses", () => {
        const expenses = [
          createMockExpense({ id: 1 }),
          createMockExpense({ id: 2 }),
          createMockExpense({ id: 3 }),
        ];

        expenses.forEach(expense => {
          expenseCacheUtils.addExpense(queryClient, mockUserId, expense);
        });

        expenseCacheUtils.removeMultipleExpenses(queryClient, mockUserId, [1, 3]);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
      });
    });

    describe("reorderExpenses", () => {
      it("should reorder expenses correctly", () => {
        const expenses = [
          createMockExpense({ id: 1, rank: 1 }),
          createMockExpense({ id: 2, rank: 2 }),
          createMockExpense({ id: 3, rank: 3 }),
        ];

        expenses.forEach(expense => {
          expenseCacheUtils.addExpense(queryClient, mockUserId, expense);
        });

        // Reorder: move expense 3 to first position
        const reorderedExpenses = [
          createMockExpense({ id: 3, rank: 1 }),
          createMockExpense({ id: 1, rank: 2 }),
          createMockExpense({ id: 2, rank: 3 }),
        ];

        expenseCacheUtils.reorderExpenses(queryClient, mockUserId, reorderedExpenses);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result[0].id).toBe(3);
        expect(result[1].id).toBe(1);
        expect(result[2].id).toBe(2);
      });
    });

    describe("utility methods", () => {
      it("should check if expense exists", () => {
        const expense = createMockExpense({ id: 1 });
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense);

        expect(expenseCacheUtils.expenseExists(queryClient, mockUserId, 1)).toBe(true);
        expect(expenseCacheUtils.expenseExists(queryClient, mockUserId, 999)).toBe(false);
      });

      it("should get specific expense", () => {
        const expense = createMockExpense({ id: 1, name: "Test" });
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense);

        const result = expenseCacheUtils.getExpense(queryClient, mockUserId, 1);
        expect(result?.name).toBe("Test");

        const notFound = expenseCacheUtils.getExpense(queryClient, mockUserId, 999);
        expect(notFound).toBeUndefined();
      });
    });
  });

  describe("optimisticUpdateUtils", () => {
    describe("createTempId", () => {
      it("should create unique temporary IDs", () => {
        const id1 = optimisticUpdateUtils.createTempId();
        const id2 = optimisticUpdateUtils.createTempId();

        expect(id1).not.toBe(id2);
        expect(id1).toContain("temp");
        expect(id2).toContain("temp");
      });

      it("should use custom prefix", () => {
        const id = optimisticUpdateUtils.createTempId("custom");
        expect(id).toContain("custom");
      });
    });

    describe("createOptimisticExpense", () => {
      it("should create complete expense with temp ID", () => {
        const partialExpense = {
          name: "Test Expense",
          amount: 100,
          rank: 1,
          period: "monthly" as const,
          category: "rent",
        };

        const result = optimisticUpdateUtils.createOptimisticExpense(
          partialExpense,
          mockUserId
        );

        expect(result.id).toBeDefined();
        expect(result.userId).toBe(mockUserId);
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
        expect(result.name).toBe("Test Expense");
      });
    });

    describe("isTempExpense", () => {
      it("should identify temporary expenses", () => {
        const tempExpense = createMockExpense({ id: -1 });
        const realExpense = createMockExpense({ id: 123 });

        expect(optimisticUpdateUtils.isTempExpense(tempExpense)).toBe(true);
        expect(optimisticUpdateUtils.isTempExpense(realExpense)).toBe(false);
      });
    });

    describe("replaceTempExpense", () => {
      it("should replace temporary expense with real one", () => {
        const tempExpense = createMockExpense({ id: -1, name: "Temp" });
        const realExpense = createMockExpense({ id: 123, name: "Real" });

        expenseCacheUtils.addExpense(queryClient, mockUserId, tempExpense);
        optimisticUpdateUtils.replaceTempExpense(queryClient, mockUserId, -1, realExpense);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(123);
        expect(result[0].name).toBe("Real");
      });
    });
  });

  describe("cacheValidationUtils", () => {
    describe("isProperlySorted", () => {
      it("should validate properly sorted expenses", () => {
        const sortedExpenses = [
          createMockExpense({ id: 1, rank: 1 }),
          createMockExpense({ id: 2, rank: 2 }),
          createMockExpense({ id: 3, rank: 3 }),
        ];

        expect(cacheValidationUtils.isProperlysorted(sortedExpenses)).toBe(true);
      });

      it("should detect improperly sorted expenses", () => {
        const unsortedExpenses = [
          createMockExpense({ id: 1, rank: 3 }),
          createMockExpense({ id: 2, rank: 1 }),
          createMockExpense({ id: 3, rank: 2 }),
        ];

        expect(cacheValidationUtils.isProperlysorted(unsortedExpenses)).toBe(false);
      });
    });

    describe("validateExpenses", () => {
      it("should return no errors for valid expenses", () => {
        const validExpenses = [createMockExpense()];
        const errors = cacheValidationUtils.validateExpenses(validExpenses);
        expect(errors).toHaveLength(0);
      });

      it("should detect missing required fields", () => {
        const invalidExpenses = [
          createMockExpense({ name: "" }),
          createMockExpense({ userId: "" }),
          // @ts-ignore - Testing runtime validation
          createMockExpense({ amount: null }),
        ];

        const errors = cacheValidationUtils.validateExpenses(invalidExpenses);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.includes("missing name"))).toBe(true);
        expect(errors.some(error => error.includes("missing userId"))).toBe(true);
        expect(errors.some(error => error.includes("missing amount"))).toBe(true);
      });
    });

    describe("findDuplicates", () => {
      it("should find duplicate expenses", () => {
        const expensesWithDuplicates = [
          createMockExpense({ id: 1 }),
          createMockExpense({ id: 2 }),
          createMockExpense({ id: 1 }), // Duplicate
        ];

        const duplicates = cacheValidationUtils.findDuplicates(expensesWithDuplicates);
        expect(duplicates).toContain(1);
        expect(duplicates).not.toContain(2);
      });

      it("should return empty array when no duplicates", () => {
        const uniqueExpenses = [
          createMockExpense({ id: 1 }),
          createMockExpense({ id: 2 }),
          createMockExpense({ id: 3 }),
        ];

        const duplicates = cacheValidationUtils.findDuplicates(uniqueExpenses);
        expect(duplicates).toHaveLength(0);
      });
    });
  });

  describe("error handling", () => {
    it("should create proper CacheUpdateError", () => {
      const originalError = new Error("Original error");

      try {
        // Force an error by mocking setQueryData to throw
        queryClient.setQueryData = vi.fn().mockImplementation(() => {
          throw originalError;
        });

        expenseCacheUtils.addExpense(queryClient, mockUserId, createMockExpense());
      } catch (error) {
        const cacheError = error as CacheUpdateError;
        expect(cacheError.operation).toBe("add");
        expect(cacheError.userId).toBe(mockUserId);
        expect(cacheError.originalError).toBe(originalError);
      }
    });

    it("should handle missing cache data gracefully", () => {
      // Should not throw when cache is empty
      const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
      expect(result).toEqual([]);
    });
  });
});