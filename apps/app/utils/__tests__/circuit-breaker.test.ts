import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CircuitBreaker, CircuitBreakerConfigs, CircuitBreakerError, CircuitState } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      monitoringWindow: 5000,
      name: 'test-circuit',
    });
  });

  describe('execute', () => {
    it('should execute function successfully when circuit is closed', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledOnce();
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);
    });

    it('should open circuit after failure threshold is reached', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      // Fail 3 times to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);
      expect(circuitBreaker.getStatus().failureCount).toBe(3);
    });

    it('should reject calls when circuit is open', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch (error) {
          // Expected to fail
        }
      }

      // Next call should be rejected immediately
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(CircuitBreakerError);
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);
    });

    it('should transition to half-open after reset timeout', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch (error) {
          // Expected to fail
        }
      }

      // Fast-forward time
      vi.useFakeTimers();
      vi.advanceTimersByTime(1001);

      // Mock successful call
      mockFn.mockResolvedValueOnce('success');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.HALF_OPEN);

      vi.useRealTimers();
    });

    it('should close circuit after successful calls in half-open state', async () => {
      const mockFn = vi.fn();

      // Open the circuit
      mockFn.mockRejectedValue(new Error('test error'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch (error) {
          // Expected to fail
        }
      }

      // Fast-forward time to allow reset
      vi.useFakeTimers();
      vi.advanceTimersByTime(1001);

      // Mock successful calls
      mockFn.mockResolvedValue('success');

      // First successful call transitions to half-open
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.HALF_OPEN);

      // Second successful call should close the circuit
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);

      vi.useRealTimers();
    });
  });

  describe('executeSync', () => {
    it('should execute synchronous function successfully', () => {
      const mockFn = vi.fn().mockReturnValue('sync success');

      const result = circuitBreaker.executeSync(mockFn);

      expect(result).toBe('sync success');
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should handle synchronous errors', () => {
      const mockFn = vi.fn().mockImplementation(() => {
        throw new Error('sync error');
      });

      expect(() => circuitBreaker.executeSync(mockFn)).toThrow('sync error');
    });
  });

  describe('reset', () => {
    it('should reset circuit breaker to initial state', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFn);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);

      circuitBreaker.reset();

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe(CircuitState.CLOSED);
      expect(status.failureCount).toBe(0);
      expect(status.lastFailureTime).toBe(0);
    });
  });

  describe('forceOpen', () => {
    it('should force circuit to open state', () => {
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED);

      circuitBreaker.forceOpen(2000);

      expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN);
      expect(circuitBreaker.getStatus().nextAttemptTime).toBeGreaterThan(Date.now());
    });
  });

  describe('getStatus', () => {
    it('should return correct status information', () => {
      const status = circuitBreaker.getStatus();

      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('failureCount');
      expect(status).toHaveProperty('failureThreshold');
      expect(status).toHaveProperty('lastFailureTime');
      expect(status).toHaveProperty('nextAttemptTime');
      expect(status).toHaveProperty('isOpen');
      expect(status).toHaveProperty('canAttempt');

      expect(status.state).toBe(CircuitState.CLOSED);
      expect(status.failureThreshold).toBe(3);
      expect(status.isOpen).toBe(false);
      expect(status.canAttempt).toBe(true);
    });
  });

  describe('CircuitBreakerConfigs', () => {
    it('should have predefined configurations', () => {
      expect(CircuitBreakerConfigs.mutation).toBeDefined();
      expect(CircuitBreakerConfigs.cache).toBeDefined();
      expect(CircuitBreakerConfigs.api).toBeDefined();

      expect(CircuitBreakerConfigs.mutation.failureThreshold).toBe(3);
      expect(CircuitBreakerConfigs.cache.failureThreshold).toBe(5);
      expect(CircuitBreakerConfigs.api.failureThreshold).toBe(3);
    });
  });
});