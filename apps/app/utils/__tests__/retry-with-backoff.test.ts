import { describe, expect, it, vi } from 'vitest';
import { RetryConfigs, RetryError, getOriginalError, isRetryError, retrySync, retryWithBackoff } from '../retry-with-backoff';

describe('retryWithBackoff', () => {
  it('should succeed on first attempt', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(mockFn, {
      maxAttempts: 3,
      baseDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
      jitter: false,
    });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('should retry on failure and eventually succeed', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('attempt 1'))
      .mockRejectedValueOnce(new Error('attempt 2'))
      .mockResolvedValue('success');

    const result = await retryWithBackoff(mockFn, {
      maxAttempts: 3,
      baseDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
      jitter: false,
    });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should throw RetryError after max attempts', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('persistent error'));

    await expect(retryWithBackoff(mockFn, {
      maxAttempts: 2,
      baseDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
      jitter: false,
      name: 'test-operation',
    })).rejects.toThrow(RetryError);

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should respect shouldRetry function', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('validation error'));

    const shouldRetry = vi.fn().mockReturnValue(false);

    await expect(retryWithBackoff(mockFn, {
      maxAttempts: 3,
      baseDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
      jitter: false,
      shouldRetry,
    })).rejects.toThrow(RetryError);

    expect(mockFn).toHaveBeenCalledOnce();
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });
});

describe('retrySync', () => {
  it('should succeed on first attempt', () => {
    const mockFn = vi.fn().mockReturnValue('success');

    const result = retrySync(mockFn, {
      maxAttempts: 3,
      backoffMultiplier: 2,
    });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('should retry on failure and eventually succeed', () => {
    const mockFn = vi.fn()
      .mockImplementationOnce(() => { throw new Error('attempt 1'); })
      .mockImplementationOnce(() => { throw new Error('attempt 2'); })
      .mockReturnValue('success');

    const result = retrySync(mockFn, {
      maxAttempts: 3,
      backoffMultiplier: 2,
    });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should throw RetryError after max attempts', () => {
    const mockFn = vi.fn().mockImplementation(() => {
      throw new Error('persistent error');
    });

    expect(() => retrySync(mockFn, {
      maxAttempts: 2,
      backoffMultiplier: 2,
      name: 'test-sync-operation',
    })).toThrow(RetryError);

    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe('RetryConfigs', () => {
  it('should have predefined configurations', () => {
    expect(RetryConfigs.api).toBeDefined();
    expect(RetryConfigs.cache).toBeDefined();
    expect(RetryConfigs.mutation).toBeDefined();

    expect(RetryConfigs.api.maxAttempts).toBe(3);
    expect(RetryConfigs.cache.maxAttempts).toBe(2);
    expect(RetryConfigs.mutation.maxAttempts).toBe(2);
  });

  it('should have appropriate shouldRetry functions', () => {
    // API config should not retry on 4xx errors
    expect(RetryConfigs.api.shouldRetry?.(new Error('400 Bad Request'), 1)).toBe(false);
    expect(RetryConfigs.api.shouldRetry?.(new Error('401 Unauthorized'), 1)).toBe(false);
    expect(RetryConfigs.api.shouldRetry?.(new Error('500 Internal Server Error'), 1)).toBe(true);

    // Cache config should not retry on validation errors
    expect(RetryConfigs.cache.shouldRetry?.(new Error('validation failed'), 1)).toBe(false);
    expect(RetryConfigs.cache.shouldRetry?.(new Error('network error'), 1)).toBe(true);

    // Mutation config should not retry on stack overflow
    expect(RetryConfigs.mutation.shouldRetry?.(new Error('Maximum call stack size exceeded'), 1)).toBe(false);
    expect(RetryConfigs.mutation.shouldRetry?.(new Error('network error'), 1)).toBe(true);
    expect(RetryConfigs.mutation.shouldRetry?.(new Error('network error'), 2)).toBe(false); // Only retry once
  });
});

describe('RetryError', () => {
  it('should contain error details', () => {
    const originalError = new Error('original error');
    const allErrors = [new Error('error 1'), originalError];

    const retryError = new RetryError('Retry failed', 2, originalError, allErrors);

    expect(retryError.name).toBe('RetryError');
    expect(retryError.message).toBe('Retry failed');
    expect(retryError.attempts).toBe(2);
    expect(retryError.lastError).toBe(originalError);
    expect(retryError.allErrors).toBe(allErrors);
  });
});

describe('utility functions', () => {
  describe('isRetryError', () => {
    it('should identify RetryError instances', () => {
      const retryError = new RetryError('test', 1, new Error('test'), []);
      const regularError = new Error('test');

      expect(isRetryError(retryError)).toBe(true);
      expect(isRetryError(regularError)).toBe(false);
      expect(isRetryError('string')).toBe(false);
      expect(isRetryError(null)).toBe(false);
    });
  });

  describe('getOriginalError', () => {
    it('should extract original error from RetryError', () => {
      const originalError = new Error('original');
      const retryError = new RetryError('retry failed', 1, originalError, []);

      expect(getOriginalError(retryError)).toBe(originalError);
    });

    it('should return the error itself if not a RetryError', () => {
      const regularError = new Error('regular');

      expect(getOriginalError(regularError)).toBe(regularError);
    });

    it('should convert non-Error values to Error', () => {
      const result = getOriginalError('string error');

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('string error');
    });
  });
});