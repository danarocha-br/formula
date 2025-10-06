import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useBatchedStateUpdates, createStateUpdateOperations } from '@/utils/batched-state-updates';

describe('useBatchedStateUpdates', () => {
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
  });

  it('should execute batched loading state updates', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));

    act(() => {
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.loading('updating', 1, true),
          createStateUpdateOperations.loading('creating', 'temp-1', true),
        ]
      });
    });

    expect(mockStateSetters.setLoadingStates).toHaveBeenCalledTimes(2);
  });

  it('should execute batched optimistic updates', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));

    act(() => {
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.optimistic('field1', 'value1'),
          createStateUpdateOperations.optimistic('field2', 'value2'),
        ]
      });
    });

    expect(mockStateSetters.setOptimisticUpdates).toHaveBeenCalledTimes(2);
  });

  it('should execute batched error state updates', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));

    act(() => {
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.error('field1', 'Error message'),
          createStateUpdateOperations.clearError('field2'),
        ]
      });
    });

    expect(mockStateSetters.setErrors).toHaveBeenCalledTimes(2);
  });

  it('should execute mixed state updates in a single batch', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));

    act(() => {
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.loading('updating', 1, true),
          createStateUpdateOperations.optimistic('field1', 'value1'),
          createStateUpdateOperations.error('field2', 'Error message'),
          createStateUpdateOperations.editingCell('cell1', true),
        ]
      });
    });

    expect(mockStateSetters.setLoadingStates).toHaveBeenCalledTimes(1);
    expect(mockStateSetters.setOptimisticUpdates).toHaveBeenCalledTimes(1);
    expect(mockStateSetters.setErrors).toHaveBeenCalledTimes(1);
    expect(mockStateSetters.setEditingCells).toHaveBeenCalledTimes(1);
  });

  it('should call onComplete callback after successful batch execution', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));
    const onComplete = vi.fn();

    act(() => {
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.loading('updating', 1, true),
        ],
        onComplete
      });
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onError callback if batch execution fails', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));
    const onError = vi.fn();

    // Mock a setter to throw an error
    mockStateSetters.setLoadingStates.mockImplementation(() => {
      throw new Error('Test error');
    });

    act(() => {
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.loading('updating', 1, true),
        ],
        onError
      });
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should handle new row form updates', () => {
    const { result } = renderHook(() => useBatchedStateUpdates(mockStateSetters));

    act(() => {
      result.current.executeBatchedUpdate({
        operations: [
          createStateUpdateOperations.newRowForm('temp-1', { name: 'Test', category: 'test-category' }),
        ]
      });
    });

    expect(mockStateSetters.setNewRowForm).toHaveBeenCalledTimes(1);
  });
});

describe('createStateUpdateOperations', () => {
  it('should create loading state operation correctly', () => {
    const operation = createStateUpdateOperations.loading('updating', 1, true);

    expect(operation.type).toBe('loading');
    expect(operation.updater).toBeDefined();
  });

  it('should create optimistic update operation correctly', () => {
    const operation = createStateUpdateOperations.optimistic('field1', 'value1');

    expect(operation.type).toBe('optimistic');
    expect(operation.key).toBe('field1');
    expect(operation.value).toBe('value1');
  });

  it('should create error operation correctly', () => {
    const operation = createStateUpdateOperations.error('field1', 'Error message');

    expect(operation.type).toBe('error');
    expect(operation.key).toBe('field1');
    expect(operation.value).toBe('Error message');
  });

  it('should create clear error operation correctly', () => {
    const operation = createStateUpdateOperations.clearError('field1');

    expect(operation.type).toBe('error');
    expect(operation.updater).toBeDefined();
  });

  it('should create clear optimistic operation correctly', () => {
    const operation = createStateUpdateOperations.clearOptimistic('field1');

    expect(operation.type).toBe('optimistic');
    expect(operation.updater).toBeDefined();
  });

  it('should create editing cell operation correctly', () => {
    const operation = createStateUpdateOperations.editingCell('cell1', true);

    expect(operation.type).toBe('editingCells');
    expect(operation.key).toBe('cell1');
    expect(operation.value).toBe(true);
  });

  it('should create new row form operation correctly', () => {
    const operation = createStateUpdateOperations.newRowForm('temp-1', { name: 'Test' });

    expect(operation.type).toBe('newRowForm');
    expect(operation.updater).toBeDefined();
  });
});