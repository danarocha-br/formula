import { renderHook } from '@testing-library/react';
import { useStableEquipment } from '../use-stable-equipment';
import { useGetEquipmentExpenses } from '../../app/features/feature-variable-cost/server/get-equipment-expenses';
import type { EquipmentExpenseItem } from '../../app/types';
import { vi } from 'vitest';

// Mock the equipment expenses hook
vi.mock('../../app/features/feature-variable-cost/server/get-equipment-expenses');

const mockUseGetEquipmentExpenses = vi.mocked(useGetEquipmentExpenses);

describe('useStableEquipment', () => {
  const userId = 'test-user-123';

  const mockEquipmentData: EquipmentExpenseItem[] = [
    {
      id: 3,
      name: 'Monitor',
      userId,
      rank: 3,
      amount: 500,
      purchaseDate: new Date('2024-01-01'),
      usage: 100,
      lifeSpan: 5,
      category: 'monitor',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 1,
      name: 'Laptop',
      userId,
      rank: 1,
      amount: 1500,
      purchaseDate: new Date('2024-01-01'),
      usage: 100,
      lifeSpan: 3,
      category: 'computer',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Keyboard',
      userId,
      rank: 2,
      amount: 150,
      purchaseDate: new Date('2024-01-01'),
      usage: 100,
      lifeSpan: 5,
      category: 'keyboard',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const expectedSortedData: EquipmentExpenseItem[] = [
    mockEquipmentData[1], // Laptop (rank 1)
    mockEquipmentData[2], // Keyboard (rank 2)
    mockEquipmentData[0], // Monitor (rank 3)
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return sorted equipment data with stable reference', () => {
    // Use already sorted data to test stable reference
    const alreadySortedData: EquipmentExpenseItem[] = [
      mockEquipmentData[1], // Laptop (rank 1)
      mockEquipmentData[2], // Keyboard (rank 2)
      mockEquipmentData[0], // Monitor (rank 3)
    ];

    mockUseGetEquipmentExpenses.mockReturnValue({
      data: alreadySortedData,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result, rerender } = renderHook(() =>
      useStableEquipment({ userId })
    );

    const firstResult = result.current.equipment;

    // Rerender with same data
    rerender();

    const secondResult = result.current.equipment;

    // Should have stable reference when data is already sorted
    expect(firstResult).toBe(secondResult);
    expect(result.current.equipment).toEqual(expectedSortedData);
  });

  it('should return empty array when no data available', () => {
    mockUseGetEquipmentExpenses.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result } = renderHook(() =>
      useStableEquipment({ userId })
    );

    expect(result.current.equipment).toEqual([]);
  });

  it('should return empty array when data is undefined', () => {
    mockUseGetEquipmentExpenses.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result } = renderHook(() =>
      useStableEquipment({ userId })
    );

    expect(result.current.equipment).toEqual([]);
  });

  it('should sort equipment by rank correctly', () => {
    mockUseGetEquipmentExpenses.mockReturnValue({
      data: mockEquipmentData, // Unsorted input
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result } = renderHook(() =>
      useStableEquipment({ userId })
    );

    expect(result.current.equipment).toEqual(expectedSortedData);
    expect(result.current.equipment[0].name).toBe('Laptop'); // rank 1
    expect(result.current.equipment[1].name).toBe('Keyboard'); // rank 2
    expect(result.current.equipment[2].name).toBe('Monitor'); // rank 3
  });

  it('should handle equipment with undefined ranks', () => {
    const dataWithUndefinedRanks: EquipmentExpenseItem[] = [
      { ...mockEquipmentData[0], rank: 1 },
      { ...mockEquipmentData[1], rank: undefined as any }, // No rank
      { ...mockEquipmentData[2], rank: 2 },
    ];

    mockUseGetEquipmentExpenses.mockReturnValue({
      data: dataWithUndefinedRanks,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result } = renderHook(() =>
      useStableEquipment({ userId })
    );

    // Items with undefined rank should be at the end, sorted by ID
    expect(result.current.equipment[0].rank).toBe(1);
    expect(result.current.equipment[1].rank).toBe(2);
    expect(result.current.equipment[2].rank).toBeUndefined();
  });

  it('should use ID as secondary sort when ranks are equal', () => {
    const dataWithEqualRanks: EquipmentExpenseItem[] = [
      { ...mockEquipmentData[0], id: 3, rank: 1 },
      { ...mockEquipmentData[1], id: 1, rank: 1 },
      { ...mockEquipmentData[2], id: 2, rank: 1 },
    ];

    mockUseGetEquipmentExpenses.mockReturnValue({
      data: dataWithEqualRanks,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result } = renderHook(() =>
      useStableEquipment({ userId })
    );

    // Should be sorted by ID when ranks are equal
    expect(result.current.equipment[0].id).toBe(1);
    expect(result.current.equipment[1].id).toBe(2);
    expect(result.current.equipment[2].id).toBe(3);
  });

  it('should pass through loading state correctly', () => {
    mockUseGetEquipmentExpenses.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      isSuccess: false,
      isFetching: true,
    } as any);

    const { result } = renderHook(() =>
      useStableEquipment({ userId })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.equipment).toEqual([]);
  });

  it('should pass through error state correctly', () => {
    const mockError = new Error('Failed to fetch equipment data');

    mockUseGetEquipmentExpenses.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: mockError,
      isSuccess: false,
      isFetching: false,
    } as any);

    const { result } = renderHook(() =>
      useStableEquipment({ userId })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.equipment).toEqual([]);
  });

  it('should call useGetEquipmentExpenses with correct userId', () => {
    mockUseGetEquipmentExpenses.mockReturnValue({
      data: mockEquipmentData,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    renderHook(() => useStableEquipment({ userId }));

    expect(mockUseGetEquipmentExpenses).toHaveBeenCalledWith({ userId });
  });

  it('should update data reference when underlying data changes', () => {
    const initialData = [...mockEquipmentData];
    const updatedData = [
      ...mockEquipmentData,
      {
        id: 4,
        name: 'Mouse',
        userId,
        rank: 4,
        amount: 50,
        purchaseDate: new Date('2024-01-01'),
        usage: 100,
        lifeSpan: 3,
        category: 'mouse',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockUseGetEquipmentExpenses.mockReturnValue({
      data: initialData,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result, rerender } = renderHook(() =>
      useStableEquipment({ userId })
    );

    const firstResult = result.current.equipment;

    // Update mock to return new data
    mockUseGetEquipmentExpenses.mockReturnValue({
      data: updatedData,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    rerender();

    const secondResult = result.current.equipment;

    // Should have new reference with updated data
    expect(firstResult).not.toBe(secondResult);
    expect(result.current.equipment).toHaveLength(4);
    expect(result.current.equipment[3].name).toBe('Mouse');
  });

  it('should handle empty array correctly', () => {
    mockUseGetEquipmentExpenses.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
    } as any);

    const { result } = renderHook(() =>
      useStableEquipment({ userId })
    );

    expect(result.current.equipment).toEqual([]);
    expect(result.current.isSuccess).toBe(true);
  });
});