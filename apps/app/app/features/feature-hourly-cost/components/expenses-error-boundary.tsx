"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Icon } from "@repo/design-system/components/ui/icon";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { useTranslations } from "@/hooks/use-translation";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";

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
}

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

export class ExpensesErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error("ExpensesErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service if available
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "exception", {
        description: error.message,
        fatal: false,
        custom_map: {
          component: "ExpensesErrorBoundary",
          userId: this.props.userId,
          retryCount: this.state.retryCount,
        },
      });
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private calculateRetryDelay = (retryCount: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return RETRY_DELAY_BASE * Math.pow(2, retryCount);
  };

  private handleRetry = () => {
    const { retryCount } = this.state;

    if (retryCount >= MAX_RETRY_COUNT) {
      return;
    }

    const delay = this.calculateRetryDelay(retryCount);

    this.setState({
      retryCount: retryCount + 1,
    });

    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }, delay);
  };

  private handleReset = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ExpensesErrorFallback
        error={this.state.error}
        retryCount={this.state.retryCount}
        onRetry={this.handleRetry}
        onReset={this.handleReset}
        userId={this.props.userId}
      />;
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
}

const ExpensesErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retryCount,
  onRetry,
  onReset,
  userId,
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

  const isStackOverflowError = error?.message?.includes("Maximum call stack size exceeded") ||
                              error?.name === "RangeError";

  const canRetry = retryCount < MAX_RETRY_COUNT;
  const nextRetryDelay = RETRY_DELAY_BASE * Math.pow(2, retryCount);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Icon name="alert-triangle" size="md" className="text-red-600" />
          </div>
          <CardTitle className="text-lg">
            {isStackOverflowError
              ? t("errors.stack-overflow.title")
              : t("errors.generic.title")
            }
          </CardTitle>
          <CardDescription>
            {isStackOverflowError
              ? t("errors.stack-overflow.description")
              : t("errors.generic.description")
            }
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
              </pre>
            </details>
          )}

          <div className="flex flex-col gap-2">
            {canRetry && (
              <Button
                onClick={onRetry}
                variant="default"
                className="w-full"
              >
                <Icon name="refresh-cw" size="sm" className="mr-2" />
                {retryCount > 0
                  ? t("errors.retry-with-delay", { delay: Math.ceil(nextRetryDelay / 1000) })
                  : t("errors.retry")
                }
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

            <Button
              onClick={onReset}
              variant="ghost"
              className="w-full"
            >
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