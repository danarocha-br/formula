# React Query Debugging and Monitoring Tools

This document provides a comprehensive guide to the debugging and monitoring tools implemented for React Query cache optimization.

## Overview

The debugging tools provide real-time monitoring, analysis, and visualization of React Query cache operations, component performance, and system health. These tools are designed to help developers identify performance issues, memory leaks, and cache inefficiencies during development.

## Components

### 1. Cache Operation Dashboard (`cache-operation-dashboard.tsx`)

A real-time dashboard that provides visual monitoring of cache operations.

**Features:**

- Real-time cache operation monitoring
- Performance metrics visualization
- Alert system for performance issues
- Interactive tabs for different views (Overview, Cache, Performance, Health, State)
- Keyboard shortcut support (Ctrl+Shift+D to toggle)

**Usage:**

```tsx
import { CacheOperationDashboard } from './utils/cache-operation-dashboard';

// Basic usage
<CacheOperationDashboard />

// With custom configuration
<CacheOperationDashboard
  refreshInterval={10000}
  maxAlerts={50}
  showHealthChecks={true}
  showCacheState={true}
/>
```

### 2. Cache State Inspector (`cache-state-inspector.ts`)

Provides detailed inspection and analysis of React Query cache state.

**Features:**

- Complete cache snapshot generation
- Cache health analysis with recommendations
- Query pattern detection
- Memory usage estimation
- Feature-based cache statistics
- Export functionality for debugging

**Usage:**

```typescript
import {
  cacheStateInspector,
  useCacheStateInspector,
} from "./utils/cache-state-inspector";

// Initialize with QueryClient
cacheStateInspector.initialize(queryClient);

// Get cache snapshot
const snapshot = cacheStateInspector.getCacheSnapshot();

// Analyze cache health
const analysis = cacheStateInspector.analyzeCacheHealth();

// React hook usage
const { getCacheSnapshot, analyzeCacheHealth } = useCacheStateInspector();
```

### 3. Performance Metrics Visualizer (`performance-metrics-visualizer.tsx`)

Provides visual charts and graphs for performance data.

**Features:**

- Memory usage charts
- Cache operation performance visualization
- Component render frequency tracking
- Performance alerts timeline
- Cache success rate monitoring
- Customizable chart components

**Usage:**

```tsx
import {
  PerformanceMetricsDashboard,
  MemoryUsageChart,
  CacheOperationsChart,
  MetricsSummary
} from './utils/performance-metrics-visualizer';

// Full dashboard
<PerformanceMetricsDashboard />

// Individual components
<MemoryUsageChart width={400} height={200} />
<CacheOperationsChart width={400} height={200} />
<MetricsSummary />
```

### 4. Cache Health Checker (`cache-health-checker.ts`)

Automated health monitoring with configurable checks and alerts.

**Features:**

- Automated health checks (memory, performance, errors, staleness)
- Configurable thresholds and intervals
- Health scoring system
- Trend analysis
- Automated recommendations
- Real-time health status updates

**Usage:**

```typescript
import {
  cacheHealthChecker,
  useCacheHealth,
} from "./utils/cache-health-checker";

// Initialize
cacheHealthChecker.initialize(queryClient, {
  enabled: true,
  interval: 30000, // 30 seconds
  thresholds: {
    memory: { warning: 50, error: 100 }, // MB
    performance: { slowRenderWarning: 16, slowRenderError: 33 }, // ms
  },
});

// React hook usage
const { healthStatus, forceCheck } = useCacheHealth();
```

### 5. Debugging Tools Integration (`debugging-tools-integration.tsx`)

Unified interface that ties all debugging tools together.

**Features:**

- Single initialization point for all tools
- Global debugging utilities
- Keyboard shortcuts for common operations
- Development-only components
- Error handling and graceful degradation

**Usage:**

```tsx
import {
  initializeDebuggingTools,
  DebuggingPanel,
  useDebuggingTools,
  debugCommands,
} from "./utils/debugging-tools-integration";

// Initialize all tools
initializeDebuggingTools(queryClient);

// Use debugging panel
<DebuggingPanel queryClient={queryClient} />;

// React hook
const { isInitialized } = useDebuggingTools(queryClient);

// Console commands
debugCommands.help();
debugCommands.performance();
debugCommands.cache();
```

## Global Debugging Utilities

When debugging tools are initialized in development, several global utilities become available:

### Window Object (`window.cacheDebug`)

```javascript
// Performance monitoring
window.cacheDebug.getPerformanceReport();
window.cacheDebug.clearPerformanceMetrics();
window.cacheDebug.logPerformanceSummary();

// Cache state inspection
window.cacheDebug.getCacheSnapshot();
window.cacheDebug.analyzeCacheHealth();
window.cacheDebug.exportCacheState();
window.cacheDebug.logCacheState();

// Health checking
window.cacheDebug.getHealthStatus();
window.cacheDebug.forceHealthCheck();

// Utilities
window.cacheDebug.clearAllCaches();
window.cacheDebug.invalidateAllQueries();
window.cacheDebug.generateDebugReport();
```

### Debug Commands (`window.debugCommands`)

```javascript
// Available commands
debugCommands.help(); // Show all available commands
debugCommands.performance(); // Show performance metrics
debugCommands.cache(); // Show cache state
debugCommands.health(); // Show health status
debugCommands.report(); // Generate full debug report
debugCommands.clear(); // Clear all caches
debugCommands.monitor(true); // Start/stop monitoring
```

### Keyboard Shortcuts

- `Ctrl+Shift+D` - Toggle cache dashboard
- `Ctrl+Shift+P` - Log performance summary
- `Ctrl+Shift+C` - Log cache state
- `Ctrl+Shift+H` - Log health status
- `Ctrl+Shift+R` - Generate debug report
- `Ctrl+Shift+X` - Clear all caches (with confirmation)

## Integration with Existing Code

### Performance Monitor Integration

The debugging tools integrate with the existing `performance-monitor.ts`:

```typescript
import { performanceMonitor } from "./performance-monitor";

// Track component renders
performanceMonitor.trackRender("ComponentName", renderStartTime);

// Track cache operations
performanceMonitor.trackCacheOperation(
  "operation",
  "feature",
  duration,
  success
);

// Track memory usage
performanceMonitor.trackMemoryUsage(cacheSize, queryCount, componentCount);
```

### React Query Integration

The tools work seamlessly with React Query:

```typescript
import { QueryClient } from "@tanstack/react-query";
import { initializeDebuggingTools } from "./utils/debugging-tools-integration";

const queryClient = new QueryClient();

// Initialize debugging tools
if (process.env.NODE_ENV === "development") {
  initializeDebuggingTools(queryClient);
}
```

## Configuration

### Health Check Configuration

```typescript
interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // milliseconds
  thresholds: {
    memory: {
      warning: number; // MB
      error: number; // MB
    };
    performance: {
      slowRenderWarning: number; // ms
      slowRenderError: number; // ms
      slowCacheWarning: number; // ms
      slowCacheError: number; // ms
    };
    errors: {
      renderErrorWarning: number; // percentage
      renderErrorError: number; // percentage
      cacheErrorWarning: number; // percentage
      cacheErrorError: number; // percentage
    };
    staleness: {
      staleQueriesWarning: number; // percentage
      staleQueriesError: number; // percentage
    };
  };
}
```

### Dashboard Configuration

```typescript
interface DashboardProps {
  refreshInterval?: number; // milliseconds
  maxAlerts?: number;
  showHealthChecks?: boolean;
  showCacheState?: boolean;
}
```

## Development vs Production

All debugging tools are designed to work only in development mode:

- Tools automatically disable in production builds
- No performance impact on production code
- Development-only components return null in production
- Global utilities are not exposed in production

## Performance Considerations

The debugging tools are designed to have minimal impact on application performance:

- Efficient data collection with configurable intervals
- Memory usage monitoring with automatic cleanup
- Debounced updates to prevent excessive re-renders
- Lazy loading of visualization components
- Automatic garbage collection of old metrics

## Troubleshooting

### Common Issues

1. **Tools not initializing**: Ensure you're in development mode and have called `initializeDebuggingTools(queryClient)`

2. **Dashboard not showing**: Check that the component is rendered and try the keyboard shortcut `Ctrl+Shift+D`

3. **Performance impact**: Adjust refresh intervals and disable unnecessary features

4. **Memory leaks**: The tools include automatic cleanup, but you can manually call `cleanupDebuggingTools()`

### Debug Information

Generate a comprehensive debug report:

```javascript
// Via global utility
const report = window.cacheDebug.generateDebugReport();

// Via debug commands
debugCommands.report();
```

The report includes:

- Performance metrics
- Cache state snapshot
- Health status
- System information
- Timestamp and environment details

## Testing

The debugging tools include comprehensive tests:

```bash
npm test -- debugging-tools-integration.test.tsx --run
```

Tests cover:

- Tool initialization and cleanup
- React component rendering
- Global utility functions
- Error handling
- Integration with React Query

## Future Enhancements

Potential improvements for the debugging tools:

1. **Historical Data**: Store performance metrics over time
2. **Comparison Tools**: Compare performance between different sessions
3. **Export/Import**: Save and load debugging sessions
4. **Remote Monitoring**: Send metrics to external monitoring services
5. **Custom Alerts**: User-defined alert conditions
6. **Performance Regression Detection**: Automated detection of performance degradation

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **6.3**: Cache operation summaries and slow operation detection
- **6.4**: Cache inconsistencies and validation error detection
- **8.2**: Performance metrics visualization and monitoring
- **8.4**: Memory leak detection utilities and automated cleanup

The debugging tools provide comprehensive monitoring, analysis, and visualization capabilities that help developers maintain optimal React Query performance across all expense management features.
