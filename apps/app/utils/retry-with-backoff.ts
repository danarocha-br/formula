/**
 * Retry utility with exponential backoff for failed operations
 */

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in milliseconds */
  baseDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Add random jitter to prevent thundering herd */
  jitter: boolean;
  /** Function to determine if an error should trigger a retry */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Optional name for debugging */
  name?: string;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error,
    public readonly allErrors: Error[]
  ) {
    super(message);
    this.name = "RetryError";
  }
}

/**
 * Default retry configurations for different scenarios
 */
export const RetryConfigs = {
  // For API calls that might have temporary network issues
  api: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    shouldRetry: (error: Error) => {
      // Retry on network errors, 5xx errors, but not on 4xx client errors
      return !error.message.includes("400") &&
             !error.message.includes("401") &&
             !error.message.includes("403") &&
             !error.message.includes("404");
    },
  } as RetryConfig,

  // For cache operations that might fail due to temporary issues
  cache: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitter: false,
    shouldRetry: (error: Error) => {
      // Don't retry on validation errors or type errors
      return !error.message.includes("validation") &&
             !error.message.includes("TypeError");
    },
  } as RetryConfig,

  // For mutations that might fail due to optimistic update conflicts
  mutation: {
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 3000,
    backoffMultiplier: 1.5,
    jitter: true,
    shouldRetry: (error: Error, attempt: number) => {
      // Only retry once for mutations, and not on validation errors
      return attempt === 1 &&
             !error.message.includes("validation") &&
             !error.message.includes("Maximum call stack size exceeded");
    },
  } as RetryConfig,
} as const;

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(config: RetryConfig, attempt: number): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

  if (config.jitter) {
    // Add random jitter between 0% and 25% of the delay
    const jitterAmount = cappedDelay * 0.25 * Math.random();
    return cappedDelay + jitterAmount;
  }

  return cappedDelay;
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  const startTime = Date.now();
  const errors: Error[] = [];

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await fn();

      if (config.name && attempt > 1) {
        console.log(`${config.name}: Succeeded on attempt ${attempt}/${config.maxAttempts}`);
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);

      // Check if we should retry this error
      if (config.shouldRetry && !config.shouldRetry(err, attempt)) {
        throw new RetryError(
          `${config.name || 'Operation'} failed (non-retryable error): ${err.message}`,
          attempt,
          err,
          errors
        );
      }

      // If this was the last attempt, throw the retry error
      if (attempt === config.maxAttempts) {
        const totalTime = Date.now() - startTime;
        throw new RetryError(
          `${config.name || 'Operation'} failed after ${attempt} attempts (${totalTime}ms): ${err.message}`,
          attempt,
          err,
          errors
        );
      }

      // Calculate delay and wait before next attempt
      const delay = calculateDelay(config, attempt);

      if (config.name) {
        console.warn(`${config.name}: Attempt ${attempt}/${config.maxAttempts} failed: ${err.message}. Retrying in ${Math.round(delay)}ms...`);
      }

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error("Unexpected end of retry loop");
}

/**
 * Retry a synchronous function (useful for cache operations)
 */
export function retrySync<T>(
  fn: () => T,
  config: Omit<RetryConfig, 'baseDelay' | 'maxDelay' | 'jitter'> & { delay?: number }
): T {
  const errors: Error[] = [];

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = fn();

      if (config.name && attempt > 1) {
        console.log(`${config.name}: Succeeded on attempt ${attempt}/${config.maxAttempts}`);
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);

      // Check if we should retry this error
      if (config.shouldRetry && !config.shouldRetry(err, attempt)) {
        throw new RetryError(
          `${config.name || 'Operation'} failed (non-retryable error): ${err.message}`,
          attempt,
          err,
          errors
        );
      }

      // If this was the last attempt, throw the retry error
      if (attempt === config.maxAttempts) {
        throw new RetryError(
          `${config.name || 'Operation'} failed after ${attempt} attempts: ${err.message}`,
          attempt,
          err,
          errors
        );
      }

      if (config.name) {
        console.warn(`${config.name}: Attempt ${attempt}/${config.maxAttempts} failed: ${err.message}. Retrying...`);
      }
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error("Unexpected end of retry loop");
}

/**
 * Create a wrapper function that automatically retries with the given config
 */
export function withRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config: RetryConfig
) {
  return async (...args: T): Promise<R> => {
    return retryWithBackoff(() => fn(...args), config);
  };
}

/**
 * Create a wrapper function for synchronous operations
 */
export function withRetrySync<T extends any[], R>(
  fn: (...args: T) => R,
  config: Omit<RetryConfig, 'baseDelay' | 'maxDelay' | 'jitter'> & { delay?: number }
) {
  return (...args: T): R => {
    return retrySync(() => fn(...args), config);
  };
}

/**
 * Utility to check if an error is a retry error
 */
export function isRetryError(error: unknown): error is RetryError {
  return error instanceof RetryError;
}

/**
 * Utility to extract the original error from a retry error
 */
export function getOriginalError(error: unknown): Error {
  if (isRetryError(error)) {
    return error.lastError;
  }
  return error instanceof Error ? error : new Error(String(error));
}