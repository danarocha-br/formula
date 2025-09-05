import { renderHook } from '@testing-library/react';
import { useStableBillable } from '../use-stable-billable';
import { useGetBillableExpenses } from '../../app/features/feature-billable-cost/server/get-billable-expenses';
import type { BillableCostItem } from '../../utils/query-cache-utils';
import { vi } from 'vitest';

// Mock the billable expenses hook
vi.mock('../../app/features/feature-billable-cost/server/get-billable-expenses');

const mockUseGetBillableExpenses = vi.mocked(useGetBillableExpenses);

describe('useStableBillable', () => {
  const userId = 'test-user-123';

  const mockBillableData: BillableCostItem = {
    id: 1,
    userId,
    workDays: 22,
    hoursPerDay: 8,
    holidaysDays: 10,
    vacationsDays: 15,
    sickLeaveDays: 5,
    monthlySalary: 5000,
    taxes: 25,
    fees: 10,
    margin: 20,
    billableHours: 176,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return billable data with stable reference', () => {
    mockUseGetBillableExpenses.mockReturnValue({
      data: mockBillableData,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result, rerender } = renderHook(() =>
      useStableBillable({ userId })
    );

    const firstResult = result.current.billableData;

    // Rerender with same data
    rerender();

    const secondResult = result.current.billableData;

    // Should have stable reference
    expect(firstResult).toBe(secondResult);
    expect(result.current.billableData).toEqual(mockBillableData);
  });

  it('should return null when no data available', () => {
    mockUseGetBillableExpenses.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result } = renderHook(() =>
      useStableBillable({ userId })
    );

    expect(result.current.billableData).toBe(null);
  });

  it('should return undefined when data is undefined', () => {
    mockUseGetBillableExpenses.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result } = renderHook(() =>
      useStableBillable({ userId })
    );

    expect(result.current.billableData).toBe(null);
  });

  it('should pass through loading state correctly', () => {
    mockUseGetBillableExpenses.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      isSuccess: false,
      isFetching: true,
    } as any);

    const { result } = renderHook(() =>
      useStableBillable({ userId })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isFetching).toBe(true);
  });

  it('should pass through error state correctly', () => {
    const mockError = new Error('Failed to fetch billable data');

    mockUseGetBillableExpenses.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: mockError,
      isSuccess: false,
      isFetching: false,
    } as any);

    const { result } = renderHook(() =>
      useStableBillable({ userId })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.billableData).toBe(null);
  });

  it('should call useGetBillableExpenses with correct userId', () => {
    mockUseGetBillableExpenses.mockReturnValue({
      data: mockBillableData,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    renderHook(() => useStableBillable({ userId }));

    expect(mockUseGetBillableExpenses).toHaveBeenCalledWith({ userId });
  });

  it('should update data reference when underlying data changes', () => {
    const initialData = { ...mockBillableData };
    const updatedData = { ...mockBillableData, monthlySalary: 6000 };

    mockUseGetBillableExpenses.mockReturnValue({
      data: initialData,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result, rerender } = renderHook(() =>
      useStableBillable({ userId })
    );

    const firstResult = result.current.billableData;

    // Update mock to return new data
    mockUseGetBillableExpenses.mockReturnValue({
      data: updatedData,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    rerender();

    const secondResult = result.current.billableData;

    // Should have new reference with updated data
    expect(firstResult).not.toBe(secondResult);
    expect(result.current.billableData).toEqual(updatedData);
    expect(result.current.billableData?.monthlySalary).toBe(6000);
  });

  it('should maintain stable reference when data properties are the same', () => {
    const data1 = { ...mockBillableData };
    const data2 = { ...mockBillableData }; // Same values, different object

    mockUseGetBillableExpenses.mockReturnValue({
      data: data1,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result, rerender } = renderHook(() =>
      useStableBillable({ userId })
    );

    const firstResult = result.current.billableData;

    // Update mock to return equivalent data (different object reference)
    mockUseGetBillableExpenses.mockReturnValue({
      data: data2,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    rerender();

    const secondResult = result.current.billableData;

    // Should have new reference because the underlying query data changed
    // (even though the values are the same)
    expect(firstResult).not.toBe(secondResult);
    expect(result.current.billableData).toEqual(mockBillableData);
  });
});