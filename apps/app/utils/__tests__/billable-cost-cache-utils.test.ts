import { QueryClient } from "@tanstack/react-query";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  billableCostCacheUtils,
  billableCostSpecializedUtils,
  type BillableCostItem,
} from "../query-cache-utils";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";

// Mock console methods to avoid noise in tests
vi.mock("console", () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
}));

describe("Billable Cost Cache Utilities", () => {
  let queryClient: QueryClient;
  const userId = "test-user-123";
  const mockBillableCost: BillableCostItem = {
    id: 1,
    userId,
    workDays: 5,
    hoursPerDay: 8,
    holidaysDays: 12,
    vacationsDays: 20,
    sickLeaveDays: 5,
    monthlySalary: 5000,
    taxes: 25,
    fees: 5,
    margin: 20,
    billableHours: 1800,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe("Basic Cache Operations", () => {
    it("should update billable cost object in cache", () => {
      billableCostCacheUtils.updateObject(queryClient, userId, mockBillableCost);

      const result = billableCostCacheUtils.getCurrentObject(queryClient, userId);
      expect(result).toEqual(mockBillableCost);
    });

    it("should replace billable cost object in cache", () => {
      const initialData = { ...mockBillableCost, monthlySalary: 4000 };
      billableCostCacheUtils.updateObject(queryClient, userId, initialData);

      const updatedData = { ...mockBillableCost, monthlySalary: 6000 };
      billableCostCacheUtils.replaceObject(queryClient, userId, updatedData);

      const result = billableCostCacheUtils.getCurrentObject(queryClient, userId);
      expect(result?.monthlySalary).toBe(6000);
    });

    it("should check if billable cost object exists", () => {
      expect(billableCostCacheUtils.objectExists(queryClient, userId)).toBe(false);

      billableCostCacheUtils.updateObject(queryClient, userId, mockBillableCost);
      expect(billableCostCacheUtils.objectExists(queryClient, userId)).toBe(true);
    });

    it("should return null for non-existent billable cost", () => {
      const result = billableCostCacheUtils.getCurrentObject(queryClient, userId);
      expect(result).toBeNull();
    });
  });

  describe("Form Data Transformation", () => {
    const mockFormData = {
      work_days: 5,
      hours_per_day: 8,
      holiday_days: 12,
      vacation_days: 20,
      sick_leave: 5,
      monthly_salary: 5000,
      taxes: 25,
      fees: 5,
      margin: 20,
    };

    it("should update cache from form data", () => {
      const calculatedBillableHours = 1800;

      billableCostSpecializedUtils.updateFromFormData(
        queryClient,
        userId,
        mockFormData,
        calculatedBillableHours
      );

      const result = billableCostCacheUtils.getCurrentObject(queryClient, userId);
      expect(result).toBeTruthy();
      expect(result?.workDays).toBe(5);
      expect(result?.hoursPerDay).toBe(8);
      expect(result?.billableHours).toBe(1800);
    });

    it("should transform cache data to form format", () => {
      const formData = billableCostSpecializedUtils.transformToFormData(mockBillableCost);

      expect(formData).toEqual({
        work_days: 5,
        hours_per_day: 8,
        holiday_days: 12,
        vacation_days: 20,
        sick_leave: 5,
        monthly_salary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
      });
    });

    it("should transform server response to cache format", () => {
      const serverData = {
        id: 1,
        userId,
        workDays: 5,
        hoursPerDay: 8,
        holidaysDays: 12,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1800,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      const result = billableCostSpecializedUtils.transformServerResponse(serverData);
      expect(result).toEqual(mockBillableCost);
    });
  });

  describe("Optimistic Updates", () => {
    it("should create optimistic update and return context", () => {
      // Set initial data
      billableCostCacheUtils.updateObject(queryClient, userId, mockBillableCost);

      const partialUpdate = { monthlySalary: 6000 };
      const context = billableCostSpecializedUtils.createOptimisticUpdate(
        queryClient,
        userId,
        partialUpdate
      );

      expect(context.previousData).toEqual(mockBillableCost);
      expect(context.queryKey).toEqual(reactQueryKeys.billableExpenses.byUserId(userId));

      const updatedData = billableCostCacheUtils.getCurrentObject(queryClient, userId);
      expect(updatedData?.monthlySalary).toBe(6000);
    });

    it("should rollback optimistic update on error", () => {
      // Set initial data
      billableCostCacheUtils.updateObject(queryClient, userId, mockBillableCost);

      // Create optimistic update
      const context = billableCostSpecializedUtils.createOptimisticUpdate(
        queryClient,
        userId,
        { monthlySalary: 6000 }
      );

      // Verify optimistic update applied
      let currentData = billableCostCacheUtils.getCurrentObject(queryClient, userId);
      expect(currentData?.monthlySalary).toBe(6000);

      // Rollback
      billableCostSpecializedUtils.rollbackOptimisticUpdate(
        queryClient,
        userId,
        context.previousData
      );

      // Verify rollback
      currentData = billableCostCacheUtils.getCurrentObject(queryClient, userId);
      expect(currentData?.monthlySalary).toBe(5000);
    });

    it("should handle rollback when no previous data exists", () => {
      // Create optimistic update without initial data
      const context = billableCostSpecializedUtils.createOptimisticUpdate(
        queryClient,
        userId,
        { monthlySalary: 6000 }
      );

      expect(context.previousData).toBeNull();

      // Rollback should clear the cache
      billableCostSpecializedUtils.rollbackOptimisticUpdate(
        queryClient,
        userId,
        context.previousData
      );

      const result = billableCostCacheUtils.getCurrentObject(queryClient, userId);
      expect(result).toBeNull();
    });
  });

  describe("Validation", () => {
    it("should validate correct form data", () => {
      const validFormData = {
        work_days: 5,
        hours_per_day: 8,
        holiday_days: 12,
        vacation_days: 20,
        sick_leave: 5,
        monthly_salary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
      };

      const errors = billableCostSpecializedUtils.validateFormData(validFormData);
      expect(errors).toHaveLength(0);
    });

    it("should return validation errors for invalid data", () => {
      const invalidFormData = {
        work_days: 0, // Invalid: less than 1
        hours_per_day: 25, // Invalid: more than 24
        holiday_days: -1, // Invalid: negative
        vacation_days: 400, // Invalid: more than 365
        sick_leave: 200, // Invalid: more than 180
        monthly_salary: -1000, // Invalid: negative
        taxes: 150, // Invalid: more than 100
        fees: -5, // Invalid: negative
        margin: 110, // Invalid: more than 100
      };

      const errors = billableCostSpecializedUtils.validateFormData(invalidFormData);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain("Work days must be between 1 and 7");
      expect(errors).toContain("Hours per day must be between 1 and 24");
      expect(errors).toContain("Holiday days must be between 0 and 365");
      expect(errors).toContain("Vacation days must be between 0 and 365");
      expect(errors).toContain("Sick leave days must be between 0 and 180");
      expect(errors).toContain("Monthly salary cannot be negative");
      expect(errors).toContain("Taxes must be between 0 and 100 percent");
      expect(errors).toContain("Fees must be between 0 and 100 percent");
      expect(errors).toContain("Margin must be between 0 and 100 percent");
    });
  });

  describe("Calculations", () => {
    it("should calculate billable hours correctly", () => {
      const formData = {
        work_days: 5,
        hours_per_day: 8,
        holiday_days: 12,
        vacation_days: 20,
        sick_leave: 5,
      };

      const billableHours = billableCostSpecializedUtils.calculateBillableHours(formData);

      // Expected calculation:
      // Work days per year: 5 * 52 = 260
      // Time off: 12 + 20 + 5 = 37
      // Actual work days: 260 - 37 = 223
      // Billable hours: 223 * 8 = 1784
      expect(billableHours).toBe(1784);
    });

    it("should handle edge cases in billable hours calculation", () => {
      const formData = {
        work_days: 1,
        hours_per_day: 1,
        holiday_days: 100,
        vacation_days: 100,
        sick_leave: 100,
      };

      const billableHours = billableCostSpecializedUtils.calculateBillableHours(formData);

      // Work days per year: 1 * 52 = 52
      // Time off: 100 + 100 + 100 = 300
      // Actual work days: max(0, 52 - 300) = 0
      // Billable hours: max(0, 0 * 1) = 0
      expect(billableHours).toBe(0);
    });
  });

  describe("Utility Functions", () => {
    it("should create complete billable cost item from form data", () => {
      const formData = {
        work_days: 5,
        hours_per_day: 8,
        holiday_days: 12,
        vacation_days: 20,
        sick_leave: 5,
        monthly_salary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
      };

      const result = billableCostSpecializedUtils.createBillableCostItem(userId, formData);

      expect(result.userId).toBe(userId);
      expect(result.workDays).toBe(5);
      expect(result.hoursPerDay).toBe(8);
      expect(result.billableHours).toBe(1784); // Calculated value
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
    });

    it("should merge with existing data when creating billable cost item", () => {
      const formData = {
        work_days: 5,
        hours_per_day: 8,
        holiday_days: 12,
        vacation_days: 20,
        sick_leave: 5,
        monthly_salary: 6000, // Updated value
        taxes: 25,
        fees: 5,
        margin: 20,
      };

      const result = billableCostSpecializedUtils.createBillableCostItem(
        userId,
        formData,
        mockBillableCost
      );

      expect(result.id).toBe(mockBillableCost.id); // Preserved from existing
      expect(result.createdAt).toBe(mockBillableCost.createdAt); // Preserved from existing
      expect(result.monthlySalary).toBe(6000); // Updated from form
      expect(result.updatedAt).not.toBe(mockBillableCost.updatedAt); // Should be updated
    });

    it("should check if billable cost exists", () => {
      expect(billableCostSpecializedUtils.billableCostExists(queryClient, userId)).toBe(false);

      billableCostCacheUtils.updateObject(queryClient, userId, mockBillableCost);
      expect(billableCostSpecializedUtils.billableCostExists(queryClient, userId)).toBe(true);
    });

    it("should get current billable cost", () => {
      expect(billableCostSpecializedUtils.getCurrentBillableCost(queryClient, userId)).toBeNull();

      billableCostCacheUtils.updateObject(queryClient, userId, mockBillableCost);
      const result = billableCostSpecializedUtils.getCurrentBillableCost(queryClient, userId);
      expect(result).toEqual(mockBillableCost);
    });
  });

  describe("Error Handling", () => {
    it("should handle cache errors gracefully", () => {
      // Mock a scenario where setQueryData throws an error
      const originalSetQueryData = queryClient.setQueryData;
      queryClient.setQueryData = vi.fn().mockImplementation(() => {
        throw new Error("Cache error");
      });

      expect(() => {
        billableCostCacheUtils.updateObject(queryClient, userId, mockBillableCost);
      }).toThrow("Cache update failed");

      // Restore original method
      queryClient.setQueryData = originalSetQueryData;
    });

    it("should handle missing query data gracefully", () => {
      // Test getting data when cache is empty
      const result = billableCostSpecializedUtils.getCurrentBillableCost(queryClient, userId);
      expect(result).toBeNull();

      const exists = billableCostSpecializedUtils.billableCostExists(queryClient, userId);
      expect(exists).toBe(false);
    });
  });
});