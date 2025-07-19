"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Component, type ReactNode } from "react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Icon } from "./icon";

/**
 * Simple ErrorBoundary implementation
 */
class ErrorBoundary extends Component<
  {
    children: ReactNode;
    fallbackRender: (props: { error: Error; resetErrorBoundary: () => void }) => ReactNode;
    onReset?: () => void;
    onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallbackRender({
        error: this.state.error,
        resetErrorBoundary: this.resetErrorBoundary,
      });
    }

    return this.props.children;
  }
}

interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: ErrorFallbackProps) => ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Default error fallback component with a clean UI
 */
function DefaultErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <Icon name="alert-triangle" className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-red-900">Something went wrong</CardTitle>
        <CardDescription>
          We encountered an error while loading your data. Please try again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <details className="rounded-md bg-gray-50 p-3">
          <summary className='cursor-pointer font-medium text-gray-700 text-sm'>
            Error details
          </summary>
          <pre className='mt-2 overflow-auto text-gray-600 text-xs'>
            {error.message}
          </pre>
        </details>
        <div className="flex gap-2">
          <Button onClick={resetErrorBoundary} className="flex-1">
            <Icon name="refresh-cw" className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            <Icon name="rotate-ccw" className="mr-2 h-4 w-4" />
            Reload page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Minimal error fallback for inline errors
 */
function MinimalErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
      <div className="flex items-start">
        <Icon name="alert-circle" className='mt-0.5 mr-3 h-5 w-5 text-red-400' />
        <div className="flex-1">
          <h3 className='font-medium text-red-800 text-sm'>
            Failed to load data
          </h3>
          <p className='mt-1 text-red-700 text-sm'>
            {error.message}
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={resetErrorBoundary}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <Icon name="refresh-cw" className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * QueryErrorBoundary component that integrates with React Query's error reset functionality
 *
 * @example
 * ```tsx
 * <QueryErrorBoundary>
 *   <MyComponent />
 * </QueryErrorBoundary>
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <QueryErrorBoundary fallback={({ error, resetErrorBoundary }) => (
 *   <div>Custom error: {error.message}</div>
 * )}>
 *   <MyComponent />
 * </QueryErrorBoundary>
 * ```
 */
export function QueryErrorBoundary({
  children,
  fallback = DefaultErrorFallback,
  onError
}: QueryErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={reset}
      onError={onError}
      fallbackRender={({ error, resetErrorBoundary }) =>
        fallback({ error, resetErrorBoundary })
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Inline QueryErrorBoundary with minimal styling for use within components
 */
export function InlineQueryErrorBoundary({
  children,
  onError
}: Omit<QueryErrorBoundaryProps, 'fallback'>) {
  return (
    <QueryErrorBoundary
      fallback={MinimalErrorFallback}
      onError={onError}
    >
      {children}
    </QueryErrorBoundary>
  );
}

/**
 * Hook to manually trigger error boundary reset
 * Useful for resetting errors from outside the boundary
 */
export function useQueryErrorReset() {
  const { reset } = useQueryErrorResetBoundary();
  return reset;
}