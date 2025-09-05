# Error Handling and Recovery System

This document describes the comprehensive error handling and recovery mechanisms implemented for the expenses feature to prevent stack overflow bugs and provide robust error recovery.

## Components

### 1. Error Boundary (`ExpensesErrorBoundary`)

**Location**: `components/expenses-error-boundary.tsx`

**Purpose**: Catches JavaScript errors anywhere in the expenses component tree and displays a fallback UI instead of crashing the entire application.

**Features**:

- Detects stack overflow errors specifically and shows appropriate messaging
- Implements retry logic with exponential backoff (1s, 2s, 4s delays)
- Maximum of 3 retry attempts before showing permanent error state
- Cache clearing functionality to recover from corrupted state
- Development mode error details for debugging
- Automatic error reporting to analytics (if available)

**Usage**:

```tsx
<ExpensesErrorBoundary userId="user-123">
  <YourExpensesComponent />
</ExpensesErrorBoundary>
```

### 2. Circuit Breaker (`CircuitBreaker`)

**Location**: `utils/circuit-breaker.ts`

**Purpose**: Prevents cascading failures and infinite loops by temporarily stopping operations that are consistently failing.

**States**:

- **CLOSED**: Normal operation, all calls pass through
- **OPEN**: Circuit is open, calls are rejected immediately
- **HALF_OPEN**: Testing if the service has recovered

**Configuration**:

```typescript
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 3, // Open after 3 failures
  resetTimeout: 5000, // Wait 5s before trying again
  monitoringWindow: 30000, // Track failures over 30s
  name: "createExpense", // For debugging
});
```

**Global Instances**:

- `circuitBreakers.createExpense`: For create operations
- `circuitBreakers.updateExpense`: For update operations
- `circuitBreakers.deleteExpense`: For delete operations
- `circuitBreakers.cacheUpdate`: For cache operations

### 3. Retry with Backoff (`retryWithBackoff`)

**Location**: `utils/retry-with-backoff.ts`

**Purpose**: Automatically retries failed operations with exponential backoff to handle temporary failures.

**Features**:

- Exponential backoff (delays increase: 1s, 2s, 4s, 8s...)
- Maximum delay cap to prevent excessive waiting
- Optional jitter to prevent thundering herd problems
- Configurable retry conditions
- Detailed error information with attempt history

**Predefined Configurations**:

```typescript
// For API calls
RetryConfigs.api = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error) => !error.message.includes("4"), // Don't retry 4xx errors
};

// For cache operations
RetryConfigs.cache = {
  maxAttempts: 2,
  baseDelay: 500,
  maxDelay: 2000,
  shouldRetry: (error) => !error.message.includes("validation"),
};

// For mutations
RetryConfigs.mutation = {
  maxAttempts: 2,
  baseDelay: 1000,
  maxDelay: 3000,
  shouldRetry: (error, attempt) =>
    attempt === 1 &&
    !error.message.includes("Maximum call stack size exceeded"),
};
```

## Integration in Mutation Hooks

All mutation hooks (`useCreateFixedExpenses`, `useUpdateFixedExpense`, etc.) have been enhanced with:

### 1. Circuit Breaker Protection

```typescript
mutationFn: async (variables) => {
  return circuitBreakers.createExpense.execute(async () => {
    // API call logic here
  });
};
```

### 2. Retry Logic

```typescript
mutationFn: async (variables) => {
  return circuitBreakers.createExpense.execute(async () => {
    return retryWithBackoff(
      async () => {
        // API call logic here
      },
      {
        ...RetryConfigs.api,
        name: "createFixedExpense",
      }
    );
  });
};
```

### 3. Protected Cache Operations

```typescript
onMutate: async (variables) => {
  circuitBreakers.cacheUpdate.executeSync(() => {
    expenseCacheUtils.addExpense(queryClient, userId, expense);
  });
};
```

### 4. Enhanced Error Logging

```typescript
onError: (error, variables, context) => {
  console.error("Create expense mutation failed:", {
    error,
    userId: variables.json.userId,
    circuitBreakerStatus: circuitBreakers.createExpense.getStatus(),
  });
};
```

## Error Recovery Flow

1. **Normal Operation**: All systems work normally
2. **First Failure**: Retry with exponential backoff
3. **Repeated Failures**: Circuit breaker opens, preventing further attempts
4. **Recovery Period**: After timeout, circuit moves to half-open
5. **Test Recovery**: Limited attempts to see if service recovered
6. **Full Recovery**: Circuit closes, normal operation resumes

## Monitoring and Debugging

### Circuit Breaker Status

```typescript
const status = circuitBreakers.createExpense.getStatus();
console.log({
  state: status.state, // CLOSED, OPEN, or HALF_OPEN
  failureCount: status.failureCount,
  isOpen: status.isOpen,
  canAttempt: status.canAttempt,
  nextAttemptTime: status.nextAttemptTime,
});
```

### Error Boundary Events

The error boundary automatically logs errors and can report to analytics:

```typescript
// Automatic error reporting (if gtag is available)
window.gtag("event", "exception", {
  description: error.message,
  fatal: false,
  custom_map: {
    component: "ExpensesErrorBoundary",
    userId: userId,
    retryCount: retryCount,
  },
});
```

## Translation Keys

The error boundary uses these translation keys:

```typescript
{
  "errors.stack-overflow.title": "System Error Detected",
  "errors.stack-overflow.description": "We've detected a system error...",
  "errors.generic.title": "Something Went Wrong",
  "errors.generic.description": "An unexpected error occurred...",
  "errors.retry": "Try Again",
  "errors.retry-with-delay": "Retry in {delay}s",
  "errors.clear-cache": "Clear Cache & Reload",
  "errors.dismiss": "Dismiss",
  "errors.max-retries.title": "Maximum Retries Reached",
  "errors.max-retries.description": "We've tried multiple times..."
}
```

## Best Practices

1. **Always wrap mutation operations** with circuit breakers
2. **Use appropriate retry configurations** for different operation types
3. **Log errors with context** for debugging
4. **Provide user-friendly error messages** through the error boundary
5. **Monitor circuit breaker status** in production
6. **Test error scenarios** to ensure recovery works properly

## Testing

The system includes comprehensive tests for:

- Circuit breaker state transitions
- Retry logic with various failure scenarios
- Error boundary rendering and recovery
- Integration with React Query mutations

Run tests with:

```bash
npm test -- utils/__tests__/circuit-breaker.test.ts --run
```

## Stack Overflow Prevention

The specific measures to prevent the original stack overflow bug:

1. **Circuit breakers** prevent infinite mutation loops
2. **Retry limits** ensure operations don't retry indefinitely
3. **Cache operation protection** prevents recursive cache updates
4. **Error boundary** catches and recovers from stack overflow errors
5. **Precise cache updates** instead of broad invalidations
6. **Dependency management** in React hooks to prevent render loops

This comprehensive system ensures that the expenses feature is resilient to errors and provides a smooth user experience even when things go wrong.
