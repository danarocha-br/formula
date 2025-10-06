import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useStateUpdateCircuitBreaker,
  withStateUpdateCircuitBreaker,
  executeProtectedBatchedStateUpdate,
  type ProtectedStateUpdateOperation
} from '../state-update-circuit-breaker';
import { CircuitBreaker, CircuitState, CircuitBreakerError } from '../circuit-breaker';

describe('useStateUpdateCircuitBreaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute state update successfully when circuit is closed', async () => {
    const { result } = renderHook(() =>
      useStateUpdateCircuitBreaker({
        componentName: 'TestComponent',
        userId: 'test-user',
        debug: true,
      })
    );

    const mockOperation = vi.fn().mockReturnValue('success');

    await act(async () => {
      const updateResult = await result.current.executeStateUpdate(mockOperation, 'test-operation');

      expect(updateResult.success).toBe(true);
      expect(updateResult.result).toBe('success');
      expect(updateResult.circuitState).toBe(CircuitState.CLOSED);
      expect(updateResult.canRetry).toBe(true);
      expect(mockOperation).toHaveBeenCalledOnce();
    });
  });

  it('should execute synchronous state update successfully', () => {
    const { result } = renderHook(() =>
      useStateUpdateCircuitBreaker({
        componentName: 'TestComponent',
        userId: 'test-user',
      })
    );

    const mockOperation = vi.fn().mockReturnValue('sync-success');

    act(() => {
      const updateResult = result.current.executeStateUpdateSync(mockOperation, 'test-sync-operation');

      expect(updateResult.success).toBe(true);
      expect(updateResult.result).toBe('sync-success');
      expect(updateResult.circuitState).toBe(CircuitState.CLOSED);
      expect(updateResult.canRetry).toBe(true);
      expect(mockOperation).toHaveBeenCalledOnce();
    });
  });

  it('should handle async state update failures', async () => {
    const { result } = renderHook(() =>
      useStateUpdateCircuitBreaker({
        componentName: 'TestComponent',
        userId: 'test-user',
        failureThreshold: 2,
      })
    );

    const mockOperation = vi.fn().mockRejectedValue(new Error('State update failed'));

    await act(async () => {
      const updateResult = await result.current.executeStateUpdate(mockOperation, 'failing-operation');

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBeInstanceOf(Error);
      expect(updateResult.error?.message).toBe('State update failed');
      expect(updateResult.circuitState).toBe(CircuitState.CLOSED); // Still closed after first failure
      expect(updateResult.canRetry).toBe(true);
    });
  });

  it('should open circuit breaker after threshold failures', async () => {
    const { result } = renderHook(() =>
      useStateUpdateCircuitBreaker({
        componentName: 'TestComponent',
        userId: 'test-user',
        failureThreshold: 2,
        recoveryTimeout: 1000,
      })
    );

    const mockOperation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

    // First failure
    await act(async () => {
      await result.current.executeStateUpdate(mockOperation, 'failing-operation-1');
    });

    // Second failure - should open circuit
    await act(async () => {
      await result.current.executeStateUpdate(mockOperation, 'failing-operation-2');
    });

    // Third attempt should be blocked by circuit breaker
    await act(async () => {
      const updateResult = await result.current.executeStateUpdate(mockOperation, 'blocked-operation');

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBeInstanceOf(CircuitBreakerError);
      expect(updateResult.circuitState).toBe(CircuitState.OPEN);
      expect(updateResult.canRetry).toBe(false);
    });

    expect(mockOperation).toHaveBeenCalledTimes(2); // Third call was blocked
  });

  it('should provide circuit breaker status', () => {
    const { result } = renderHook(() =>
      useStateUpdateCircuitBreaker({
        componentName: 'TestComponent',
        userId: 'test-user',
      })
    );

    act(() => {
      const status = result.current.getCircuitBreakerStatus();

      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('failureCount');
      expect(status).toHaveProperty('componentName', 'TestComponent');
      expect(status.state).toBe(CircuitState.CLOSED);
    });
  });

  it('should reset circuit breaker', async () => {
    const { result } = renderHook(() =>
      useStateUpdateCircuitBreaker({
        componentName: 'TestComponent',
        userId: 'test-user',
        failureThreshold: 1,
      })
    );

    const mockFailingOperation = vi.fn().mockRejectedValue(new Error('Failure'));
    const mockSuccessOperation = vi.fn().mockReturnValue('success');

    // Cause a failure to open circuit
    await act(async () => {
      await result.current.executeStateUpdate(mockFailingOperation, 'failing-operation');
    });

    // Reset circuit breaker
    act(() => {
      result.current.resetCircuitBreaker();
    });

    // Should be able to execute operations again
    await act(async () => {
      const updateResult = await result.current.executeStateUpdate(mockSuccessOperation, 'success-operation');

      expect(updateResult.success).toBe(true);
      expect(updateResult.result).toBe('success');
      expect(updateResult.circuitState).toBe(CircuitState.CLOSED);
    });
  });

  it('should check if state updates are allowed', () => {
    const { result } = renderHook(() =>
      useStateUpdateCircuitBreaker({
        componentName: 'TestComponent',
        userId: 'test-user',
      })
    );

    act(() => {
      const canUpdate = result.current.canPerformStateUpdate();
      expect(canUpdate).toBe(true);
    });
  });

  it('should force open circuit breaker', () => {
    const { result } = renderHook(() =>
      useStateUpdateCircuitBreaker({
        componentName: 'TestComponent',
        userId: 'test-user',
      })
    );

    act(() => {
      result.current.forceOpenCircuitBreaker(5000);

      const status = result.current.getCircuitBreakerStatus();
      expect(status.state).toBe(CircuitState.OPEN);
    });
  });
});

describe('withStateUpdateCircuitBreaker', () => {
  it('should wrap state setter with circuit breaker protection', () => {
    const mockStateSetter = vi.fn().mockReturnValue('state-set');
    const mockCircuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      monitoringWindow: 5000,
      name: 'test-circuit',
    });

    const protectedStateSetter = withStateUpdateCircuitBreaker(
      mockStateSetter,
      mockCircuitBreaker,
      'test-state-update'
    );

    const result = protectedStateSetter('arg1', 'arg2');

    expect(result).toBe('state-set');
    expect(mockStateSetter).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should handle circuit breaker errors in wrapped state setter', () => {
    const mockStateSetter = vi.fn().mockImplementation(() => {
      throw new Error('State setter failed');
    });

    const mockCircuitBreaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 1000,
      monitoringWindow: 5000,
      name: 'test-circuit',
    });

    // Force circuit to open
    mockCircuitBreaker.forceOpen();

    const protectedStateSetter = withStateUpdateCircuitBreaker(
      mockStateSetter,
      mockCircuitBreaker,
      'test-state-update'
    );

    const result = protectedStateSetter('arg1', 'arg2');

    expect(result).toBeNull(); // Should return null when circuit breaker blocks
    expect(mockStateSetter).not.toHaveBeenCalled(); // Should not call original setter
  });
});

describe('executeProtectedBatchedStateUpdate', () => {
  it('should execute batched operations successfully', async () => {
    const mockCircuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      monitoringWindow: 5000,
      name: 'test-batch-circuit',
    });

    const operations: ProtectedStateUpdateOperation[] = [
      { type: 'loading', key: 'test1', value: true, operationName: 'set-loading' },
      { type: 'optimistic', key: 'test2', value: { data: 'test' }, operationName: 'set-optimistic' },
      { type: 'error', key: 'test3', value: '', operationName: 'clear-error' },
    ];

    const onComplete = vi.fn();
    const onError = vi.fn();

    const result = await executeProtectedBatchedStateUpdate(
      {
        operations,
        onComplete,
        onError,
      },
      mockCircuitBreaker
    );

    expect(result.success).toBe(true);
    expect(result.completedOperations).toHaveLength(3);
    expect(result.failedOperations).toHaveLength(0);
    expect(result.circuitState).toBe(CircuitState.CLOSED);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle circuit breaker errors in batched operations', async () => {
    const mockCircuitBreaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 1000,
      monitoringWindow: 5000,
      name: 'test-batch-circuit',
    });

    // Force circuit to open
    mockCircuitBreaker.forceOpen();

    const operations: ProtectedStateUpdateOperation[] = [
      { type: 'loading', key: 'test1', value: true, operationName: 'set-loading' },
    ];

    const onComplete = vi.fn();
    const onError = vi.fn();
    const onCircuitBreakerOpen = vi.fn();

    const result = await executeProtectedBatchedStateUpdate(
      {
        operations,
        onComplete,
        onError,
        onCircuitBreakerOpen,
      },
      mockCircuitBreaker
    );

    expect(result.success).toBe(false);
    expect(result.completedOperations).toHaveLength(0);
    expect(result.failedOperations).toHaveLength(1);
    expect(result.circuitState).toBe(CircuitState.OPEN);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onCircuitBreakerOpen).toHaveBeenCalledOnce();
  });
});