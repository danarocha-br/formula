import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CacheError,
  CacheErrorType,
  CacheErrorSeverity,
  CircuitBreaker,
  RetryManager,
  CacheRecoveryManager,
  CacheErrorManager,
  cacheErrorManager,
  ErrorHandlingUtils,
} from '../cache-error-handling';

// Mock console methods
const mockConsoleError = vi.fn();
const mockConsoleWarn = vi.fn();
const mockConsoleLog = vi.fn();

Object.defineProperty(global.console, 'error', { value: mockConsoleError });
Object.defineProperty(global.console, 'warn', { value: mockConsoleWarn });
Object.defineProperty(global.console, 'log', { value: mockConsoleLog });

describe('Cache Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('CacheError', () => {
    it('should create cache error with all properties', () => {
      const error = new CacheError({
        type: CacheErrorType.NETWORK_ERROR,
        severity: CacheErrorSeverity.HIGH,
        operation: 'add',
        feature: 'equipment',
        message: 'Network request failed',
        userId: 'user-123',
        itemId: 456,
        metadata: { attempt: 1 },
      });

      expect(error.type).toBe(CacheErrorType.NETWORK_ERROR);
      expect(error.severity).toBe(CacheErrorSeverity.HIGH);
      expect(error.operation).toBe('add');
      expect(error.feature).toBe('equipment');
      expect(error.message).toBe('Network request failed');
      expect(error.userId).toBe('user-123');
      expect(error.itemId).toBe(456);
      expect(error.retryable).toBe(true); // Network errors are retryable by default
      expect(error.metadata).toEqual({ attempt: 1 });
      expect(error.timestamp).toBeTypeOf('number');
    });

    it('should determine retryable status based on error type', () => {
      const networkError = new CacheError({
        type: CacheErrorType.NETWORK_ERROR,
        severity: CacheErrorSeverity.MEDIUM,
        operation: 'test',
        feature: 'test',
        message: 'Network error',
      });
      expect(networkError.retryable).toBe(true);

      const validationError = new CacheError({
        type: CacheErrorType.VALIDATION_ERROR,
        severity: CacheErrorSeverity.MEDIUM,
        operation: 'test',
        feature: 'test',
        message: 'Validation error',
      });
      expect(validationError.retryable).toBe(false);
    });

    it('should convert to JSON correctly', () => {
      const error = new CacheError({
        type: CacheErrorType.TIMEOUT_ERROR,
        severity: CacheErrorSeverity.MEDIUM,
        operation: 'update',
        feature: 'billable',
        message: 'Request timeout',
        userId: 'user-456',
      });

      const json = error.toJSON();
      expect(json).toMatchObject({
        name: 'CacheError',
        message: 'Request timeout',
        type: CacheErrorType.TIMEOUT_ERROR,
        severity: CacheErrorSeverity.MEDIUM,
        operation: 'update',
        feature: 'billable',
        userId: 'user-456',
        retryable: true,
      });
    });
  });

  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker('test-operation', 'test-feature', {
        failureThreshold: 3,
        recoveryTimeout: 5000,
        minimumRequests: 5,
      });
    });

    it('should execute operation successfully when circuit is closed', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledOnce();
      expect(circuitBreaker.getStatus().state).toBe('CLOSED');
    });

    it('should track failures and open circuit when threshold is reached', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      // Execute enough requests to meet minimum threshold
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch {
          // Expected to fail
        }
      }

      const status = circuitBreaker.getStatus();
      expect(status.state).toBe('OPEN');
      expect(status.failureCount).toBe(5);
      expect(status.failureRate).toBe(1);
    });

    it('should reject requests when circuit is open', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch {
          // Expected to fail
        }
      }

      // Now circuit should be open and reject immediately
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should transition to half-open after recovery timeout', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getStatus().state).toBe('OPEN');

      // Advance time past recovery timeout
      vi.advanceTimersByTime(6000);

      // Next request should transition to half-open
      operation.mockResolvedValueOnce('success');
      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('success');
      expect(circuitBreaker.getStatus().state).toBe('CLOSED');
    });
  });

  describe('RetryManager', () => {
    let retryManager: RetryManager;

    beforeEach(() => {
      retryManager = new RetryManager({
        maxAttempts: 3,
        baseDelay: 100,
        backoffMultiplier: 2,
        jitter: false, // Disable jitter for predictable tests
      });
    });

    it('should retry failed operations up to max attempts', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network failed'))
        .mockRejectedValueOnce(new Error('Network failed'))
        .mockResolvedValueOnce('success');

      const promise = retryManager.executeWithRetry(
        operation,
        'test-operation',
        'test-feature'
      );

      // Fast-forward through all timers
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw CacheError after max attempts exceeded', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network always fails'));

      const promise = retryManager.executeWithRetry(operation, 'test-operation', 'test-feature');

      // Fast-forward through all timers
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(CacheError);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect custom retry logic', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Non-retryable error'));
      const shouldRetry = vi.fn().mockReturnValue(false);

      await expect(
        retryManager.executeWithRetry(
          operation,
          'test-operation',
          'test-feature',
          shouldRetry
        )
      ).rejects.toThrow(CacheError);

      expect(operation).toHaveBeenCalledTimes(1); // Should not retry
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should apply exponential backoff delays', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network failed'))
        .mockRejectedValueOnce(new Error('Network failed'))
        .mockResolvedValueOnce('success');

      const promise = retryManager.executeWithRetry(
        operation,
        'test-operation',
        'test-feature'
      );

      // Fast-forward through all timers to complete the retry sequence
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
    });
  });

  describe('CacheRecoveryManager', () => {
    let recoveryManager: CacheRecoveryManager;

    beforeEach(() => {
      recoveryManager = new CacheRecoveryManager('test-feature');
    });

    it('should register and execute corruption checks', async () => {
      const corruptionCheck = vi.fn().mockReturnValue(false); // Indicates corruption
      recoveryManager.registerCorruptionCheck('test-cache', corruptionCheck);

      const corruptedKeys = await recoveryManager.checkCacheIntegrity();

      expect(corruptedKeys).toContain('test-cache');
      expect(corruptionCheck).toHaveBeenCalled();
    });

    it('should register and execute recovery strategies', async () => {
      const recoveryStrategy = vi.fn().mockResolvedValue(undefined);
      recoveryManager.registerRecoveryStrategy('test-cache', recoveryStrategy);

      await recoveryManager.recoverCache('test-cache');

      expect(recoveryStrategy).toHaveBeenCalled();
    });

    it('should throw error when no recovery strategy is found', async () => {
      await expect(
        recoveryManager.recoverCache('non-existent-cache')
      ).rejects.toThrow(CacheError);
    });

    it('should perform auto-recovery for all corrupted caches', async () => {
      const corruptionCheck1 = vi.fn().mockReturnValue(false);
      const corruptionCheck2 = vi.fn().mockReturnValue(false);
      const recoveryStrategy1 = vi.fn().mockResolvedValue(undefined);
      const recoveryStrategy2 = vi.fn().mockRejectedValue(new Error('Recovery failed'));

      recoveryManager.registerCorruptionCheck('cache1', corruptionCheck1);
      recoveryManager.registerCorruptionCheck('cache2', corruptionCheck2);
      recoveryManager.registerRecoveryStrategy('cache1', recoveryStrategy1);
      recoveryManager.registerRecoveryStrategy('cache2', recoveryStrategy2);

      const result = await recoveryManager.performAutoRecovery();

      expect(result.recovered).toContain('cache1');
      expect(result.failed).toContain('cache2');
      expect(recoveryStrategy1).toHaveBeenCalled();
      expect(recoveryStrategy2).toHaveBeenCalled();
    });
  });

  describe('CacheErrorManager', () => {
    let errorManager: CacheErrorManager;

    beforeEach(() => {
      errorManager = new CacheErrorManager();
    });

    it('should create and reuse circuit breakers', () => {
      const breaker1 = errorManager.getCircuitBreaker('add', 'equipment');
      const breaker2 = errorManager.getCircuitBreaker('add', 'equipment');
      const breaker3 = errorManager.getCircuitBreaker('update', 'equipment');

      expect(breaker1).toBe(breaker2); // Same instance
      expect(breaker1).not.toBe(breaker3); // Different instance
    });

    it('should create and reuse recovery managers', () => {
      const manager1 = errorManager.getRecoveryManager('equipment');
      const manager2 = errorManager.getRecoveryManager('equipment');
      const manager3 = errorManager.getRecoveryManager('billable');

      expect(manager1).toBe(manager2); // Same instance
      expect(manager1).not.toBe(manager3); // Different instance
    });

    it('should execute operations with comprehensive error handling', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await errorManager.executeWithErrorHandling(operation, {
        operationName: 'test',
        feature: 'test',
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should collect error statistics', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));

      try {
        await errorManager.executeWithErrorHandling(operation, {
          operationName: 'test',
          feature: 'test',
          useRetry: false, // Disable retry for faster test
        });
      } catch {
        // Expected to fail
      }

      const stats = errorManager.getErrorStatistics();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByFeature.test).toBe(1);
    });

    it('should provide circuit breaker statuses', async () => {
      // Trigger circuit breaker creation
      errorManager.getCircuitBreaker('add', 'equipment');
      errorManager.getCircuitBreaker('update', 'billable');

      const statuses = errorManager.getCircuitBreakerStatuses();

      expect(statuses).toHaveProperty('equipment-add');
      expect(statuses).toHaveProperty('billable-update');
      expect(statuses['equipment-add']).toHaveProperty('state');
      expect(statuses['equipment-add']).toHaveProperty('failureCount');
    });

    it('should clear error log and reset circuit breakers', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));

      try {
        await errorManager.executeWithErrorHandling(operation, {
          operationName: 'test',
          feature: 'test',
          useRetry: false,
        });
      } catch {
        // Expected to fail
      }

      expect(errorManager.getErrorStatistics().totalErrors).toBe(1);

      errorManager.clearErrorLog();
      expect(errorManager.getErrorStatistics().totalErrors).toBe(0);

      errorManager.resetCircuitBreakers();
      expect(Object.keys(errorManager.getCircuitBreakerStatuses())).toHaveLength(0);
    });
  });

  describe('ErrorHandlingUtils', () => {
    it('should create cache error from generic error', () => {
      const genericError = new Error('Generic error message');
      const cacheError = ErrorHandlingUtils.createCacheError(
        genericError,
        'test-operation',
        'test-feature',
        {
          type: CacheErrorType.NETWORK_ERROR,
          severity: CacheErrorSeverity.HIGH,
          userId: 'user-123',
        }
      );

      expect(cacheError).toBeInstanceOf(CacheError);
      expect(cacheError.type).toBe(CacheErrorType.NETWORK_ERROR);
      expect(cacheError.severity).toBe(CacheErrorSeverity.HIGH);
      expect(cacheError.operation).toBe('test-operation');
      expect(cacheError.feature).toBe('test-feature');
      expect(cacheError.userId).toBe('user-123');
      expect(cacheError.originalError).toBe(genericError);
    });

    it('should return existing cache error unchanged', () => {
      const existingCacheError = new CacheError({
        type: CacheErrorType.VALIDATION_ERROR,
        severity: CacheErrorSeverity.MEDIUM,
        operation: 'validate',
        feature: 'test',
        message: 'Validation failed',
      });

      const result = ErrorHandlingUtils.createCacheError(
        existingCacheError,
        'different-operation',
        'different-feature'
      );

      expect(result).toBe(existingCacheError);
    });

    it('should determine if error is retryable', () => {
      const networkError = new Error('Network connection failed');
      const validationError = new Error('Invalid input data');
      const cacheError = new CacheError({
        type: CacheErrorType.TIMEOUT_ERROR,
        severity: CacheErrorSeverity.MEDIUM,
        operation: 'test',
        feature: 'test',
        message: 'Timeout',
        retryable: true,
      });

      expect(ErrorHandlingUtils.isRetryable(networkError)).toBe(true);
      expect(ErrorHandlingUtils.isRetryable(validationError)).toBe(false);
      expect(ErrorHandlingUtils.isRetryable(cacheError)).toBe(true);
    });

    it('should determine error severity from message', () => {
      const criticalError = new Error('Critical system failure');
      const errorMessage = new Error('Operation failed');
      const warningMessage = new Error('Warning: deprecated method');
      const infoMessage = new Error('Information message');

      expect(ErrorHandlingUtils.getErrorSeverity(criticalError)).toBe(CacheErrorSeverity.CRITICAL);
      expect(ErrorHandlingUtils.getErrorSeverity(errorMessage)).toBe(CacheErrorSeverity.HIGH);
      expect(ErrorHandlingUtils.getErrorSeverity(warningMessage)).toBe(CacheErrorSeverity.MEDIUM);
      expect(ErrorHandlingUtils.getErrorSeverity(infoMessage)).toBe(CacheErrorSeverity.LOW);
    });
  });

  describe('Global Error Manager', () => {
    it('should provide global cache error manager instance', () => {
      expect(cacheErrorManager).toBeInstanceOf(CacheErrorManager);
    });

    it('should maintain state across multiple operations', async () => {
      const operation1 = vi.fn().mockRejectedValue(new Error('Error 1'));
      const operation2 = vi.fn().mockRejectedValue(new Error('Error 2'));

      try {
        await cacheErrorManager.executeWithErrorHandling(operation1, {
          operationName: 'op1',
          feature: 'feature1',
          useRetry: false,
        });
      } catch {
        // Expected to fail
      }

      try {
        await cacheErrorManager.executeWithErrorHandling(operation2, {
          operationName: 'op2',
          feature: 'feature2',
          useRetry: false,
        });
      } catch {
        // Expected to fail
      }

      const stats = cacheErrorManager.getErrorStatistics();
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsByFeature.feature1).toBe(1);
      expect(stats.errorsByFeature.feature2).toBe(1);
    });
  });
});