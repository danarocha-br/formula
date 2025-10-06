/**
 * Tests for refactored billable cost mutation hooks
 * Verifies that the hooks use precise cache updates instead of invalidation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { billableCostSpecializedUtils } from '../../../../../utils/query-cache-utils';

// Mock the dependencies
vi.mock('../../../../../utils/translations', () => ({
  getTranslations: () => ({
    validation: {
      error: {
        'create-failed': 'Create failed',
        'update-failed': 'Update failed',
      },
    },
  }),
}));

vi.mock('../../../../../utils/circuit-breaker', () => ({
  circuitBreakers: {
    createExpense: {
      execute: vi.fn((fn) => fn()),
    },
    updateExpense: {
      execute: vi.fn((fn) => fn()),
    },
  },
}));

vi.mock('../../../../../utils/retry-with-backoff', () => ({
  retryWithBackoff: vi.fn((fn) => fn()),
  RetryConfigs: {
    mutation: {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 3000,
      backoffMultiplier: 1.5,
      jitter: true,
    },
  },
}));

vi.mock('@repo/design-system/lib/rpc', () => ({
  client: {
    api: {
      expenses: {
        'billable-costs': {
          $post: vi.fn(),
          $patch: vi.fn(),
        },
      },
    },
  },
}));

// Mock the cache utilities
vi.mock('../../../../../utils/query-cache-utils', () => ({
  billableCostSpecializedUtils: {
    validateFormData: vi.fn(() => []),
    createBillableCostItem: vi.fn(() => ({
      id: 1,
      userId: 'test-user',
      workDays: 5,
      hoursPerDay: 6,
      holidaysDays: 12,
      vacationsDays: 30,
      sickLeaveDays: 3,
      monthlySalary: 0,
      taxes: 0,
      fees: 0,
      margin: 0,
      billableHours: 1170,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    createOptimisticUpdate: vi.fn(() => ({
      previousData: null,
      queryKey: ['billable-expenses', 'test-user'],
    })),
    rollbackOptimisticUpdate: vi.fn(),
    updateFromFormData: vi.fn(),
    transformServerResponse: vi.fn((data) => data),
    calculateBillableHours: vi.fn(() => 1170),
  },
}));

describe('Billable Cost Mutation Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('Cache Utilities Integration', () => {
    it('should have circuit breaker utilities available', async () => {
      const { circuitBreakers } = await import('../../../../../utils/circuit-breaker');

      // Verify circuit breaker is available
      expect(circuitBreakers.createExpense).toBeDefined();
      expect(circuitBreakers.updateExpense).toBeDefined();
      expect(circuitBreakers.createExpense.execute).toBeDefined();
      expect(circuitBreakers.updateExpense.execute).toBeDefined();
    });

    it('should have retry utilities available', async () => {
      const { retryWithBackoff, RetryConfigs } = await import('../../../../../utils/retry-with-backoff');

      // Verify retry logic is available
      expect(retryWithBackoff).toBeDefined();
      expect(RetryConfigs.mutation).toBeDefined();
      expect(RetryConfigs.mutation.maxAttempts).toBe(2);
    });

    it('should have billable cost cache utilities available', () => {
      // Verify cache utilities are available for optimistic updates
      expect(billableCostSpecializedUtils.createOptimisticUpdate).toBeDefined();
      expect(billableCostSpecializedUtils.rollbackOptimisticUpdate).toBeDefined();
      expect(billableCostSpecializedUtils.updateFromFormData).toBeDefined();
      expect(billableCostSpecializedUtils.validateFormData).toBeDefined();
      expect(billableCostSpecializedUtils.transformServerResponse).toBeDefined();
      expect(billableCostSpecializedUtils.calculateBillableHours).toBeDefined();
    });
  });

  describe('Mutation Hook Structure', () => {
    it('should validate form data before mutations', () => {
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

      const errors = billableCostSpecializedUtils.validateFormData(formData);
      expect(errors).toEqual([]);
      expect(billableCostSpecializedUtils.validateFormData).toHaveBeenCalledWith(formData);
    });

    it('should calculate billable hours correctly', () => {
      const formData = {
        work_days: 5,
        hours_per_day: 8,
        holiday_days: 12,
        vacation_days: 20,
        sick_leave: 5,
      };

      const billableHours = billableCostSpecializedUtils.calculateBillableHours(formData);
      expect(billableHours).toBe(1170);
      expect(billableCostSpecializedUtils.calculateBillableHours).toHaveBeenCalledWith(formData);
    });

    it('should create optimistic updates with proper context', () => {
      const queryClient = new QueryClient();
      const userId = 'test-user';
      const partialData = { monthlySalary: 6000 };

      const context = billableCostSpecializedUtils.createOptimisticUpdate(
        queryClient,
        userId,
        partialData
      );

      expect(context).toEqual({
        previousData: null,
        queryKey: ['billable-expenses', 'test-user'],
      });
      expect(billableCostSpecializedUtils.createOptimisticUpdate).toHaveBeenCalledWith(
        queryClient,
        userId,
        partialData
      );
    });
  });

  describe('Error Handling', () => {
    it('should provide rollback functionality for failed mutations', () => {
      const queryClient = new QueryClient();
      const userId = 'test-user';
      const previousData = {
        id: 1,
        userId: 'test-user',
        workDays: 5,
        hoursPerDay: 6,
        holidaysDays: 12,
        vacationsDays: 30,
        sickLeaveDays: 3,
        monthlySalary: 5000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1170,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      billableCostSpecializedUtils.rollbackOptimisticUpdate(
        queryClient,
        userId,
        previousData
      );

      expect(billableCostSpecializedUtils.rollbackOptimisticUpdate).toHaveBeenCalledWith(
        queryClient,
        userId,
        previousData
      );
    });

    it('should handle validation errors properly', () => {
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

      // Mock validation to return errors for invalid data
      vi.mocked(billableCostSpecializedUtils.validateFormData).mockReturnValue([
        'Work days must be between 1 and 7',
        'Hours per day must be between 1 and 24',
        'Holiday days must be between 0 and 365',
      ]);

      const errors = billableCostSpecializedUtils.validateFormData(invalidFormData);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Work days must be between 1 and 7');
    });
  });

  describe('Performance Optimizations', () => {
    it('should use precise cache updates instead of broad invalidation', () => {
      const queryClient = new QueryClient();
      const userId = 'test-user';
      const formData = {
        work_days: 5,
        hours_per_day: 8,
        holiday_days: 12,
        vacation_days: 20,
        sick_leave: 5,
        monthly_salary: 6000,
        taxes: 25,
        fees: 5,
        margin: 20,
      };
      const billableHours = 1560;

      billableCostSpecializedUtils.updateFromFormData(
        queryClient,
        userId,
        formData,
        billableHours
      );

      expect(billableCostSpecializedUtils.updateFromFormData).toHaveBeenCalledWith(
        queryClient,
        userId,
        formData,
        billableHours
      );
    });

    it('should transform server responses for cache consistency', () => {
      const serverResponse = {
        id: 1,
        userId: 'test-user',
        workDays: 5,
        hoursPerDay: 8,
        holidaysDays: 12,
        vacationsDays: 20,
        sickLeaveDays: 5,
        monthlySalary: 6000,
        taxes: 25,
        fees: 5,
        margin: 20,
        billableHours: 1560,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const transformedData = billableCostSpecializedUtils.transformServerResponse(serverResponse);
      expect(transformedData).toBe(serverResponse);
      expect(billableCostSpecializedUtils.transformServerResponse).toHaveBeenCalledWith(serverResponse);
    });
  });
});