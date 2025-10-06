"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Icon } from "@repo/design-system/components/ui/icon";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { useTranslations } from "@/hooks/use-translation";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import {
  CircuitBreaker,
  CircuitBreakerConfigs,
  CircuitState,
  CircuitBreakerError,
} from "@/utils/circuit-breaker";
import { cacheErrorManager } from "@/utils/cache-error-handling";

interface Props {
  children: ReactNode;
  userId: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  renderCount: number;
  isInfiniteLoop: boolean;
  lastErrorTime: number;
  consecutiveErrors: number;
  circuitBreakerState: CircuitState;
  stateUpdateFailures: number;
  isRecovering: boolean;
  recoveryAttempts: number;
}

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay
const MAX_RENDER_COUNT = 50; // Maximum renders before considering infinite loop
const INFINITE_LOOP_TIME_WINDOW = 5000; // 5 seconds window for detecting rapid errors
const MAX_CONSECUTIVE_ERRORS = 5; // Maximum consecutive errors before circuit breaker
const MAX_STATE_UPDATE_FAILURES = 3; // Maximum state update failures before circuit breaker
const RECOVERY_TIMEOUT = 10000; // 10 seconds recovery timeout
const MAX_RECOVERY_ATTEMPTS = 2; // Maximum recovery attempts

export class ExpensesErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private renderStartTime: number = Date.now();
  private circuitBreakerTimeoutId: NodeJS.Timeout | null = null;
  private recoveryTimeoutId: NodeJS.Timeout | null = null;
  private stateUpdateCircuitBreaker: CircuitBreaker;
  private renderCountResetTimeoutId: NodeJS.Timeout | null = null;
  private renderCount: number = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      renderCount: 0,
      isInfiniteLoop: false,
      lastErrorTime: 0,
      consecutiveErrors: 0,
      circuitBreakerState: CircuitState.CLOSED,
      stateUpdateFailures: 0,
      isRecovering: false,
      recoveryAttempts: 0,
    };

    // Initialize circuit breaker for state updates
    this.stateUpdateCircuitBreaker = new CircuitBreaker({
      ...CircuitBreakerConfigs.mutation,
      name: `expenses-state-updates-${props.userId}`,
      failureThreshold: MAX_STATE_UPDATE_FAILURES,
      resetTimeout: RECOVERY_TIMEOUT,
    });
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const now = Date.now();
    const isMaxUpdateDepthError =
      error.message?.includes("Maximum update depth exceeded") ||
      error.message?.includes("Too many re-renders") ||
      (error.name === "Error" && error.message?.includes("update depth"));

    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      isInfiniteLoop: isMaxUpdateDepthError,
      lastErrorTime: now,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now();
    const timeSinceLastError = now - this.state.lastErrorTime;
    const isRapidError = timeSinceLastError < INFINITE_LOOP_TIME_WINDOW;
    const consecutiveErrors = isRapidError
      ? this.state.consecutiveErrors + 1
      : 1;

    // Detect infinite loop patterns
    const isInfiniteLoop =
      this.state.isInfiniteLoop ||
      consecutiveErrors >= MAX_CONSECUTIVE_ERRORS ||
      error.message?.includes("Maximum update depth exceeded") ||
      error.message?.includes("Too many re-renders");

    // Log error details for debugging
    console.error("ExpensesErrorBoundary caught an error:", error, errorInfo, {
      renderCount: this.renderCount,
      consecutiveErrors,
      isInfiniteLoop,
      timeSinceLastError,
    });

    this.setState({
      error,
      errorInfo,
      isInfiniteLoop,
      consecutiveErrors,
      lastErrorTime: now,
    });

    // If infinite loop detected, activate circuit breaker
    if (isInfiniteLoop && !this.circuitBreakerTimeoutId) {
      this.activateCircuitBreaker();
    }

    // Report error to monitoring service if available
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "exception", {
        description: error.message,
        fatal: isInfiniteLoop,
        custom_map: {
          component: "ExpensesErrorBoundary",
          userId: this.props.userId,
          retryCount: this.state.retryCount,
          renderCount: this.renderCount,
          isInfiniteLoop,
          consecutiveErrors,
        },
      });
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    if (this.circuitBreakerTimeoutId) {
      clearTimeout(this.circuitBreakerTimeoutId);
    }
    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
    }
    if (this.renderCountResetTimeoutId) {
      clearTimeout(this.renderCountResetTimeoutId);
    }
  }

  componentDidUpdate() {
    // Track render count using instance variable instead of state to avoid infinite loop
    this.renderCount = (this.renderCount || 0) + 1;

    // Check if we've exceeded maximum render count
    if (this.renderCount > MAX_RENDER_COUNT) {
      const renderTime = Date.now() - this.renderStartTime;
      if (renderTime < INFINITE_LOOP_TIME_WINDOW) {
        console.warn(
          "Potential infinite loop detected: excessive renders in short time",
          {
            renderCount: this.renderCount,
            renderTime,
          }
        );

        // Only update state if we haven't already detected an infinite loop
        if (!this.state.isInfiniteLoop && !this.state.hasError) {
          this.setState({
            isInfiniteLoop: true,
            hasError: true,
            error: new Error(
              "Infinite loop detected: Too many renders in short time"
            ),
            renderCount: this.renderCount,
          });
        }
      }
    }
  }

  private activateCircuitBreaker = () => {
    console.warn("Circuit breaker activated due to infinite loop detection");

    // Update circuit breaker state
    this.setState({
      circuitBreakerState: CircuitState.OPEN,
      isRecovering: false,
    });

    // Implement exponential backoff for circuit breaker recovery
    const backoffDelay = Math.min(
      RETRY_DELAY_BASE * Math.pow(2, this.state.consecutiveErrors),
      30000
    ); // Max 30 seconds

    this.circuitBreakerTimeoutId = setTimeout(() => {
      console.log("Circuit breaker attempting recovery");
      this.attemptRecovery();
    }, backoffDelay);
  };

  /**
   * Attempt automatic recovery from circuit breaker state
   */
  private attemptRecovery = async () => {
    if (this.state.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      console.warn(
        "Maximum recovery attempts reached, manual intervention required"
      );
      return;
    }

    this.setState({
      isRecovering: true,
      recoveryAttempts: this.state.recoveryAttempts + 1,
      circuitBreakerState: CircuitState.HALF_OPEN,
    });

    try {
      // Attempt to reset state and clear problematic data
      await this.performStateReset();

      // If successful, close the circuit
      this.setState({
        isInfiniteLoop: false,
        consecutiveErrors: 0,
        renderCount: 0,
        stateUpdateFailures: 0,
        circuitBreakerState: CircuitState.CLOSED,
        isRecovering: false,
      });

      this.renderStartTime = Date.now();
      this.renderCount = 0;
      this.stateUpdateCircuitBreaker.reset();
      this.circuitBreakerTimeoutId = null;

      console.log("Circuit breaker recovery successful");
    } catch (error) {
      console.error("Circuit breaker recovery failed:", error);

      // Recovery failed, go back to open state
      this.setState({
        circuitBreakerState: CircuitState.OPEN,
        isRecovering: false,
      });

      // Schedule another recovery attempt with longer delay
      const nextAttemptDelay =
        RECOVERY_TIMEOUT * Math.pow(2, this.state.recoveryAttempts);
      this.recoveryTimeoutId = setTimeout(() => {
        this.attemptRecovery();
      }, nextAttemptDelay);
    }
  };

  /**
   * Perform comprehensive state reset during recovery
   */
  private performStateReset = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // Clear any pending timeouts
        if (this.renderCountResetTimeoutId) {
          clearTimeout(this.renderCountResetTimeoutId);
        }

        // Reset render tracking
        this.renderStartTime = Date.now();

        // Use cache error manager to clear related cache
        const recoveryManager =
          cacheErrorManager.getRecoveryManager("expenses");

        // Register a simple recovery strategy if not already registered
        recoveryManager.registerRecoveryStrategy("state-reset", async () => {
          // This is a simple state reset - more complex recovery can be added
          console.log("Performing state reset recovery");
        });

        // Reset render count to prevent immediate re-triggering
        this.renderCount = 0;

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  /**
   * Execute state update with circuit breaker protection
   */
  public async executeStateUpdate<T>(
    operation: () => Promise<T> | T,
    operationName = "state-update"
  ): Promise<T> {
    try {
      const result = await this.stateUpdateCircuitBreaker.execute(async () => {
        if (typeof operation === "function") {
          const result = operation();
          return result instanceof Promise ? await result : result;
        }
        return operation;
      });

      // Update circuit breaker state on success
      const status = this.stateUpdateCircuitBreaker.getStatus();
      if (status.state !== this.state.circuitBreakerState) {
        this.setState({ circuitBreakerState: status.state });
      }

      return result;
    } catch (error) {
      // Handle circuit breaker errors
      if (error instanceof CircuitBreakerError) {
        console.warn(
          `State update blocked by circuit breaker: ${operationName}`,
          error
        );

        this.setState((prevState) => ({
          stateUpdateFailures: prevState.stateUpdateFailures + 1,
          circuitBreakerState: error.circuitState,
        }));

        // If circuit is open and we haven't started recovery, start it
        if (
          error.circuitState === CircuitState.OPEN &&
          !this.state.isRecovering
        ) {
          this.activateCircuitBreaker();
        }
      }

      // Update circuit breaker state
      const status = this.stateUpdateCircuitBreaker.getStatus();
      if (status.state !== this.state.circuitBreakerState) {
        this.setState({ circuitBreakerState: status.state });
      }

      throw error;
    }
  }

  /**
   * Check if state updates are currently allowed
   */
  public canPerformStateUpdate(): boolean {
    const status = this.stateUpdateCircuitBreaker.getStatus();
    return status.canAttempt && !this.state.isInfiniteLoop;
  }

  /**
   * Get circuit breaker status for debugging
   */
  public getCircuitBreakerStatus() {
    return {
      ...this.stateUpdateCircuitBreaker.getStatus(),
      stateUpdateFailures: this.state.stateUpdateFailures,
      isRecovering: this.state.isRecovering,
      recoveryAttempts: this.state.recoveryAttempts,
    };
  }

  private calculateRetryDelay = (
    retryCount: number,
    baseDelay: number = RETRY_DELAY_BASE
  ): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc. with configurable base delay
    return baseDelay * Math.pow(2, retryCount);
  };

  private handleRetry = () => {
    const { retryCount, isInfiniteLoop } = this.state;

    if (retryCount >= MAX_RETRY_COUNT) {
      return;
    }

    // For infinite loops, use longer delays
    const baseDelay = isInfiniteLoop ? RETRY_DELAY_BASE * 2 : RETRY_DELAY_BASE;
    const delay = this.calculateRetryDelay(retryCount, baseDelay);

    this.setState({
      retryCount: retryCount + 1,
    });

    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        renderCount: 0,
        consecutiveErrors: Math.max(0, this.state.consecutiveErrors - 1), // Reduce consecutive errors on retry
      });
      this.renderStartTime = Date.now();
      this.renderCount = 0;
    }, delay);
  };

  private handleReset = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    if (this.circuitBreakerTimeoutId) {
      clearTimeout(this.circuitBreakerTimeoutId);
      this.circuitBreakerTimeoutId = null;
    }

    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
      this.recoveryTimeoutId = null;
    }

    if (this.renderCountResetTimeoutId) {
      clearTimeout(this.renderCountResetTimeoutId);
      this.renderCountResetTimeoutId = null;
    }

    // Reset circuit breaker
    this.stateUpdateCircuitBreaker.reset();

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      renderCount: 0,
      isInfiniteLoop: false,
      lastErrorTime: 0,
      consecutiveErrors: 0,
      circuitBreakerState: CircuitState.CLOSED,
      stateUpdateFailures: 0,
      isRecovering: false,
      recoveryAttempts: 0,
    });

    this.renderStartTime = Date.now();
    this.renderCount = 0;
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ExpensesErrorFallback
          error={this.state.error}
          retryCount={this.state.retryCount}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          userId={this.props.userId}
          isInfiniteLoop={this.state.isInfiniteLoop}
          renderCount={this.state.renderCount}
          consecutiveErrors={this.state.consecutiveErrors}
          circuitBreakerState={this.state.circuitBreakerState}
          stateUpdateFailures={this.state.stateUpdateFailures}
          isRecovering={this.state.isRecovering}
          recoveryAttempts={this.state.recoveryAttempts}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  retryCount: number;
  onRetry: () => void;
  onReset: () => void;
  userId: string;
  isInfiniteLoop: boolean;
  renderCount: number;
  consecutiveErrors: number;
  circuitBreakerState: CircuitState;
  stateUpdateFailures: number;
  isRecovering: boolean;
  recoveryAttempts: number;
}

const ExpensesErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retryCount,
  onRetry,
  onReset,
  userId,
  isInfiniteLoop,
  renderCount,
  consecutiveErrors,
  circuitBreakerState,
  stateUpdateFailures,
  isRecovering,
  recoveryAttempts,
}) => {
  const { t } = useTranslations();
  const queryClient = useQueryClient();

  const handleClearCache = () => {
    // Clear all expenses-related cache
    const queryKey = reactQueryKeys.fixedExpenses.byUserId(userId);
    queryClient.removeQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey });

    // Reset the error boundary
    onReset();
  };

  const isStackOverflowError =
    error?.message?.includes("Maximum call stack size exceeded") ||
    error?.name === "RangeError";

  const isMaxUpdateDepthError =
    error?.message?.includes("Maximum update depth exceeded") ||
    error?.message?.includes("Too many re-renders") ||
    isInfiniteLoop;

  const canRetry =
    retryCount < MAX_RETRY_COUNT &&
    !isInfiniteLoop &&
    circuitBreakerState !== CircuitState.OPEN;
  const baseDelay = isInfiniteLoop ? RETRY_DELAY_BASE * 2 : RETRY_DELAY_BASE;
  const nextRetryDelay = baseDelay * Math.pow(2, retryCount);

  const isCircuitBreakerOpen = circuitBreakerState === CircuitState.OPEN;
  const isCircuitBreakerHalfOpen =
    circuitBreakerState === CircuitState.HALF_OPEN;

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Icon name="alert-triangle" size="md" className="text-red-600" />
          </div>
          <CardTitle className="text-lg">
            {isMaxUpdateDepthError
              ? t("errors.infinite-loop.title")
              : isStackOverflowError
                ? t("errors.stack-overflow.title")
                : t("errors.generic.title")}
          </CardTitle>
          <CardDescription>
            {isMaxUpdateDepthError
              ? t("errors.infinite-loop.description")
              : isStackOverflowError
                ? t("errors.stack-overflow.description")
                : t("errors.generic.description")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && error && (
            <details className="rounded border p-2 text-sm">
              <summary className="cursor-pointer font-medium text-red-600">
                Error Details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {error.message}
                {error.stack && `\n\nStack trace:\n${error.stack}`}
                {isInfiniteLoop &&
                  `\n\nInfinite Loop Detection:
- Render Count: ${renderCount}
- Consecutive Errors: ${consecutiveErrors}
- Is Infinite Loop: ${isInfiniteLoop}`}
              </pre>
            </details>
          )}

          {isInfiniteLoop && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">
                {t("errors.infinite-loop.detected.title")}
              </p>
              <p className="mt-1">
                {t("errors.infinite-loop.detected.description")}
              </p>
              {process.env.NODE_ENV === "development" && (
                <p className="mt-2 text-xs">
                  Renders: {renderCount} | Consecutive Errors:{" "}
                  {consecutiveErrors}
                </p>
              )}
            </div>
          )}

          {isCircuitBreakerOpen && (
            <div className="rounded bg-orange-50 p-3 text-sm text-orange-800">
              <p className="font-medium">
                {t("errors.circuit-breaker.open.title")}
              </p>
              <p className="mt-1">
                {t("errors.circuit-breaker.open.description")}
              </p>
              {isRecovering && (
                <div className="mt-2 flex items-center gap-2">
                  <Icon name="loader-2" size="sm" className="animate-spin" />
                  <span className="text-xs">
                    {t("errors.circuit-breaker.recovering")} (Attempt{" "}
                    {recoveryAttempts}/{MAX_RECOVERY_ATTEMPTS})
                  </span>
                </div>
              )}
              {process.env.NODE_ENV === "development" && (
                <p className="mt-2 text-xs">
                  State Update Failures: {stateUpdateFailures} | Circuit State:{" "}
                  {circuitBreakerState}
                </p>
              )}
            </div>
          )}

          {isCircuitBreakerHalfOpen && (
            <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
              <p className="font-medium">
                {t("errors.circuit-breaker.testing.title")}
              </p>
              <p className="mt-1">
                {t("errors.circuit-breaker.testing.description")}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {canRetry && !isRecovering && (
              <Button
                onClick={onRetry}
                variant="default"
                className="w-full"
                disabled={isCircuitBreakerOpen}
              >
                <Icon name="refresh-cw" size="sm" className="mr-2" />
                {retryCount > 0
                  ? t("errors.retry-with-delay", {
                      delay: Math.ceil(nextRetryDelay / 1000),
                    })
                  : t("errors.retry")}
              </Button>
            )}

            {isCircuitBreakerOpen &&
              !isRecovering &&
              recoveryAttempts < MAX_RECOVERY_ATTEMPTS && (
                <Button onClick={onReset} variant="outline" className="w-full">
                  <Icon name="zap" size="sm" className="mr-2" />
                  {t("errors.circuit-breaker.force-recovery")}
                </Button>
              )}

            <Button
              onClick={handleClearCache}
              variant="outline"
              className="w-full"
            >
              <Icon name="trash-2" size="sm" className="mr-2" />
              {t("errors.clear-cache")}
            </Button>

            <Button onClick={onReset} variant="ghost" className="w-full">
              <Icon name="x" size="sm" className="mr-2" />
              {t("errors.dismiss")}
            </Button>
          </div>

          {retryCount >= MAX_RETRY_COUNT && (
            <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
              <p className="font-medium">{t("errors.max-retries.title")}</p>
              <p className="mt-1">{t("errors.max-retries.description")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
