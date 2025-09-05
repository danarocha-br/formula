/**
 * Circuit Breaker utility to prevent infinite loops and cascading failures
 * in React Query mutations and other operations
 */

export interface CircuitBreakerConfig {
  /** Maximum number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in milliseconds to wait before attempting to close the circuit */
  resetTimeout: number;
  /** Time window in milliseconds to track failures */
  monitoringWindow: number;
  /** Optional name for debugging */
  name?: string;
}

export enum CircuitState {
  CLOSED = "CLOSED",     // Normal operation
  OPEN = "OPEN",         // Circuit is open, rejecting calls
  HALF_OPEN = "HALF_OPEN" // Testing if service has recovered
}

interface FailureRecord {
  timestamp: number;
  error: Error;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: FailureRecord[] = [];
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for ${this.config.name || 'operation'}. Next attempt allowed at ${new Date(this.nextAttemptTime).toISOString()}`,
          this.state
        );
      }
      // Transition to HALF_OPEN to test the service
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute a synchronous function with circuit breaker protection
   */
  executeSync<T>(fn: () => T): T {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN for ${this.config.name || 'operation'}. Next attempt allowed at ${new Date(this.nextAttemptTime).toISOString()}`,
          this.state
        );
      }
      // Transition to HALF_OPEN to test the service
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = [];
    this.lastFailureTime = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      // After a few successful calls in HALF_OPEN, close the circuit
      if (this.successCount >= 2) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure(error: Error): void {
    const now = Date.now();

    // Clean up old failures outside the monitoring window
    this.failures = this.failures.filter(
      failure => now - failure.timestamp < this.config.monitoringWindow
    );

    // Add the new failure
    this.failures.push({ timestamp: now, error });
    this.lastFailureTime = now;

    // Check if we should open the circuit
    if (this.failures.length >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.config.resetTimeout;

      console.warn(`Circuit breaker OPENED for ${this.config.name || 'operation'}. Failures: ${this.failures.length}/${this.config.failureThreshold}`);
    } else if (this.state === CircuitState.HALF_OPEN) {
      // If we fail in HALF_OPEN, go back to OPEN
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = now + this.config.resetTimeout;
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failures.length,
      failureThreshold: this.config.failureThreshold,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      isOpen: this.state === CircuitState.OPEN,
      canAttempt: this.state !== CircuitState.OPEN || Date.now() >= this.nextAttemptTime,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.successCount = 0;
  }

  /**
   * Force the circuit breaker to open (for testing or manual intervention)
   */
  forceOpen(duration?: number): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + (duration || this.config.resetTimeout);
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly circuitState: CircuitState) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

/**
 * Default configurations for different types of operations
 */
export const CircuitBreakerConfigs = {
  // For React Query mutations that might cause infinite loops
  mutation: {
    failureThreshold: 3,
    resetTimeout: 5000, // 5 seconds
    monitoringWindow: 30000, // 30 seconds
  } as CircuitBreakerConfig,

  // For cache operations that might fail repeatedly
  cache: {
    failureThreshold: 5,
    resetTimeout: 2000, // 2 seconds
    monitoringWindow: 10000, // 10 seconds
  } as CircuitBreakerConfig,

  // For API calls
  api: {
    failureThreshold: 3,
    resetTimeout: 10000, // 10 seconds
    monitoringWindow: 60000, // 1 minute
  } as CircuitBreakerConfig,
} as const;

/**
 * Global circuit breaker instances for common operations
 */
export const circuitBreakers = {
  createExpense: new CircuitBreaker({
    ...CircuitBreakerConfigs.mutation,
    name: "createExpense",
  }),
  updateExpense: new CircuitBreaker({
    ...CircuitBreakerConfigs.mutation,
    name: "updateExpense",
  }),
  deleteExpense: new CircuitBreaker({
    ...CircuitBreakerConfigs.mutation,
    name: "deleteExpense",
  }),
  cacheUpdate: new CircuitBreaker({
    ...CircuitBreakerConfigs.cache,
    name: "cacheUpdate",
  }),
} as const;

/**
 * Utility function to create a circuit breaker with retry logic
 */
export function withCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  circuitBreaker: CircuitBreaker
) {
  return async (...args: T): Promise<R> => {
    return circuitBreaker.execute(() => fn(...args));
  };
}

/**
 * Utility function for synchronous operations
 */
export function withCircuitBreakerSync<T extends any[], R>(
  fn: (...args: T) => R,
  circuitBreaker: CircuitBreaker
) {
  return (...args: T): R => {
    return circuitBreaker.executeSync(() => fn(...args));
  };
}