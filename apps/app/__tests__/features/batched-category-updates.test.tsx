import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { useBatchedStateUpdates, createStateUpdateOperations } from '@/utils/batched-state-updates';
import { startTransition } from 'react';

// Mock React's startTransition to track its usage
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    startTransition: vi.fn((callback: () => void) => callback()),
  };
});

describe('Batched Category Updates Integration', () => {
  let mockStateSetters: any;

  beforeEach(() => {
    mockStateSetters = {
      setLoadingStates: vi.fn(),
      setOptimisticUpdates: vi.fn(),
      setErrors: vi.fn(),
      setNewRows: vi.fn(),
      setNewRowForm: vi.fn(),
      setEditingCells: vi.fn(),
      setHoveredRows: vi.fn(),
    };
    vi.clearAllMocks();
  });

  it('should use startTransition for batched updates', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));

    act(() => {
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.loading('updating', 1, true),
          createStateUpdateOperations.optimistic('field1', 'value1'),
        ]
      });
    });

    // Verify that startTransition was called
    expect(startTransition).toHaveBeenCalledTimes(1);
    expect(startTransition).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should simulate category change workflow with batched updates', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));

    // Simulate the category change workflow as implemented in handleCategoryChange
    act(() => {
      // Initial batch: loading + optimistic + clear errors + editing cell
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.loading('updating', 1, true),
          createStateUpdateOperations.optimistic('equipment.1.category', { value: 'computer', label: 'Computer' }),
          createStateUpdateOperations.clearError('equipment.1.category'),
          createStateUpdateOperations.editingCell('category-1', false)
        ]
      });
    });

    // Verify all state setters were called in the first batch
    expect(mockStateSetters.setLoadingStates).toHaveBeenCalledTimes(1);
    expect(mockStateSetters.setOptimisticUpdates).toHaveBeenCalledTimes(1);
    expect(mockStateSetters.setErrors).toHaveBeenCalledTimes(1);
    expect(mockStateSetters.setEditingCells).toHaveBeenCalledTimes(1);

    // Simulate success batch: clear loading + clear optimistic
    act(() => {
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.loading('updating', 1, false),
          createStateUpdateOperations.clearOptimistic('equipment.1.category')
        ]
      });
    });

    // Verify success state updates
    expect(mockStateSetters.setLoadingStates).toHaveBeenCalledTimes(2);
    expect(mockStateSetters.setOptimisticUpdates).toHaveBeenCalledTimes(2);
  });

  it('should simulate error handling workflow with batched updates', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));

    // Simulate error batch: clear loading + rollback optimistic + set error
    act(() => {
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.loading('updating', 1, false),
          createStateUpdateOperations.clearOptimistic('equipment.1.category'),
          createStateUpdateOperations.error('equipment.1.category', 'Update failed')
        ]
      });
    });

    // Verify error state updates
    expect(mockStateSetters.setLoadingStates).toHaveBeenCalledTimes(1);
    expect(mockStateSetters.setOptimisticUpdates).toHaveBeenCalledTimes(1);
    expect(mockStateSetters.setErrors).toHaveBeenCalledTimes(1);
  });

  it('should handle new row category changes with batched updates', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));

    // Simulate new row category change
    act(() => {
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.newRowForm('temp-1', {
            category: { value: 'computer', label: 'Computer' }
          })
        ]
      });
    });

    // Verify new row form state was updated
    expect(mockStateSetters.setNewRowForm).toHaveBeenCalledTimes(1);
  });

  it('should prevent infinite loops by batching related state updates', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));

    // Simulate multiple rapid state changes that could cause infinite loops
    act(() => {
      // Multiple batches in quick succession
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.loading('updating', 1, true),
          createStateUpdateOperations.optimistic('field1', 'value1'),
        ]
      });

      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.loading('updating', 2, true),
          createStateUpdateOperations.optimistic('field2', 'value2'),
        ]
      });

      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.loading('updating', 1, false),
          createStateUpdateOperations.clearOptimistic('field1'),
        ]
      });
    });

    // Verify that startTransition was used for each batch
    expect(startTransition).toHaveBeenCalledTimes(3);

    // Verify that state setters were called the expected number of times
    expect(mockStateSetters.setLoadingStates).toHaveBeenCalledTimes(3);
    expect(mockStateSetters.setOptimisticUpdates).toHaveBeenCalledTimes(3);
  });
});