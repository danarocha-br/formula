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

describe("Query Cache Utils - Edge Cases and Error Scenarios", () => {
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

  describe("expenseCacheUtils - Edge Cases", () => {
    describe("addExpense edge cases", () => {
      it("should handle adding expense with duplicate ID", () => {
        const expense1 = createMockExpense({ id: 1, name: "First" });
        const expense2 = createMockExpense({ id: 1, name: "Second" });

        expenseCacheUtils.addExpense(queryClient, mockUserId, expense1);
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense2);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Second"); // Should replace
      });

      it("should handle adding expense with negative ID (optimistic)", () => {
        const optimisticExpense = createMockExpense({ id: -1, name: "Optimistic" });
        const realExpense = createMockExpense({ id: 123, name: "Real" });

        expenseCacheUtils.addExpense(queryClient, mockUserId, optimisticExpense);
        expenseCacheUtils.addExpense(queryClient, mockUserId, realExpense);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(2);
        expect(result.find(e => e.id === -1)).toBeDefined();
        expect(result.find(e => e.id === 123)).toBeDefined();
      });

      it("should handle adding expense with extreme rank values", () => {
        const expenses = [
          createMockExpense({ id: 1, rank: Number.MAX_SAFE_INTEGER }),
          createMockExpense({ id: 2, rank: Number.MIN_SAFE_INTEGER }),
          createMockExpense({ id: 3, rank: 0 }),
        ];

        expenses.forEach(expense => {
          expenseCacheUtils.addExpense(queryClient, mockUserId, expense);
        });

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(3);
        // Should be sorted by rank
        expect(result[0].rank).toBe(Number.MIN_SAFE_INTEGER);
        expect(result[1].rank).toBe(0);
        expect(result[2].rank).toBe(Number.MAX_SAFE_INTEGER);
      });

      it("should handle adding expense with null/undefined values", () => {
        const expenseWithNulls = createMockExpense({
          id: 1,
          // @ts-ignore - Testing runtime behavior
          name: null,
          // @ts-ignore - Testing runtime behavior
          amount: undefined,
        });

        expect(() => {
          expenseCacheUtils.addExpense(queryClient, mockUserId, expenseWithNulls);
        }).not.toThrow();

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
      });

      it("should handle adding expense when cache is corrupted", () => {
        const queryKey = ["fixed-expenses-list", mockUserId];

        // Corrupt the cache with invalid data
        queryClient.setQueryData(queryKey, "invalid data");

        const expense = createMockExpense();

        expect(() => {
          expenseCacheUtils.addExpense(queryClient, mockUserId, expense);
        }).not.toThrow();

        // Should handle gracefully and create new array
        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(expense);
      });
    });

    describe("updateExpense edge cases", () => {
      it("should throw error when updating non-existent expense", () => {
        const nonExistentExpense = createMockExpense({ id: 999 });

        expect(() => {
          expenseCacheUtils.updateExpense(queryClient, mockUserId, nonExistentExpense);
        }).toThrow("Expense with id 999 not found in cache");
      });

      it("should handle updating expense with same data", () => {
        const expense = createMockExpense();
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense);

        // Update with identical data
        expenseCacheUtils.updateExpense(queryClient, mockUserId, expense);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(expense);
      });

      it("should handle updating expense that changes sort order", () => {
        const expenses = [
          createMockExpense({ id: 1, rank: 1, name: "First" }),
          createMockExpense({ id: 2, rank: 2, name: "Second" }),
          createMockExpense({ id: 3, rank: 3, name: "Third" }),
        ];

        expenses.forEach(expense => {
          expenseCacheUtils.addExpense(queryClient, mockUserId, expense);
        });

        // Update second expense to have rank 0 (should move to first)
        const updatedExpense = { ...expenses[1], rank: 0 };
        expenseCacheUtils.updateExpense(queryClient, mockUserId, updatedExpense);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result[0].id).toBe(2); // Should be first now
        expect(result[0].rank).toBe(0);
      });

      it("should handle updating expense when cache is empty", () => {
        const expense = createMockExpense();

        expect(() => {
          expenseCacheUtils.updateExpense(queryClient, mockUserId, expense);
        }).toThrow();
      });
    });

    describe("removeExpense edge cases", () => {
      it("should handle removing non-existent expense gracefully", () => {
        const expense = createMockExpense({ id: 1 });
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense);

        // Remove non-existent expense
        expenseCacheUtils.removeExpense(queryClient, mockUserId, 999);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
      });

      it("should handle removing from empty cache", () => {
        expect(() => {
          expenseCacheUtils.removeExpense(queryClient, mockUserId, 1);
        }).not.toThrow();

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toEqual([]);
      });

      it("should handle removing all expenses one by one", () => {
        const expenses = [
          createMockExpense({ id: 1 }),
          createMockExpense({ id: 2 }),
          createMockExpense({ id: 3 }),
        ];

        expenses.forEach(expense => {
          expenseCacheUtils.addExpense(queryClient, mockUserId, expense);
        });

        // Remove all expenses
        expenseCacheUtils.removeExpense(queryClient, mockUserId, 1);
        expenseCacheUtils.removeExpense(queryClient, mockUserId, 2);
        expenseCacheUtils.removeExpense(queryClient, mockUserId, 3);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toEqual([]);
      });
    });

    describe("removeMultipleExpenses edge cases", () => {
      it("should handle removing with empty ID array", () => {
        const expense = createMockExpense();
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense);

        expenseCacheUtils.removeMultipleExpenses(queryClient, mockUserId, []);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
      });

      it("should handle removing with non-existent IDs", () => {
        const expense = createMockExpense({ id: 1 });
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense);

        expenseCacheUtils.removeMultipleExpenses(queryClient, mockUserId, [999, 888]);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
      });

      it("should handle removing with duplicate IDs", () => {
        const expenses = [
          createMockExpense({ id: 1 }),
          createMockExpense({ id: 2 }),
        ];

        expenses.forEach(expense => {
          expenseCacheUtils.addExpense(queryClient, mockUserId, expense);
        });

        expenseCacheUtils.removeMultipleExpenses(queryClient, mockUserId, [1, 1, 1]);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
      });
    });

    describe("reorderExpenses edge cases", () => {
      it("should handle reordering with empty array", () => {
        const expense = createMockExpense();
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense);

        expenseCacheUtils.reorderExpenses(queryClient, mockUserId, []);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toEqual([]);
      });

      it("should handle reordering with different expense count", () => {
        const expenses = [
          createMockExpense({ id: 1 }),
          createMockExpense({ id: 2 }),
        ];

        expenses.forEach(expense => {
          expenseCacheUtils.addExpense(queryClient, mockUserId, expense);
        });

        // Reorder with only one expense
        const reorderedExpenses = [createMockExpense({ id: 1, rank: 1 })];
        expenseCacheUtils.reorderExpenses(queryClient, mockUserId, reorderedExpenses);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
      });

      it("should handle reordering with expenses that have same rank", () => {
        const expenses = [
          createMockExpense({ id: 1, rank: 1 }),
          createMockExpense({ id: 2, rank: 1 }),
          createMockExpense({ id: 3, rank: 1 }),
        ];

        expenseCacheUtils.reorderExpenses(queryClient, mockUserId, expenses);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(3);
        // Should maintain some consistent order even with same ranks
      });
    });

    describe("replaceAllExpenses edge cases", () => {
      it("should handle replacing with empty array", () => {
        const expense = createMockExpense();
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense);

        expenseCacheUtils.replaceAllExpenses(queryClient, mockUserId, []);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toEqual([]);
      });

      it("should handle replacing empty cache with expenses", () => {
        const expenses = [
          createMockExpense({ id: 1 }),
          createMockExpense({ id: 2 }),
        ];

        expenseCacheUtils.replaceAllExpenses(queryClient, mockUserId, expenses);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(2);
      });

      it("should handle replacing with unsorted expenses", () => {
        const unsortedExpenses = [
          createMockExpense({ id: 1, rank: 3 }),
          createMockExpense({ id: 2, rank: 1 }),
          createMockExpense({ id: 3, rank: 2 }),
        ];

        expenseCacheUtils.replaceAllExpenses(queryClient, mockUserId, unsortedExpenses);

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result[0].rank).toBe(1);
        expect(result[1].rank).toBe(2);
        expect(result[2].rank).toBe(3);
      });
    });
  });

  describe("optimisticUpdateUtils - Edge Cases", () => {
    describe("createTempId edge cases", () => {
      it("should create unique IDs across multiple calls", () => {
        const ids = new Set();
        for (let i = 0; i < 1000; i++) {
          ids.add(optimisticUpdateUtils.createTempId());
        }
        expect(ids.size).toBe(1000); // All should be unique
      });

      it("should handle custom prefix with special characters", () => {
        const id = optimisticUpdateUtils.createTempId("test-prefix_123");
        expect(id).toContain("test-prefix_123");
      });

      it("should handle empty prefix", () => {
        const id = optimisticUpdateUtils.createTempId("");
        expect(typeof id).toBe("number");
        expect(id).toBeLessThan(0);
      });
    });

    describe("createOptimisticExpense edge cases", () => {
      it("should handle partial expense data", () => {
        const partialExpense = {
          name: "Test",
          amount: 100,
          // Missing other required fields
        } as any;

        const result = optimisticUpdateUtils.createOptimisticExpense(
          partialExpense,
          mockUserId
        );

        expect(result.name).toBe("Test");
        expect(result.amount).toBe(100);
        expect(result.userId).toBe(mockUserId);
        expect(result.id).toBeDefined();
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      });

      it("should handle expense with null/undefined values", () => {
        const expenseWithNulls = {
          name: "Test",
          amount: 100,
          category: null,
          period: undefined,
          rank: 1,
        } as any;

        const result = optimisticUpdateUtils.createOptimisticExpense(
          expenseWithNulls,
          mockUserId
        );

        expect(result.name).toBe("Test");
        expect(result.category).toBeNull();
        expect(result.period).toBeUndefined();
      });

      it("should handle expense with extreme values", () => {
        const extremeExpense = {
          name: "A".repeat(1000), // Very long name
          amount: Number.MAX_SAFE_INTEGER,
          category: "rent",
          period: "monthly" as const,
          rank: Number.MIN_SAFE_INTEGER,
        };

        const result = optimisticUpdateUtils.createOptimisticExpense(
          extremeExpense,
          mockUserId
        );

        expect(result.name).toBe("A".repeat(1000));
        expect(result.amount).toBe(Number.MAX_SAFE_INTEGER);
        expect(result.rank).toBe(Number.MIN_SAFE_INTEGER);
      });
    });

    describe("isTempExpense edge cases", () => {
      it("should handle expense with zero ID", () => {
        const expense = createMockExpense({ id: 0 });
        expect(optimisticUpdateUtils.isTempExpense(expense)).toBe(false);
      });

      it("should handle expense with very negative ID", () => {
        const expense = createMockExpense({ id: Number.MIN_SAFE_INTEGER });
        expect(optimisticUpdateUtils.isTempExpense(expense)).toBe(true);
      });

      it("should handle expense with positive ID", () => {
        const expense = createMockExpense({ id: 1 });
        expect(optimisticUpdateUtils.isTempExpense(expense)).toBe(false);
      });
    });

    describe("replaceTempExpense edge cases", () => {
      it("should handle replacing non-existent temp expense", () => {
        const realExpense = createMockExpense({ id: 123 });

        expect(() => {
          optimisticUpdateUtils.replaceTempExpense(
            queryClient,
            mockUserId,
            -999,
            realExpense
          );
        }).not.toThrow();

        // Should add the real expense even if temp wasn't found
        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(123);
      });

      it("should handle replacing temp expense in empty cache", () => {
        const realExpense = createMockExpense({ id: 123 });

        optimisticUpdateUtils.replaceTempExpense(
          queryClient,
          mockUserId,
          -1,
          realExpense
        );

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(123);
      });

      it("should handle replacing temp expense with same ID", () => {
        const tempExpense = createMockExpense({ id: -1 });
        const realExpense = createMockExpense({ id: -1 }); // Same ID

        expenseCacheUtils.addExpense(queryClient, mockUserId, tempExpense);
        optimisticUpdateUtils.replaceTempExpense(
          queryClient,
          mockUserId,
          -1,
          realExpense
        );

        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(realExpense);
      });
    });
  });

  describe("cacheValidationUtils - Edge Cases", () => {
    describe("isProperlySorted edge cases", () => {
      it("should handle empty array", () => {
        expect(cacheValidationUtils.isProperlysorted([])).toBe(true);
      });

      it("should handle single expense", () => {
        const expenses = [createMockExpense()];
        expect(cacheValidationUtils.isProperlysorted(expenses)).toBe(true);
      });

      it("should handle expenses with same rank", () => {
        const expenses = [
          createMockExpense({ id: 1, rank: 1 }),
          createMockExpense({ id: 2, rank: 1 }),
          createMockExpense({ id: 3, rank: 1 }),
        ];
        expect(cacheValidationUtils.isProperlysorted(expenses)).toBe(true);
      });

      it("should handle expenses with negative ranks", () => {
        const expenses = [
          createMockExpense({ id: 1, rank: -3 }),
          createMockExpense({ id: 2, rank: -1 }),
          createMockExpense({ id: 3, rank: 0 }),
        ];
        expect(cacheValidationUtils.isProperlysorted(expenses)).toBe(true);
      });
    });

    describe("validateExpenses edge cases", () => {
      it("should handle empty array", () => {
        const errors = cacheValidationUtils.validateExpenses([]);
        expect(errors).toHaveLength(0);
      });

      it("should detect multiple validation errors in single expense", () => {
        const invalidExpense = {
          id: 1,
          name: "",
          userId: "",
          amount: -100,
          rank: Number.NaN,
          period: "invalid" as any,
          category: "",
          createdAt: "invalid-date",
          updatedAt: "",
        };

        const errors = cacheValidationUtils.validateExpenses([invalidExpense]);
        expect(errors.length).toBeGreaterThan(1);
      });

      it("should handle expenses with null/undefined required fields", () => {
        const expensesWithNulls = [
          {
            ...createMockExpense(),
            name: null,
          } as any,
          {
            ...createMockExpense({ id: 2 }),
            userId: undefined,
          } as any,
          {
            ...createMockExpense({ id: 3 }),
            amount: null,
          } as any,
        ];

        const errors = cacheValidationUtils.validateExpenses(expensesWithNulls);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(error => error.includes("missing name"))).toBe(true);
        expect(errors.some(error => error.includes("missing userId"))).toBe(true);
        expect(errors.some(error => error.includes("missing amount"))).toBe(true);
      });

      it("should handle expenses with extreme values", () => {
        const extremeExpenses = [
          createMockExpense({
            id: Number.MAX_SAFE_INTEGER,
            amount: Number.MAX_SAFE_INTEGER,
            rank: Number.MIN_SAFE_INTEGER,
          }),
        ];

        const errors = cacheValidationUtils.validateExpenses(extremeExpenses);
        expect(errors).toHaveLength(0); // Should be valid
      });
    });

    describe("findDuplicates edge cases", () => {
      it("should handle empty array", () => {
        const duplicates = cacheValidationUtils.findDuplicates([]);
        expect(duplicates).toHaveLength(0);
      });

      it("should handle single expense", () => {
        const expenses = [createMockExpense()];
        const duplicates = cacheValidationUtils.findDuplicates(expenses);
        expect(duplicates).toHaveLength(0);
      });

      it("should handle multiple duplicates of same ID", () => {
        const expenses = [
          createMockExpense({ id: 1 }),
          createMockExpense({ id: 1 }),
          createMockExpense({ id: 1 }),
          createMockExpense({ id: 2 }),
        ];

        const duplicates = cacheValidationUtils.findDuplicates(expenses);
        expect(duplicates).toContain(1);
        expect(duplicates).not.toContain(2);
      });

      it("should handle negative and zero IDs", () => {
        const expenses = [
          createMockExpense({ id: -1 }),
          createMockExpense({ id: -1 }),
          createMockExpense({ id: 0 }),
          createMockExpense({ id: 0 }),
        ];

        const duplicates = cacheValidationUtils.findDuplicates(expenses);
        expect(duplicates).toContain(-1);
        expect(duplicates).toContain(0);
      });
    });
  });

  describe("Error Handling", () => {
    it("should create proper CacheUpdateError with all properties", () => {
      const originalError = new Error("Original error");
      originalError.stack = "Original stack trace";

      try {
        queryClient.setQueryData = vi.fn().mockImplementation(() => {
          throw originalError;
        });

        expenseCacheUtils.addExpense(queryClient, mockUserId, createMockExpense());
      } catch (error) {
        const cacheError = error as CacheUpdateError;
        expect(cacheError.operation).toBe("add");
        expect(cacheError.userId).toBe(mockUserId);
        expect(cacheError.originalError).toBe(originalError);
        expect(cacheError.message).toContain("Cache update failed");
        expect(cacheError.name).toBe("CacheUpdateError");
      }
    });

    it("should handle QueryClient throwing non-Error objects", () => {
      queryClient.setQueryData = vi.fn().mockImplementation(() => {
        throw "String error";
      });

      expect(() => {
        expenseCacheUtils.addExpense(queryClient, mockUserId, createMockExpense());
      }).toThrow();
    });

    it("should handle QueryClient methods being undefined", () => {
      const brokenQueryClient = {} as QueryClient;

      expect(() => {
        expenseCacheUtils.addExpense(brokenQueryClient, mockUserId, createMockExpense());
      }).toThrow();
    });

    it("should handle corrupted cache data gracefully", () => {
      const queryKey = ["fixed-expenses-list", mockUserId];

      // Set various types of corrupted data
      const corruptedDataTypes = [
        null,
        undefined,
        "string",
        123,
        { not: "array" },
        [{ invalid: "expense" }],
      ];

      corruptedDataTypes.forEach((corruptedData, index) => {
        queryClient.setQueryData(queryKey, corruptedData);

        expect(() => {
          const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
          expect(Array.isArray(result)).toBe(true);
        }).not.toThrow();
      });
    });

    it("should handle memory pressure scenarios", () => {
      // Create a large number of expenses to test memory handling
      const largeExpenseArray = Array.from({ length: 10000 }, (_, i) =>
        createMockExpense({ id: i, name: `Expense ${i}` })
      );

      expect(() => {
        expenseCacheUtils.replaceAllExpenses(queryClient, mockUserId, largeExpenseArray);
        const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
        expect(result).toHaveLength(10000);
      }).not.toThrow();
    });

    it("should handle concurrent cache operations", () => {
      const expense1 = createMockExpense({ id: 1, name: "First" });
      const expense2 = createMockExpense({ id: 2, name: "Second" });

      // Simulate concurrent operations
      expect(() => {
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense1);
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense2);
        expenseCacheUtils.updateExpense(queryClient, mockUserId, { ...expense1, name: "Updated" });
        expenseCacheUtils.removeExpense(queryClient, mockUserId, 2);
      }).not.toThrow();

      const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Updated");
    });
  });

  describe("Performance Edge Cases", () => {
    it("should handle sorting large arrays efficiently", () => {
      const largeUnsortedArray = Array.from({ length: 1000 }, (_, i) =>
        createMockExpense({ id: i, rank: Math.floor(Math.random() * 1000) })
      );

      const startTime = performance.now();
      expenseCacheUtils.replaceAllExpenses(queryClient, mockUserId, largeUnsortedArray);
      const result = expenseCacheUtils.getCurrentExpenses(queryClient, mockUserId);
      const endTime = performance.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in reasonable time

      // Verify sorting
      for (let i = 1; i < result.length; i++) {
        expect(result[i].rank).toBeGreaterThanOrEqual(result[i - 1].rank);
      }
    });

    it("should handle frequent cache updates without memory leaks", () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many cache operations
      for (let i = 0; i < 1000; i++) {
        const expense = createMockExpense({ id: i });
        expenseCacheUtils.addExpense(queryClient, mockUserId, expense);

        if (i % 2 === 0) {
          expenseCacheUtils.removeExpense(queryClient, mockUserId, i);
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for this test)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});