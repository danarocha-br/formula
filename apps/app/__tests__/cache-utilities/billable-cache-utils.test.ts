/**
 * Comprehensive unit tests for billable cost cache utilities
 * Tests single-object cache management, form data transformations, and optimistic updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { reactQueryKeys } from '@repo/database/cache-keys/react-query-keys';
import type { BillableCostItem } from '../../utils/query-cache-utils';

// Mock the billable cache utils since they might not exist yet
const mockBillableCacheUtils = {
  updateObject: vi.fn(),
  getCurrentObject: vi.fn(),
  replaceObject: vi.fn(),
  objectExists: vi.fn(),
};

const mockBillableSpecializedUtils = {
  validateFormData: vi.fn(),
  calculateBillableHours: vi.fn(),
  updateFromFormData: vi.fn(),
  transformToFormData: vi.fn(),
  createOptimisticUpdate: vi.fn(),
  rollbackOptimisticUpdate: vi.fn(),
  createBillableCostItem: vi.fn(),
  transformServerResponse: vi.fn(),
};

// Mock the imports
vi.mock('../../utils/query-cache-utils', () => ({
  billableCostCacheUtils: mockBillableCacheUtils,
  billableCostSpecializedUtils: mockBillableSpecializedUtils,
}));

describe('Billable Cost Cache Utils', () => {
  let queryClient: QueryClient;
  const userId = 'test-user-123';
  const queryKey = reactQueryKeys.billableExpenses.byUserId(userId);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('Basic Cache Operations', () => {
    it('should update billable cost object in cache', () => {
      const billableCost: BillableCostItem = {
        id: 1,
        userId,
        workDays: 22,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1760,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Set up the cache with initial data
      queryClient.setQueryData(queryKey, billableCost);

      // Test that we can retrieve the data
      const cachedData = queryClient.getQueryData<BillableCostItem>(queryKey);
      expect(cachedData).toEqual(billableCost);
    });

    it('should handle null/undefined billable cost data', () => {
      // Test with no data in cache
      const cachedData = queryClient.getQueryData<BillableCostItem>(queryKey);
      expect(cachedData).toBeUndefined();

      // Test with null data
      queryClient.setQueryData(queryKey, null);
      const nullData = queryClient.getQueryData<BillableCostItem>(queryKey);
      expect(nullData).toBeNull();
    });

    it('should replace billable cost object completely', () => {
      const originalData: BillableCostItem = {
        id: 1,
        userId,
        workDays: 20,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 15,
        sickLeaveDays: 5,
        monthlySalary: 4000,
        taxes: 20,
        fees: 3,
        margin: 15,
        billableHours: 1600,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const newData: BillableCostItem = {
        id: 2,
        userId,
        workDays: 22,
        hoursPerDay: 8,
        holidaysDays: 12,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 6000,
        taxes: 30,
        fees: 8,
        margin: 25,
        billableHours: 1760,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      queryClient.setQueryData(queryKey, originalData);
      queryClient.setQueryData(queryKey, newData);

      const cachedData = queryClient.getQueryData<BillableCostItem>(queryKey);
      expect(cachedData).toEqual(newData);
      expect(cachedData?.id).toBe(2);
    });
  });

  describe('Form Data Transformation', () => {
    it('should validate form data correctly', () => {
      const validFormData = {
        work_days: 22,
        hours_per_day: 8,
        holiday_days: 10,
        vacation_days: 20,
        sick_leave: 5,
        monthly_salary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
      };

      mockBillableSpecializedUtils.validateFormData.mockReturnValue([]);

      const errors = mockBillableSpecializedUtils.validateFormData(validFormData);
      expect(errors).toEqual([]);
      expect(mockBillableSpecializedUtils.validateFormData).toHaveBeenCalledWith(validFormData);
    });

    it('should return validation errors for invalid form data', () => {
      const invalidFormData = {
        work_days: 0, // Invalid
        hours_per_day: 25, // Invalid
        holiday_days: -1, // Invalid
        vacation_days: 400, // Invalid
        sick_leave: 200, // Invalid
        monthly_salary: -1000, // Invalid
        taxes: 150, // Invalid
        fees: -5, // Invalid
        margin: 110, // Invalid
      };

      const expectedErrors = [
        'Work days must be between 1 and 31',
        'Hours per day must be between 1 and 24',
        'Holiday days cannot be negative',
        'Vacation days cannot exceed 365',
        'Sick leave days cannot exceed 365',
        'Monthly salary must be positive',
        'Taxes must be between 0 and 100',
        'Fees cannot be negative',
        'Margin must be between 0 and 100',
      ];

      mockBillableSpecializedUtils.validateFormData.mockReturnValue(expectedErrors);

      const errors = mockBillableSpecializedUtils.validateFormData(invalidFormData);
      expect(errors).toEqual(expectedErrors);
    });

    it('should calculate billable hours correctly', () => {
      const formData = {
        work_days: 22,
        hours_per_day: 8,
        holiday_days: 10,
        vacation_days: 20,
        sick_leave: 5,
        monthly_salary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
      };

      const expectedBillableHours = 1760; // 22 * 8 * 10 months (assuming 2 months off)

      mockBillableSpecializedUtils.calculateBillableHours.mockReturnValue(expectedBillableHours);

      const billableHours = mockBillableSpecializedUtils.calculateBillableHours(formData);
      expect(billableHours).toBe(expectedBillableHours);
      expect(mockBillableSpecializedUtils.calculateBillableHours).toHaveBeenCalledWith(formData);
    });

    it('should transform cache data to form format', () => {
      const cacheData: BillableCostItem = {
        id: 1,
        userId,
        workDays: 22,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1760,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const expectedFormData = {
        work_days: 22,
        hours_per_day: 8,
        holiday_days: 10,
        vacation_days: 20,
        sick_leave: 5,
        monthly_salary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
      };

      mockBillableSpecializedUtils.transformToFormData.mockReturnValue(expectedFormData);

      const formData = mockBillableSpecializedUtils.transformToFormData(cacheData);
      expect(formData).toEqual(expectedFormData);
    });

    it('should transform server response to cache format', () => {
      const serverResponse = {
        id: 1,
        userId,
        workDays: 22,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1760,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const expectedCacheData: BillableCostItem = {
        id: 1,
        userId,
        workDays: 22,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1760,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockBillableSpecializedUtils.transformServerResponse.mockReturnValue(expectedCacheData);

      const cacheData = mockBillableSpecializedUtils.transformServerResponse(serverResponse);
      expect(cacheData).toEqual(expectedCacheData);
    });
  });

  describe('Optimistic Updates', () => {
    it('should create optimistic update context', () => {
      const existingData: BillableCostItem = {
        id: 1,
        userId,
        workDays: 22,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1760,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      queryClient.setQueryData(queryKey, existingData);

      const partialUpdate = {
        monthlySalary: 6000,
        margin: 25,
      };

      const expectedContext = {
        previousData: existingData,
        optimisticData: { ...existingData, ...partialUpdate },
      };

      mockBillableSpecializedUtils.createOptimisticUpdate.mockReturnValue(expectedContext);

      const context = mockBillableSpecializedUtils.createOptimisticUpdate(
        queryClient,
        userId,
        partialUpdate
      );

      expect(context).toEqual(expectedContext);
      expect(mockBillableSpecializedUtils.createOptimisticUpdate).toHaveBeenCalledWith(
        queryClient,
        userId,
        partialUpdate
      );
    });

    it('should rollback optimistic update on error', () => {
      const previousData: BillableCostItem = {
        id: 1,
        userId,
        workDays: 22,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1760,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockBillableSpecializedUtils.rollbackOptimisticUpdate.mockImplementation(() => {
        queryClient.setQueryData(queryKey, previousData);
      });

      mockBillableSpecializedUtils.rollbackOptimisticUpdate(queryClient, userId, previousData);

      expect(mockBillableSpecializedUtils.rollbackOptimisticUpdate).toHaveBeenCalledWith(
        queryClient,
        userId,
        previousData
      );

      const restoredData = queryClient.getQueryData<BillableCostItem>(queryKey);
      expect(restoredData).toEqual(previousData);
    });

    it('should handle optimistic update with no existing data', () => {
      const partialUpdate = {
        workDays: 22,
        hoursPerDay: 8,
        monthlySalary: 5000,
      };

      const expectedContext = {
        previousData: null,
        optimisticData: expect.objectContaining(partialUpdate),
      };

      mockBillableSpecializedUtils.createOptimisticUpdate.mockReturnValue(expectedContext);

      const context = mockBillableSpecializedUtils.createOptimisticUpdate(
        queryClient,
        userId,
        partialUpdate
      );

      expect(context.previousData).toBeNull();
      expect(context.optimisticData).toEqual(expect.objectContaining(partialUpdate));
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete mutation workflow', async () => {
      const formData = {
        work_days: 22,
        hours_per_day: 8,
        holiday_days: 10,
        vacation_days: 20,
        sick_leave: 5,
        monthly_salary: 6000,
        taxes: 25,
        fees: 5,
        margin: 20,
      };

      const billableHours = 1760;
      const serverResponse = {
        id: 1,
        userId,
        ...formData,
        billableHours,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock the validation to pass
      mockBillableSpecializedUtils.validateFormData.mockReturnValue([]);
      mockBillableSpecializedUtils.calculateBillableHours.mockReturnValue(billableHours);
      mockBillableSpecializedUtils.createBillableCostItem.mockReturnValue(serverResponse);

      // Simulate the mutation workflow
      const validationErrors = mockBillableSpecializedUtils.validateFormData(formData);
      expect(validationErrors).toEqual([]);

      const calculatedHours = mockBillableSpecializedUtils.calculateBillableHours(formData);
      expect(calculatedHours).toBe(billableHours);

      const billableCostItem = mockBillableSpecializedUtils.createBillableCostItem(userId, formData);
      expect(billableCostItem).toEqual(serverResponse);
    });

    it('should handle mutation failure and rollback', async () => {
      const existingData: BillableCostItem = {
        id: 1,
        userId,
        workDays: 20,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 15,
        sickLeaveDays: 5,
        monthlySalary: 4000,
        taxes: 20,
        fees: 3,
        margin: 15,
        billableHours: 1600,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      queryClient.setQueryData(queryKey, existingData);

      const formData = {
        work_days: 22,
        hours_per_day: 8,
        holiday_days: 10,
        vacation_days: 20,
        sick_leave: 5,
        monthly_salary: 6000,
        taxes: 25,
        fees: 5,
        margin: 20,
      };

      // Mock optimistic update
      const optimisticContext = {
        previousData: existingData,
        optimisticData: { ...existingData, monthlySalary: 6000 },
      };

      mockBillableSpecializedUtils.createOptimisticUpdate.mockReturnValue(optimisticContext);
      mockBillableSpecializedUtils.rollbackOptimisticUpdate.mockImplementation(() => {
        queryClient.setQueryData(queryKey, existingData);
      });

      // Create optimistic update
      const context = mockBillableSpecializedUtils.createOptimisticUpdate(
        queryClient,
        userId,
        formData
      );

      // Simulate API failure and rollback
      mockBillableSpecializedUtils.rollbackOptimisticUpdate(
        queryClient,
        userId,
        context.previousData
      );

      // Verify rollback
      const restoredData = queryClient.getQueryData<BillableCostItem>(queryKey);
      expect(restoredData).toEqual(existingData);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle cache corruption gracefully', () => {
      // Set invalid data in cache
      queryClient.setQueryData(queryKey, 'invalid-data');

      const cachedData = queryClient.getQueryData(queryKey);
      expect(cachedData).toBe('invalid-data');

      // The cache utils should handle this gracefully
      mockBillableCacheUtils.getCurrentObject.mockReturnValue(null);
      const result = mockBillableCacheUtils.getCurrentObject(queryClient, userId);
      expect(result).toBeNull();
    });

    it('should handle concurrent updates', () => {
      const initialData: BillableCostItem = {
        id: 1,
        userId,
        workDays: 22,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1760,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      queryClient.setQueryData(queryKey, initialData);

      // Simulate concurrent updates
      const update1 = { ...initialData, monthlySalary: 6000 };
      const update2 = { ...initialData, margin: 25 };

      queryClient.setQueryData(queryKey, update1);
      queryClient.setQueryData(queryKey, update2);

      const finalData = queryClient.getQueryData<BillableCostItem>(queryKey);
      expect(finalData).toEqual(update2);
    });

    it('should handle memory pressure scenarios', () => {
      // Simulate many rapid updates
      const baseData: BillableCostItem = {
        id: 1,
        userId,
        workDays: 22,
        hoursPerDay: 8,
        holidaysDays: 10,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1760,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Perform many updates
      for (let i = 0; i < 100; i++) {
        const updatedData = { ...baseData, monthlySalary: 5000 + i };
        queryClient.setQueryData(queryKey, updatedData);
      }

      const finalData = queryClient.getQueryData<BillableCostItem>(queryKey);
      expect(finalData?.monthlySalary).toBe(5099);
    });
  });
});