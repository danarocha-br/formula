import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerConfigs, CircuitState } from '../circuit-breaker';
import { cacheErrorManager } from '../cache-error-handling';

describe('Circuit Breaker Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheErrorManager.clearErrorLog();
    cacheErrorManager.resetCircuitBreakers();
  });

  it('should integrate circuit breaker with cache error manager', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockRejectedValueOnce(new Error('Third failure'))
      .mockResolvedValueOnce('Success after recovery');

    // Execute operations that will trigger circuit breaker
    try {
      await cacheErrorManager.executeWithErrorHandling(operation, {
        operationName: 'test-state-update',
        feature: 'expenses',
        useCircuitBreaker: true,
        useRetry: false, // Disable retry to test circuit breaker directly
      });
    } catch (error) {
      // Expected to fail
    }

    try {
      await cacheErrorManager.executeWithErrorHandling(operation, {
        operationName: 'test-state-update',
        feature: 'expenses',
        useCircuitBreaker: true,
        useRetry: false,
      });
    } catch (error) {
      // Expected to fail
    }

    try {
      await cacheErrorManager.executeWithErrorHandling(operation, {
        operationName: 'test-state-update',
        feature: 'expenses',
        useCircuitBreaker: true,
        useRetry: false,
      });
    } catch (error) {
      // Expected to fail
    }

    // Circuit should be open now
    const circuitBreakerStatuses = cacheErrorManager.getCircuitBreakerStatuses();
    const stateUpdateCircuit = circuitBreakerStatuses['expenses-test-state-update'];

    expect(stateUpdateCircuit).toBeDefined();
    expect(stateUpdateCircuit.state).toBe('OPEN');
    expect(stateUpdateCircuit.failureCount).toBeGreaterThan(0);
  });

  it('should create circuit breaker for state updates', () => {
    const circuitBreaker = new CircuitBreaker({
      ...CircuitBreakerConfigs.mutation,
      name: 'state-updates-TestComponent',
      failureThreshold: 3,
      resetTimeout: 5000,
    });

    expect(circuitBreaker).toBeDefined();
    expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);
    expect(circuitBreaker.getStatus().failureThreshold).toBe(3);
  });

  it('should handle state update failures with circuit breaker', async () => {
    const circuitBreaker = new CircuitBreaker({
      ...CircuitBreakerConfigs.mutation,
      name: 'state-updates-TestComponent',
      failureThreshold: 2,
      resetTimeout: 1000,
    });

    const failingStateUpdate = vi.fn().mockRejectedValue(new Error('State update failed'));

    // First failure
    try {
      await circuitBreaker.execute(failingStateUpdate);
    } catch (error) {
      expect(error.message).toBe('State update failed');
    }

    // Second failure - should open circuit
    try {
      await circuitBreaker.execute(failingStateUpdate);
    } catch (error) {
      expect(error.message).toBe('State update failed');
    }

    // Circuit should be open
    expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);

    // Third attempt should be blocked
    try {
      await circuitBreaker.execute(failingStateUpdate);
    } catch (error) {
      expect(error.name).toBe('CircuitBreakerError');
      expect(error.message).toContain('Circuit breaker is OPEN');
    }

    // Should have only called the function twice (third was blocked)
    expect(failingStateUpdate).toHaveBeenCalledTimes(2);
  });

  it('should recover from circuit breaker open state', async () => {
    vi.useFakeTimers();

    const circuitBreaker = new CircuitBreaker({
      ...CircuitBreakerConfigs.mutation,
      name: 'state-updates-TestComponent',
      failureThreshold: 2,
      resetTimeout: 1000,
    });

    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Failure 1'))
      .mockRejectedValueOnce(new Error('Failure 2'))
      .mockResolvedValueOnce('Recovery success');

    // Cause failures to open circuit
    try {
      await circuitBreaker.execute(operation);
    } catch (error) {
      // Expected
    }

    try {
      await circuitBreaker.execute(operation);
    } catch (error) {
      // Expected
    }

    expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);

    // Fast forward time to allow recovery
    vi.advanceTimersByTime(1500);

    // Should transition to half-open and allow one attempt
    const result = await circuitBreaker.execute(operation);
    expect(result).toBe('Recovery success');
    expect(circuitBreaker.getStatus().state).toBe(CircuitState.HALF_OPEN);

    vi.useRealTimers();
  });

  it('should provide comprehensive error statistics', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Validation failed'))
      .mockResolvedValueOnce('Success');

    // Execute operations to generate statistics
    try {
      await cacheErrorManager.executeWithErrorHandling(operation, {
        operationName: 'test-operation',
        feature: 'expenses',
        useCircuitBreaker: true,
        useRetry: false,
      });
    } catch (error) {
      // Expected
    }

    try {
      await cacheErrorManager.executeWithErrorHandling(operation, {
        operationName: 'test-operation',
        feature: 'expenses',
        useCircuitBreaker: true,
        useRetry: false,
      });
    } catch (error) {
      // Expected
    }

    await cacheErrorManager.executeWithErrorHandling(operation, {
      operationName: 'test-operation',
      feature: 'expenses',
      useCircuitBreaker: true,
      useRetry: false,
    });

    const stats = cacheErrorManager.getErrorStatistics();
    expect(stats.totalErrors).toBe(2);
    expect(stats.errorsByFeature.expenses).toBe(2);
    expect(stats.recentErrors).toHaveLength(2);
  });
});