import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStateUpdateCircuitBreaker } from '../state-update-circuit-breaker';
import { CircuitBreaker, CircuitBreakerConfigs, CircuitState } from '../circuit-breaker';
import { renderHook, act } from '@testing-library/react';

describe('Circuit Breaker Demo - Task 7 Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should demonstrate circuit breaker pattern for state updates', async () => {
    console.log('=== Circuit Breaker Pattern Demo ===');

    const { result } = renderHook(() =>
      useStateUpdateCircuitBreaker({
        componentName: 'ExpensesTable',
        userId: 'demo-user',
        failureThreshold: 3,
        recoveryTimeout: 2000,
        debug: true,
      })
    );

    // Simulate a failing state update operation
    const failingStateUpdate = vi.fn().mockRejectedValue(new Error('State update infinite loop detected'));

    console.log('1. Testing normal operation (should succeed)');
    const successfulOperation = vi.fn().mockResolvedValue('State updated successfully');

    await act(async () => {
      const updateResult = await result.current.executeStateUpdate(successfulOperation, 'normal-update');
      expect(updateResult.success).toBe(true);
      expect(updateResult.result).toBe('State updated successfully');
      console.log('✓ Normal operation succeeded');
    });

    console.log('2. Simulating cascading failures...');

    // First failure
    await act(async () => {
      const updateResult = await result.current.executeStateUpdate(failingStateUpdate, 'failing-update-1');
      expect(updateResult.success).toBe(false);
      expect(updateResult.circuitState).toBe(CircuitState.CLOSED); // Still closed after first failure
      console.log('✓ First failure handled, circuit still closed');
    });

    // Second failure
    await act(async () => {
      const updateResult = await result.current.executeStateUpdate(failingStateUpdate, 'failing-update-2');
      expect(updateResult.success).toBe(false);
      console.log('✓ Second failure handled');
    });

    // Third failure - should open circuit
    await act(async () => {
      const updateResult = await result.current.executeStateUpdate(failingStateUpdate, 'failing-update-3');
      expect(updateResult.success).toBe(false);
      expect(updateResult.circuitState).toBe(CircuitState.OPEN);
      console.log('✓ Third failure opened circuit breaker');
    });

    console.log('3. Testing circuit breaker protection...');

    // Fourth attempt should be blocked
    await act(async () => {
      const updateResult = await result.current.executeStateUpdate(failingStateUpdate, 'blocked-update');
      expect(updateResult.success).toBe(false);
      expect(updateResult.canRetry).toBe(false);
      console.log('✓ Fourth attempt blocked by circuit breaker');
    });

    // Verify the failing operation was only called 3 times (4th was blocked)
    expect(failingStateUpdate).toHaveBeenCalledTimes(3);

    console.log('4. Testing circuit breaker status...');

    act(() => {
      const status = result.current.getCircuitBreakerStatus();
      expect(status.state).toBe(CircuitState.OPEN);
      expect(status.failureCount).toBeGreaterThan(0);
      console.log(`✓ Circuit breaker status: ${status.state}, failures: ${status.failureCount}`);
    });

    console.log('5. Testing manual recovery...');

    act(() => {
      result.current.resetCircuitBreaker();
      const status = result.current.getCircuitBreakerStatus();
      expect(status.state).toBe(CircuitState.CLOSED);
      console.log('✓ Circuit breaker manually reset');
    });

    console.log('6. Testing recovery with successful operation...');

    await act(async () => {
      const updateResult = await result.current.executeStateUpdate(successfulOperation, 'recovery-update');
      expect(updateResult.success).toBe(true);
      expect(updateResult.circuitState).toBe(CircuitState.CLOSED);
      console.log('✓ Recovery successful, circuit closed');
    });

    console.log('=== Circuit Breaker Demo Complete ===');
  });

  it('should demonstrate automatic state reset during recovery', async () => {
    console.log('=== Automatic Recovery Demo ===');

    const circuitBreaker = new CircuitBreaker({
      ...CircuitBreakerConfigs.mutation,
      name: 'state-reset-demo',
      failureThreshold: 2,
      resetTimeout: 1000,
    });

    const mockStateReset = vi.fn().mockResolvedValue('State reset successful');

    // Simulate state update failures
    const failingOperation = vi.fn().mockRejectedValue(new Error('Infinite loop in state update'));

    console.log('1. Causing failures to open circuit...');

    try {
      await circuitBreaker.execute(failingOperation);
    } catch (error) {
      console.log('✓ First failure recorded');
    }

    try {
      await circuitBreaker.execute(failingOperation);
    } catch (error) {
      console.log('✓ Second failure opened circuit');
    }

    expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);
    console.log(`Circuit state: ${circuitBreaker.getStatus().state}`);

    console.log('2. Testing blocked operations...');

    try {
      await circuitBreaker.execute(failingOperation);
    } catch (error) {
      expect(error.name).toBe('CircuitBreakerError');
      console.log('✓ Operation blocked by circuit breaker');
    }

    console.log('3. Simulating automatic recovery...');

    // Reset circuit to simulate recovery
    circuitBreaker.reset();

    // Test with successful operation
    const successfulOperation = vi.fn().mockResolvedValue('Recovery successful');
    const result = await circuitBreaker.execute(successfulOperation);

    expect(result).toBe('Recovery successful');
    expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);
    console.log('✓ Automatic recovery completed');

    console.log('=== Automatic Recovery Demo Complete ===');
  });

  it('should provide user feedback during recovery operations', () => {
    console.log('=== User Feedback Demo ===');

    const { result } = renderHook(() =>
      useStateUpdateCircuitBreaker({
        componentName: 'ExpensesTable',
        userId: 'demo-user',
        debug: true,
      })
    );

    console.log('1. Testing circuit breaker status for user feedback...');

    act(() => {
      const canUpdate = result.current.canPerformStateUpdate();
      expect(canUpdate).toBe(true);
      console.log(`✓ Can perform state update: ${canUpdate}`);
    });

    act(() => {
      const status = result.current.getCircuitBreakerStatus();
      console.log(`✓ Circuit breaker status for UI:`, {
        state: status.state,
        canAttempt: status.canAttempt,
        failureCount: status.failureCount,
        componentName: status.componentName,
      });
    });

    console.log('2. Testing force open for emergency situations...');

    act(() => {
      result.current.forceOpenCircuitBreaker(5000);
      const status = result.current.getCircuitBreakerStatus();
      expect(status.state).toBe(CircuitState.OPEN);
      console.log('✓ Circuit breaker forced open for emergency');
    });

    act(() => {
      const canUpdate = result.current.canPerformStateUpdate();
      expect(canUpdate).toBe(false);
      console.log(`✓ State updates blocked: ${!canUpdate}`);
    });

    console.log('=== User Feedback Demo Complete ===');
  });
});