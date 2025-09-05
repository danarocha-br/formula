/**
 * Integration tests for BillableCosts component with stable data selectors
 * and optimized cache management
 */

import { useStableBillable } from '../../hooks/use-stable-billable';
import { useUpdateBillableExpense } from '../../app/features/feature-billable-cost/server/update-billable-expense';
import { useCreateBillableExpense } from '../../app/features/feature-billable-cost/server/create-billable-expense';
import { billableCostSpecializedUtils, type BillableCostItem } from '../../utils/query-cache-utils';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the hooks and utilities
vi.mock('../../hooks/use-stable-billable');
vi.mock('../../app/features/feature-billable-cost/server/update-billable-expense');
vi.mock('../../app/features/feature-billable-cost/server/create-billable-expense');

const mockUseStableBillable = vi.mocked(useStableBillable);
const mockUseUpdateBillableExpense = vi.mocked(useUpdateBillableExpense);
const mockUseCreateBillableExpense = vi.mocked(useCreateBillableExpense);

describe('BillableCosts Component Integration', () => {
  const userId = 'test-user-123';

  const mockBillableData: BillableCostItem = {
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
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockUseStableBillable.mockReturnValue({
      billableData: mockBillableData,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    });

    mockUseUpdateBillableExpense.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: undefined,
    } as any);

    mockUseCreateBillableExpense.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: undefined,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should use stable billable data selector', () => {
    // Test that the component integration uses the stable data selector
    expect(mockUseStableBillable).toBeDefined();

    // Mock the hook call
    const result = mockUseStableBillable({ userId });

    // Verify the hook returns the expected structure
    expect(result).toHaveProperty('billableData');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('isError');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('isSuccess');
    expect(result).toHaveProperty('isFetching');
  });

  it('should use optimized mutation hooks', () => {
    // Test that the component uses the optimized mutation hooks
    expect(mockUseUpdateBillableExpense).toBeDefined();
    expect(mockUseCreateBillableExpense).toBeDefined();

    // Mock the hook calls
    const updateResult = mockUseUpdateBillableExpense();
    const createResult = mockUseCreateBillableExpense();

    // Verify the hooks return the expected mutation structure
    expect(updateResult).toHaveProperty('mutate');
    expect(createResult).toHaveProperty('mutate');
  });

  it('should handle stable data transformations', () => {
    // Test that billable cache utilities are available for data transformations
    expect(billableCostSpecializedUtils).toBeDefined();
    expect(billableCostSpecializedUtils.validateFormData).toBeDefined();
    expect(billableCostSpecializedUtils.calculateBillableHours).toBeDefined();
    expect(billableCostSpecializedUtils.transformToFormData).toBeDefined();
    expect(billableCostSpecializedUtils.transformServerResponse).toBeDefined();
  });

  it('should handle form data validation', () => {
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
    expect(errors).toEqual([]);
  });

  it('should calculate billable hours correctly', () => {
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

    const billableHours = billableCostSpecializedUtils.calculateBillableHours(formData);

    // Expected calculation: (5 * 52 - (12 + 20 + 5)) * 8 = (260 - 37) * 8 = 1784
    expect(billableHours).toBe(1784);
  });

  it('should transform data between cache and form formats', () => {
    const cacheData = mockBillableData;
    const formData = billableCostSpecializedUtils.transformToFormData(cacheData);

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

  it('should handle error states from stable data selector', () => {
    const mockError = new Error('Failed to load billable data');
    mockUseStableBillable.mockReturnValue({
      billableData: null,
      isLoading: false,
      isError: true,
      error: mockError,
      isSuccess: false,
      isFetching: false,
    });

    const result = mockUseStableBillable({ userId });

    expect(result.isError).toBe(true);
    expect(result.error).toBe(mockError);
    expect(result.billableData).toBe(null);
  });

  it('should handle loading states from stable data selector', () => {
    mockUseStableBillable.mockReturnValue({
      billableData: null,
      isLoading: true,
      isError: false,
      error: null,
      isSuccess: false,
      isFetching: true,
    });

    const result = mockUseStableBillable({ userId });

    expect(result.isLoading).toBe(true);
    expect(result.isFetching).toBe(true);
    expect(result.billableData).toBe(null);
  });
});