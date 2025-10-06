import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpensesErrorBoundary } from '../expenses-error-boundary';

// Mock the translation hook
vi.mock('@/hooks/use-translation', () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'errors.stack-overflow.title': 'System Error Detected',
        'errors.stack-overflow.description': 'We\'ve detected a system error that could affect your experience.',
        'errors.generic.title': 'Something Went Wrong',
        'errors.generic.description': 'An unexpected error occurred.',
        'errors.infinite-loop.title': 'Infinite Loop Detected',
        'errors.infinite-loop.description': 'The system detected an infinite loop that could cause performance issues.',
        'errors.infinite-loop.detected.title': 'Infinite Loop Prevention Active',
        'errors.infinite-loop.detected.description': 'We\'ve detected repeated errors and activated protection mechanisms.',
        'errors.retry': 'Try Again',
        'errors.retry-with-delay': `Retry in ${params?.delay || 0}s`,
        'errors.clear-cache': 'Clear Cache & Reload',
        'errors.dismiss': 'Dismiss',
        'errors.max-retries.title': 'Maximum Retries Reached',
        'errors.max-retries.description': 'We\'ve tried multiple times but couldn\'t complete the operation.',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock the query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws a stack overflow error
const ThrowStackOverflowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    const error = new RangeError('Maximum call stack size exceeded');
    throw error;
  }
  return <div>No error</div>;
};

// Component that throws a maximum update depth error
const ThrowMaxUpdateDepthError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    const error = new Error('Maximum update depth exceeded');
    throw error;
  }
  return <div>No error</div>;
};

// Component that throws too many re-renders error
const ThrowTooManyReRendersError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    const error = new Error('Too many re-renders. React limits the number of renders to prevent an infinite loop.');
    throw error;
  }
  return <div>No error</div>;
};

describe('ExpensesErrorBoundary', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    // Suppress console.error for these tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithProviders = (children: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  it('should render children when there is no error', () => {
    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowError shouldThrow={false} />
      </ExpensesErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error fallback when child component throws', () => {
    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument();
  });

  it('should render stack overflow specific error for stack overflow errors', () => {
    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowStackOverflowError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    expect(screen.getByText('System Error Detected')).toBeInTheDocument();
    expect(screen.getByText('We\'ve detected a system error that could affect your experience.')).toBeInTheDocument();
  });

  it('should show retry button and handle retry', async () => {
    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);

    // After clicking retry, the error boundary should attempt to recover
    // The component will still throw, so we should see the error again
    await waitFor(() => {
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    });
  });

  it('should show clear cache button and handle cache clearing', () => {
    const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    const clearCacheButton = screen.getByText('Clear Cache & Reload');
    expect(clearCacheButton).toBeInTheDocument();

    fireEvent.click(clearCacheButton);

    expect(removeQueriesSpy).toHaveBeenCalled();
    expect(invalidateQueriesSpy).toHaveBeenCalled();
  });

  it('should show dismiss button and handle dismissal', () => {
    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);

    // After dismissing, the error boundary should reset
    // The component will still throw, so we should see the error again
    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
  });

  it('should show max retries message after reaching retry limit', async () => {
    vi.useFakeTimers();

    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    // Click retry button multiple times to reach the limit
    for (let i = 0; i < 3; i++) {
      const retryButton = screen.getByText(/Try Again|Retry in/);
      fireEvent.click(retryButton);

      // Fast forward time for retry delay
      vi.advanceTimersByTime(2000);
      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      });
    }

    // After max retries, should show max retries message
    expect(screen.getByText('Maximum Retries Reached')).toBeInTheDocument();
    expect(screen.getByText('We\'ve tried multiple times but couldn\'t complete the operation.')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error fallback</div>;

    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user" fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    expect(screen.getByText('Error Details')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    expect(screen.queryByText('Error Details')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should detect maximum update depth errors as infinite loops', () => {
    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowMaxUpdateDepthError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    expect(screen.getByText('Infinite Loop Detected')).toBeInTheDocument();
    expect(screen.getByText('The system detected an infinite loop that could cause performance issues.')).toBeInTheDocument();
    expect(screen.getByText('Infinite Loop Prevention Active')).toBeInTheDocument();
  });

  it('should detect too many re-renders errors as infinite loops', () => {
    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowTooManyReRendersError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    expect(screen.getByText('Infinite Loop Detected')).toBeInTheDocument();
    expect(screen.getByText('The system detected an infinite loop that could cause performance issues.')).toBeInTheDocument();
    expect(screen.getByText('Infinite Loop Prevention Active')).toBeInTheDocument();
  });

  it('should disable retry button for infinite loop errors', () => {
    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowMaxUpdateDepthError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    // Retry button should not be present for infinite loop errors
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    expect(screen.queryByText(/Retry in/)).not.toBeInTheDocument();
  });

  it('should show infinite loop detection details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowMaxUpdateDepthError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    expect(screen.getByText('Error Details')).toBeInTheDocument();

    // Click to expand details
    fireEvent.click(screen.getByText('Error Details'));

    expect(screen.getByText(/Infinite Loop Detection:/)).toBeInTheDocument();
    expect(screen.getByText(/Render Count:/)).toBeInTheDocument();
    expect(screen.getByText(/Consecutive Errors:/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should reset all infinite loop tracking on reset', () => {
    renderWithProviders(
      <ExpensesErrorBoundary userId="test-user">
        <ThrowMaxUpdateDepthError shouldThrow={true} />
      </ExpensesErrorBoundary>
    );

    expect(screen.getByText('Infinite Loop Detected')).toBeInTheDocument();

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    // After reset, the component should still throw but tracking should be reset
    expect(screen.getByText('Infinite Loop Detected')).toBeInTheDocument();
  });
});