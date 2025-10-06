/**
 * State Update Circuit Breaker Utility
 * Provides circuit breaker protection for React state updates to prevent infinite loops
 */

import { useCallback, useRef } from 'react';
import { CircuitBreaker, CircuitBreakerConfigs, CircuitState, CircuitBreakerError } from './circuit-breaker';
import { cacheErrorManager } from './cache-error-handling';

interface StateUpdateCircuitBreakerConfig {
  /** Component name for debugging */
  componentName: string;
  /** User ID for tracking */
  userId?: string;
  /** Maximum state update failures before opening circuit */
  failureThreshold?: number;
  /** Recovery timeout in milliseconds */
  recoveryTimeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

interface StateUpdateResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  circuitState: CircuitState;
  canRetry: boolean;
}

/**
 * Hook for managing state updates with circuit breaker protection
 */
export function useStateUpdateCircuitBreaker(config: StateUpdateCircuitBreakerConfig) {
  const circuitBreakerRef = useRef<CircuitBreaker | null>(null);
  const failureCountRef = useRef(0);
  const lastFailureTimeRef = useRef(0);

  // Initialize circuit breaker
  if (!circuitBreakerRef.current) {
    circuitBreakerRef.current = new CircuitBreaker({
      ...CircuitBreakerConfigs.mutation,
      name: `state-updates-${config.componentName}`,
      failureThreshold: config.failureThreshold || 3,
      resetTimeout: config.recoveryTimeout || 5000,
    });
  }

  /**
   * Execute a state update with circuit breaker protection
   */
  const executeStateUpdate = useCallback(async <T>(
    operation: () => T | Promise<T>,
    operationName: string = 'state-update'
  ): Promise<StateUpdateResult<T>> => {
    const circuitBreaker = circuitBreakerRef.current!;

    try {
      if (config.debug) {
        console.log(`[StateUpdateCircuitBreaker] Executing ${operationName} for ${config.componentName}`);
      }

      const result = await circuitBreaker.execute(async () => {
        const operationResult = operation();
        return operationResult instanceof Promise ? await operationResult : operationResult;
      });

      // Reset failure count on success
      failureCountRef.current = 0;

      if (config.debug) {
        console.log(`[StateUpdateCircuitBreaker] ${operationName} succeeded for ${config.componentName}`);
      }

      return {
        success: true,
        result,
        circuitState: circuitBreaker.getStatus().state,
        canRetry: true,
      };

    } catch (error) {
      failureCountRef.current++;
      lastFailureTimeRef.current = Date.now();

      if (config.debug) {
        console.warn(`[StateUpdateCircuitBreaker] ${operationName} failed for ${config.componentName}:`, error);
      }

      // Handle circuit breaker errors specifically
      if (error instanceof CircuitBreakerError) {
        return {
          success: false,
          error,
          circuitState: error.circuitState,
          canRetry: error.circuitState !== CircuitState.OPEN,
        };
      }

      // Handle other errors
      const status = circuitBreaker.getStatus();
      return {
        success: false,
        error: error as Error,
        circuitState: status.state,
        canRetry: status.canAttempt,
      };
    }
  }, [config.componentName, config.debug]);

  /**
   * Execute a synchronous state update with circuit breaker protection
   */
  const executeStateUpdateSync = useCallback(<T>(
    operation: () => T,
    operationName: string = 'state-update-sync'
  ): StateUpdateResult<T> => {
    const circuitBreaker = circuitBreakerRef.current!;

    try {
      if (config.debug) {
        console.log(`[StateUpdateCircuitBreaker] Executing sync ${operationName} for ${config.componentName}`);
      }

      const result = circuitBreaker.executeSync(operation);

      // Reset failure count on success
      failureCountRef.current = 0;

      if (config.debug) {
        console.log(`[StateUpdateCircuitBreaker] Sync ${operationName} succeeded for ${config.componentName}`);
      }

      return {
        success: true,
        result,
        circuitState: circuitBreaker.getStatus().state,
        canRetry: true,
      };

    } catch (error) {
      failureCountRef.current++;
      lastFailureTimeRef.current = Date.now();

      if (config.debug) {
        console.warn(`[StateUpdateCircuitBreaker] Sync ${operationName} failed for ${config.componentName}:`, error);
      }

      // Handle circuit breaker errors specifically
      if (error instanceof CircuitBreakerError) {
        return {
          success: false,
          error,
          circuitState: error.circuitState,
          canRetry: error.circuitState !== CircuitState.OPEN,
        };
      }

      // Handle other errors
      const status = circuitBreaker.getStatus();
      return {
        success: false,
        error: error as Error,
        circuitState: status.state,
        canRetry: status.canAttempt,
      };
    }
  }, [config.componentName, config.debug]);

  /**
   * Check if state updates are currently allowed
   */
  const canPerformStateUpdate = useCallback((): boolean => {
    const status = circuitBreakerRef.current?.getStatus();
    return status?.canAttempt ?? true;
  }, []);

  /**
   * Get current circuit breaker status
   */
  const getCircuitBreakerStatus = useCallback(() => {
    const status = circuitBreakerRef.current?.getStatus();
    return {
      ...status,
      failureCount: failureCountRef.current,
      lastFailureTime: lastFailureTimeRef.current,
      componentName: config.componentName,
    };
  }, [config.componentName]);

  /**
   * Reset the circuit breaker
   */
  const resetCircuitBreaker = useCallback(() => {
    circuitBreakerRef.current?.reset();
    failureCountRef.current = 0;
    lastFailureTimeRef.current = 0;

    if (config.debug) {
      console.log(`[StateUpdateCircuitBreaker] Reset circuit breaker for ${config.componentName}`);
    }
  }, [config.componentName, config.debug]);

  /**
   * Force the circuit breaker to open (for testing or emergency situations)
   */
  const forceOpenCircuitBreaker = useCallback((duration?: number) => {
    circuitBreakerRef.current?.forceOpen(duration);

    if (config.debug) {
      console.log(`[StateUpdateCircuitBreaker] Forced circuit breaker open for ${config.componentName}`);
    }
  }, [config.componentName, config.debug]);

  return {
    executeStateUpdate,
    executeStateUpdateSync,
    canPerformStateUpdate,
    getCircuitBreakerStatus,
    resetCircuitBreaker,
    forceOpenCircuitBreaker,
  };
}

/**
 * Utility function to wrap state setters with circuit breaker protection
 */
export function withStateUpdateCircuitBreaker<T extends any[], R>(
  stateSetter: (...args: T) => R,
  circuitBreaker: CircuitBreaker,
  operationName: string = 'state-update'
) {
  return (...args: T): R | null => {
    try {
      return circuitBreaker.executeSync(() => stateSetter(...args));
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        console.warn(`State update blocked by circuit breaker: ${operationName}`, error);
        return null;
      }
      throw error;
    }
  };
}

/**
 * Enhanced batched state updates with circuit breaker protection
 */
export interface ProtectedStateUpdateOperation<T = any> {
  type: 'loading' | 'optimistic' | 'error' | 'newRows' | 'newRowForm' | 'editingCells' | 'hoveredRows';
  key?: string;
  value?: T;
  updater?: (prev: T) => T;
  operationName?: string;
}

export interface ProtectedBatchedStateUpdateConfig {
  operations: ProtectedStateUpdateOperation[];
  onComplete?: () => void;
  onError?: (error: Error, failedOperations: ProtectedStateUpdateOperation[]) => void;
  onCircuitBreakerOpen?: (status: any) => void;
}

/**
 * Execute batched state updates with circuit breaker protection
 */
export async function executeProtectedBatchedStateUpdate(
  config: ProtectedBatchedStateUpdateConfig,
  circuitBreaker: CircuitBreaker
): Promise<{
  success: boolean;
  completedOperations: ProtectedStateUpdateOperation[];
  failedOperations: ProtectedStateUpdateOperation[];
  circuitState: CircuitState;
}> {
  const completedOperations: ProtectedStateUpdateOperation[] = [];
  const failedOperations: ProtectedStateUpdateOperation[] = [];

  try {
    const result = await circuitBreaker.execute(async () => {
      // Execute all operations in the batch
      for (const operation of config.operations) {
        try {
          // This would be implemented by the calling component
          // For now, we just track the operation as completed
          completedOperations.push(operation);
        } catch (error) {
          failedOperations.push(operation);
          throw error;
        }
      }

      return { completedOperations, failedOperations };
    });

    config.onComplete?.();

    return {
      success: true,
      completedOperations,
      failedOperations,
      circuitState: circuitBreaker.getStatus().state,
    };

  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      config.onCircuitBreakerOpen?.(circuitBreaker.getStatus());
    } else {
      config.onError?.(error as Error, failedOperations);
    }

    return {
      success: false,
      completedOperations,
      failedOperations: config.operations, // All operations failed
      circuitState: circuitBreaker.getStatus().state,
    };
  }
}