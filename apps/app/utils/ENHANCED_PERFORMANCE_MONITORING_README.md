# Enhanced Performance Monitoring System

## Overview

This document describes the enhanced performance monitoring system implemented to track cache operations, memory usage, and performance regressions across all expense management features.

## Features Implemented

### 1. Cross-Feature Cache Metrics Tracking

- **Cache Operation Tracking**: Monitors all cache operations (add, update, delete, reorder) across billable costs, equipment costs, and fixed costs
- **Performance Metrics**: Tracks operation duration, success/failure rates, and operation frequency
- **Feature-Specific Monitoring**: Separates metrics by feature (billable, equipment, fixed-expense) for targeted analysis

### 2. Memory Usage Tracking

- **Heap Memory Monitoring**: Tracks JavaScript heap usage over time using `performance.memory` API
- **Cache Size Tracking**: Monitors the number of cached items and queries
- **Memory Leak Detection**: Automatically detects significant memory increases over time
- **Component Count Tracking**: Estimates active component count based on render metrics

### 3. Performance Benchmarking

- **Baseline Establishment**: Automatically establishes performance baselines for all operations
- **Regression Detection**: Detects when operations exceed 150% of their baseline performance
- **Benchmark Categories**: Separates benchmarks by type (render, cache, memory, network)
- **Automated Alerts**: Generates alerts when performance regressions are detected

### 4. Enhanced Alert System

- **Severity Levels**: Categorizes alerts by severity (low, medium, high, critical)
- **Alert Types**: Supports multiple alert types:
  - `excessive_renders`: Too many component re-renders
  - `slow_render`: Component renders taking too long
  - `memory_leak`: Significant memory usage increases
  - `cache_slow`: Cache operations exceeding thresholds
  - `cache_failure`: High cache operation failure rates
  - `regression`: Performance degradation detected

### 5. Integration Utilities

- **Performance Wrappers**: Utilities to wrap functions with automatic performance tracking
- **Monitored Query Client**: Enhanced React Query client with built-in performance monitoring
- **Mutation/Query Tracking**: Automatic performance tracking for React Query operations
- **Regression Detection**: Built-in performance regression detection for cache operations

## Files Created/Modified

### Core Files

- `apps/app/utils/performance-monitor.ts` - Enhanced performance monitoring system
- `apps/app/utils/performance-integration.ts` - Integration utilities for seamless monitoring
- `apps/app/utils/query-cache-utils.ts` - Updated to integrate with performance monitoring

### Test Files

- `apps/app/utils/__tests__/performance-monitor.test.ts` - Comprehensive test suite
- `apps/app/utils/__tests__/performance-integration.test.tsx` - Integration test suite

### Documentation

- `apps/app/utils/ENHANCED_PERFORMANCE_MONITORING_README.md` - This documentation

## Usage Examples

### Basic Performance Tracking

```typescript
import { performanceMonitor } from "@/utils/performance-monitor";

// Track a cache operation
performanceMonitor.trackCacheOperation("add", "equipment", 25, true, {
  itemId: 123,
});

// Track component render
performanceMonitor.trackRender("MyComponent", startTime);

// Track memory usage
performanceMonitor.trackMemoryUsage(cacheSize, queryCount, componentCount);
```

### Using Performance Wrappers

```typescript
import {
  withPerformanceTracking,
  measurePerformance,
} from "@/utils/performance-integration";

// Wrap a function with performance tracking
const trackedFunction = withPerformanceTracking(
  myFunction,
  "operation-name",
  "feature-name"
);

// Measure performance inline
const result = measurePerformance(
  () => expensiveOperation(),
  "expensive-operation",
  "my-feature"
);
```

### React Hooks

```typescript
import { useRenderTracker, useCacheTracker } from '@/utils/performance-monitor';

function MyComponent() {
  useRenderTracker('MyComponent');
  const trackCache = useCacheTracker('my-feature');

  const handleOperation = () => {
    const startTime = performance.now();
    // ... perform operation
    const duration = performance.now() - startTime;
    trackCache('operation', duration, true);
  };

  return <div>...</div>;
}
```

### Monitored Query Client

```typescript
import { MonitoredQueryClient } from "@/utils/performance-integration";

const queryClient = new QueryClient();
const monitoredClient = new MonitoredQueryClient(queryClient);

// All operations are automatically tracked
monitoredClient.setQueryData(["key"], data);
monitoredClient.trackCacheMetrics(); // Manual cache metrics update
```

## Performance Thresholds

### Default Thresholds

- **Slow Render**: 16ms (60fps threshold)
- **Excessive Renders**: 50 renders per minute
- **Slow Cache Operation**: 50ms
- **Memory Leak**: 50MB increase over time
- **Performance Regression**: 150% of baseline

### Customizable Thresholds

All thresholds can be customized when using the performance-aware utilities:

```typescript
const performanceAwareOp = createPerformanceAwareCacheOperation(
  operation,
  "operation-name",
  "feature-name",
  {
    trackRegression: true,
    alertOnSlow: true,
    slowThreshold: 30, // Custom threshold
  }
);
```

## Monitoring Dashboard

The system provides comprehensive reporting through:

### Console Logging

- Automatic summary logging every 60 seconds in development
- Detailed performance reports with metrics breakdown
- Real-time alerts for performance issues

### Programmatic Access

```typescript
// Get comprehensive performance report
const report = performanceMonitor.generateReport();

// Get specific metrics
const renderMetrics = performanceMonitor.getAllRenderMetrics();
const cacheMetrics = performanceMonitor.getAllCacheMetrics();
const memoryHistory = performanceMonitor.getMemoryHistory();

// Get alerts
const criticalAlerts = performanceMonitor.getAlertsBySeverity("critical");
const regressions = performanceMonitor.getRegressions();
```

## Integration with Existing Cache Utilities

The enhanced monitoring system seamlessly integrates with existing cache utilities:

### Equipment Cache Utils

```typescript
import { equipmentCacheUtils } from "@/utils/equipment-cache-utils";
// All operations are automatically tracked via the updated query-cache-utils
```

### Billable Cost Cache Utils

```typescript
import { billableCostCacheUtils } from "@/utils/query-cache-utils";
// Single-object cache operations are tracked
```

### Fixed Expense Cache Utils

```typescript
import { expenseCacheUtils } from "@/utils/query-cache-utils";
// Array-based cache operations are tracked
```

## Memory Management

The system includes built-in memory management:

- **Alert History Limit**: Maximum 200 alerts stored
- **Memory History Limit**: Maximum 100 memory snapshots
- **Log Rotation**: Automatic cleanup of old performance logs
- **Automatic Cleanup**: Cleanup on page unload

## Development vs Production

- **Development**: Full monitoring enabled with console logging
- **Test**: Monitoring enabled for testing purposes
- **Production**: Monitoring disabled by default for performance

## Future Enhancements

The system is designed to be extensible for future enhancements:

- Network request performance tracking
- User interaction performance monitoring
- Custom performance metrics
- Performance analytics dashboard
- Automated performance testing integration

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **6.1**: Comprehensive monitoring and debugging tools for cache operations
- **6.2**: Performance metrics and operation details logging
- **8.2**: Memory usage tracking and leak detection
- **8.3**: Automated performance regression detection

The enhanced performance monitoring system provides a solid foundation for maintaining optimal performance across all expense management features while enabling proactive identification and resolution of performance issues.
