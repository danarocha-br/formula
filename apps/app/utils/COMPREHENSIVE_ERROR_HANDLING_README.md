# Comprehensive Error Handling System

## Overview

This document describes the comprehensive error handling system implemented for cache operations across all expense management features. The system provides standardized error types, circuit breaker pattern, retry logic with exponential backoff, and automated error recovery mechanisms.

## Features Implemented

### 1. Standardized Error Types

The system defines a comprehensive set of error types and severities:

#### Error Types

- `NETWORK_ERROR`: Network connectivity issues
- `VALIDATION_ERROR`: Data validation failures
- `CACHE_CORRUPTION`: Cache integrity issues
- `TIMEOUT_ERROR`: Operation timeouts
- `PERMISSION_ERROR`: Authorization failures
- `QUOTA_EXCEEDED`: Resource limit exceeded
- `CONCURRENT_MODIFICATION`: Concurrent access conflicts
- `UNKNOWN_ERROR`: Unclassified errors

#### Severity Levels

- `LOW`: Minor issues that don't affect functionality
- `MEDIUM`: Issues that may impact user experience
- `HIGH`: Significant problems requiring attention
- `CRITICAL`: System-threatening issues requiring immediate action

### 2. Circuit Breaker Pattern

Implements the circuit breaker pattern to prevent cascading failures:

- **Closed State**: Normal operation, requests pass through
- **Open State**: Circuit is open, requests fail immediately
- **Half-Open State**: Testing if service has recovered

#### Configuration

- `failureThreshold`: Number of failures before opening circuit (default: 5)
- `recoveryTimeout`: Time before attempting recovery (default: 60 seconds)
- `monitoringPeriod`: Period for monitoring failure rates (default: 5 minutes)
- `minimumRequests`: Minimum requests before considering failure rate (default: 10)

### 3. Retry Logic with Exponential Backoff

Provides intelligent retry mechanisms for transient failures:

#### Configuration

- `maxAttempts`: Maximum retry attempts (default: 3)
- `baseDelay`: Initial delay between retries (default: 1 second)
- `maxDelay`: Maximum delay cap (default: 30 seconds)
- `backoffMultiplier`: Exponential backoff multiplier (default: 2)
- `jitter`: Random jitter to prevent thundering herd (default: true)

#### Retry Logic

- Automatically classifies errors as retryable or non-retryable
- Applies exponential backoff with optional jitter
- Respects custom retry logic when provided

### 4. Cache Corruption Detection and Recovery

Provides mechanisms to detect and recover from cache corruption:

#### Corruption Detection

- Configurable corruption checks for each cache type
- Automatic integrity validation
- Periodic health checks

#### Recovery Strategies

- Configurable recovery strategies per cache type
- Automatic cache clearing and re-population
- Graceful degradation when recovery fails

### 5. Comprehensive Error Logging and Monitoring

Tracks and analyzes error patterns:

#### Error Statistics

- Total error counts by type, severity, and feature
- Failure rate analysis
- Recent error history
- Circuit breaker status monitoring

#### Logging Features

- Structured error logging with metadata
- Development-time console output
- Error correlation and tracking

## Files Created

### Core Error Handling

- `apps/app/utils/cache-error-handling.ts` - Core error handling classes and utilities
- `apps/app/utils/cache-error-integration.ts` - Integration utilities for seamless adoption

### Test Files

- `apps/app/utils/__tests__/cache-error-handling.test.ts` - Core error handling tests
- `apps/app/utils/__tests__/cache-error-integration.test.ts` - Integration tests

### Documentation

- `apps/app/utils/COMPREHENSIVE_ERROR_HANDLING_README.md` - This documentation

## Usage Examples

### Basic Error Handling

```typescript
import {
  cacheErrorManager,
  CacheError,
  CacheErrorType,
} from "@/utils/cache-error-handling";

// Execute operation with comprehensive error handling
try {
  const result = await cacheErrorManager.executeWithErrorHandling(
    () => riskyOperation(),
    {
      operationName: "updateCache",
      feature: "equipment",
      useCircuitBreaker: true,
      useRetry: true,
    }
  );
} catch (error) {
  if (error instanceof CacheError) {
    console.error("Cache operation failed:", error.toJSON());
  }
}
```

### Creating Error-Handled Cache Utilities

```typescript
import { createErrorHandledCacheUtils } from "@/utils/cache-error-integration";

// Create error-handled version of existing cache utilities
const errorHandledEquipmentUtils = createErrorHandledCacheUtils(
  equipmentCacheUtils,
  equipmentConfig,
  {
    useCircuitBreaker: true,
    useRetry: true,
    enableCorruptionDetection: true,
    enableAutoRecovery: true,
  }
);

// All operations now have comprehensive error handling
errorHandledEquipmentUtils.addItem(queryClient, userId, newItem);
```

### Mutation Error Handling

```typescript
import { withMutationErrorHandling } from "@/utils/cache-error-integration";

const mutationConfig = withMutationErrorHandling(
  {
    mutationFn: async (data) => updateEquipment(data),
    onSuccess: (data) => console.log("Success:", data),
    onError: (error) => console.error("Error:", error),
  },
  "updateEquipment",
  "equipment",
  {
    useRetry: true,
    retryConfig: { maxAttempts: 3, baseDelay: 1000 },
  }
);
```

### Query Error Handling

```typescript
import { withQueryErrorHandling } from "@/utils/cache-error-integration";

const queryConfig = withQueryErrorHandling(
  {
    queryFn: () => fetchEquipmentData(),
    onError: (error) => handleQueryError(error),
  },
  "fetchEquipment",
  "equipment"
);
```

### Custom Error Creation

```typescript
import {
  CacheError,
  CacheErrorType,
  CacheErrorSeverity,
} from "@/utils/cache-error-handling";

// Create custom cache error
const customError = new CacheError({
  type: CacheErrorType.VALIDATION_ERROR,
  severity: CacheErrorSeverity.HIGH,
  operation: "validateData",
  feature: "equipment",
  message: "Equipment data validation failed",
  userId: "user-123",
  itemId: 456,
  metadata: { validationErrors: ["name required", "invalid amount"] },
});
```

### Circuit Breaker Usage

```typescript
import { CircuitBreaker } from "@/utils/cache-error-handling";

// Create circuit breaker for specific operation
const circuitBreaker = new CircuitBreaker("updateEquipment", "equipment", {
  failureThreshold: 5,
  recoveryTimeout: 60000,
});

// Execute operation with circuit breaker protection
try {
  const result = await circuitBreaker.execute(() => updateEquipmentData());
} catch (error) {
  console.error("Circuit breaker prevented operation:", error);
}

// Check circuit breaker status
const status = circuitBreaker.getStatus();
console.log("Circuit breaker state:", status.state);
```

### Retry Manager Usage

```typescript
import { RetryManager } from "@/utils/cache-error-handling";

// Create retry manager with custom configuration
const retryManager = new RetryManager({
  maxAttempts: 5,
  baseDelay: 500,
  backoffMultiplier: 1.5,
});

// Execute operation with retry logic
const result = await retryManager.executeWithRetry(
  () => unreliableOperation(),
  "unreliableOperation",
  "equipment",
  (error) => error.message.includes("temporary") // Custom retry logic
);
```

### Cache Recovery

```typescript
import { CacheRecoveryManager } from "@/utils/cache-error-handling";

// Create recovery manager
const recoveryManager = new CacheRecoveryManager("equipment");

// Register corruption check
recoveryManager.registerCorruptionCheck("equipment-cache", () => {
  const items = getCurrentEquipmentItems();
  return Array.isArray(items) && items.every((item) => item.id && item.name);
});

// Register recovery strategy
recoveryManager.registerRecoveryStrategy("equipment-cache", async () => {
  // Clear corrupted cache
  clearEquipmentCache();
  // Trigger data refetch
  await refetchEquipmentData();
});

// Perform automatic recovery
const result = await recoveryManager.performAutoRecovery();
console.log("Recovery results:", result);
```

## Error Statistics and Monitoring

### Getting Error Statistics

```typescript
import { cacheErrorManager } from "@/utils/cache-error-handling";

// Get comprehensive error statistics
const stats = cacheErrorManager.getErrorStatistics();
console.log("Total errors:", stats.totalErrors);
console.log("Errors by type:", stats.errorsByType);
console.log("Errors by severity:", stats.errorsBySeverity);
console.log("Errors by feature:", stats.errorsByFeature);
console.log("Recent errors:", stats.recentErrors);
```

### Circuit Breaker Monitoring

```typescript
// Get all circuit breaker statuses
const circuitBreakerStatuses = cacheErrorManager.getCircuitBreakerStatuses();
Object.entries(circuitBreakerStatuses).forEach(([key, status]) => {
  console.log(
    `${key}: ${status.state} (${status.failureRate * 100}% failure rate)`
  );
});
```

### Error Analysis

```typescript
// Analyze error patterns
const errorStats = cacheErrorManager.getErrorStatistics();

// Find most problematic features
const problematicFeatures = Object.entries(errorStats.errorsByFeature)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5);

console.log("Most problematic features:", problematicFeatures);

// Check for critical errors
const criticalErrors = errorStats.errorsBySeverity.CRITICAL;
if (criticalErrors > 0) {
  console.warn(`${criticalErrors} critical errors detected!`);
}
```

## Integration with Existing Systems

### React Query Integration

The error handling system seamlessly integrates with React Query:

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  withQueryErrorHandling,
  withMutationErrorHandling,
} from "@/utils/cache-error-integration";

// Enhanced query with error handling
const { data, error } = useQuery({
  queryKey: ["equipment", userId],
  ...withQueryErrorHandling(
    {
      queryFn: () => fetchEquipment(userId),
    },
    "fetchEquipment",
    "equipment"
  ),
});

// Enhanced mutation with error handling
const mutation = useMutation({
  ...withMutationErrorHandling(
    {
      mutationFn: (data) => updateEquipment(data),
    },
    "updateEquipment",
    "equipment"
  ),
});
```

### Cache Utilities Integration

All existing cache utilities can be enhanced with error handling:

```typescript
import { equipmentCacheUtils } from "@/utils/equipment-cache-utils";
import { createErrorHandledCacheUtils } from "@/utils/cache-error-integration";

// Create error-handled version
const safeEquipmentUtils = createErrorHandledCacheUtils(
  equipmentCacheUtils,
  equipmentConfig
);

// Use with automatic error handling
safeEquipmentUtils.addItem(queryClient, userId, newEquipment);
```

## Configuration Options

### Global Configuration

```typescript
import { cacheErrorManager } from "@/utils/cache-error-handling";

// Configure global error handling
const globalConfig = {
  useCircuitBreaker: true,
  useRetry: true,
  retryConfig: {
    maxAttempts: 3,
    baseDelay: 1000,
    backoffMultiplier: 2,
  },
};
```

### Feature-Specific Configuration

```typescript
// Equipment-specific error handling
const equipmentErrorConfig = {
  useCircuitBreaker: true,
  useRetry: true,
  retryConfig: { maxAttempts: 5 }, // More retries for equipment
  enableCorruptionDetection: true,
  enableAutoRecovery: true,
};

// Billable cost-specific error handling
const billableErrorConfig = {
  useCircuitBreaker: false, // Disable for critical operations
  useRetry: true,
  retryConfig: { maxAttempts: 2 }, // Fewer retries for financial data
  enableCorruptionDetection: true,
  enableAutoRecovery: false, // Manual recovery for financial data
};
```

## Best Practices

### 1. Error Classification

- Always use appropriate error types and severities
- Include relevant metadata for debugging
- Preserve original error information

### 2. Retry Logic

- Only retry transient errors
- Use exponential backoff to avoid overwhelming services
- Set reasonable retry limits

### 3. Circuit Breaker Usage

- Configure appropriate failure thresholds
- Monitor circuit breaker states
- Implement graceful degradation

### 4. Cache Recovery

- Implement corruption detection for critical caches
- Provide recovery strategies for all cache types
- Test recovery mechanisms regularly

### 5. Monitoring and Alerting

- Monitor error rates and patterns
- Set up alerts for critical errors
- Regularly review error statistics

## Performance Considerations

### Memory Management

- Error logs are automatically rotated to prevent memory leaks
- Circuit breakers reset counters periodically
- Cache recovery is performed asynchronously

### Performance Impact

- Error handling adds minimal overhead to successful operations
- Circuit breakers prevent resource waste on failing operations
- Retry logic includes jitter to prevent thundering herd problems

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **7.1**: Standardized error types for all cache operations
- **7.2**: Circuit breaker pattern for mutation operations
- **7.3**: Automatic retry logic with exponential backoff
- **7.4**: Error recovery mechanisms for cache corruption

The comprehensive error handling system provides a robust foundation for maintaining system reliability and providing excellent user experience even when things go wrong.
