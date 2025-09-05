import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { performanceMonitor } from '../performance-monitor';
import { cacheLogger } from '../query-cache-utils';
import { useStableExpenses } from '../../hooks/use-stable-expenses';

// Mock console methods to prevent test output noise
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// Memory usage tracking utilities
interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

class MemoryTracker {
  private snapshots: MemorySnapshot[] = [];
  private isNode = typeof process !== 'undefined' && process.memoryUsage;

  takeSnapshot(): MemorySnapshot {
    if (this.isNode) {
      const usage = process.memoryUsage();
      const snapshot = {
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
      };
      this.snapshots.push(snapshot);
      return snapshot;
    }

    // Fallback for browser environment
    const snapshot = {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  getMemoryGrowth(): number {
    if (this.snapshots.length < 2) return 0;

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];

    return last.heapUsed - first.heapUsed;
  }

  getAverageGrowthRate(): number {
    if (this.snapshots.length < 2) return 0;

    const totalGrowth = this.getMemoryGrowth();
    const timeSpan = this.snapshots[this.snapshots.length - 1].timestamp - this.snapshots[0].timestamp;

    return totalGrowth / Math.max(timeSpan, 1); // bytes per millisecond
  }

  clear(): void {
    this.snapshots = [];
  }

  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }
}

describe('Memory Leak Detection', () => {
  let queryClient: QueryClient;
  let memoryTracker: MemoryTracker;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    memoryTracker = new MemoryTracker();

    // Clear all monitoring data
    performanceMonitor.clearAllMetrics();
    cacheLogger.clearLogs();

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    memoryTracker.clear();
  });

  describe('Performance Monitor Memory Management', () => {
    it('should not accumulate unlimited metrics', () => {
      memoryTracker.takeSnapshot();

      // Simulate many component renders
      for (let i = 0; i < 1000; i++) {
        performanceMonitor.trackRender(`Component${i % 10}`, 90); // Only 10 unique components
      }

      memoryTracker.takeSnapshot();

      // Should only have metrics for 10 components, not 1000
      const metrics = performanceMonitor.getAllMetrics();
      expect(metrics.length).toBe(10);

      // Memory growth should be reasonable
      const memoryGrowth = memoryTracker.getMemoryGrowth();
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
    });

    it('should limit stored alerts to prevent memory leaks', () => {
      memoryTracker.takeSnapshot();

      // Generate many slow render alerts
      for (let i = 0; i < 200; i++) {
        performanceMonitor.trackRender(`SlowComponent${i}`, 50); // 50ms renders
      }

      memoryTracker.takeSnapshot();

      const alerts = performanceMonitor.getAlerts(300);
      expect(alerts.length).toBeLessThanOrEqual(100); // Should be capped at MAX_ALERTS

      const memoryGrowth = memoryTracker.getMemoryGrowth();
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024); // Less than 5MB growth
    });

    it('should clear metrics without memory leaks', () => {
      // Create metrics
      for (let i = 0; i < 50; i++) {
        performanceMonitor.trackRender(`Component${i}`, 90);
      }

      memoryTracker.takeSnapshot();

      // Clear all metrics
      performanceMonitor.clearAllMetrics();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      memoryTracker.takeSnapshot();

      expect(performanceMonitor.getAllMetrics()).toHaveLength(0);
      expect(performanceMonitor.getAlerts()).toHaveLength(0);

      // Memory should not grow significantly after clearing
      const memoryGrowth = memoryTracker.getMemoryGrowth();
      expect(Math.abs(memoryGrowth)).toBeLessThan(1024 * 1024); // Less than 1MB difference
    });
  });

  describe('Cache Logger Memory Management', () => {
    it('should limit stored logs to prevent memory leaks', () => {
      memoryTracker.takeSnapshot();

      // Generate many cache operations
      for (let i = 0; i < 1500; i++) {
        cacheLogger.log(
          'test-operation',
          `user${i % 10}`, // Only 10 unique users
          performance.now(),
          true,
          undefined,
          { operationIndex: i }
        );
      }

      memoryTracker.takeSnapshot();

      const logs = cacheLogger.getLogs(2000);
      expect(logs.length).toBeLessThanOrEqual(1000); // Should be capped at MAX_LOGS

      const memoryGrowth = memoryTracker.getMemoryGrowth();
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
    });

    it('should clear logs without memory leaks', () => {
      // Create many logs
      for (let i = 0; i < 500; i++) {
        cacheLogger.log('test-operation', 'user1', performance.now(), true);
      }

      memoryTracker.takeSnapshot();

      cacheLogger.clearLogs();

      if (global.gc) {
        global.gc();
      }

      memoryTracker.takeSnapshot();

      expect(cacheLogger.getLogs()).toHaveLength(0);

      const memoryGrowth = memoryTracker.getMemoryGrowth();
      expect(Math.abs(memoryGrowth)).toBeLessThan(1024 * 1024); // Less than 1MB difference
    });
  });

  describe('React Hook Memory Leaks', () => {
    it('should not leak memory when hook is unmounted', async () => {
      memoryTracker.takeSnapshot();

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      // Mount and unmount hook multiple times
      for (let i = 0; i < 50; i++) {
        const { unmount } = renderHook(
          () => useStableExpenses('test-user'),
          { wrapper }
        );

        // Simulate some data changes
        act(() => {
          queryClient.setQueryData(['fixed-expenses-list', 'test-user'], [
            { id: i, name: `Expense ${i}`, amount: 100, userId: 'test-user' }
          ]);
        });

        unmount();
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      memoryTracker.takeSnapshot();

      const memoryGrowth = memoryTracker.getMemoryGrowth();
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024); // Less than 5MB growth
    });

    it('should handle rapid re-renders without memory leaks', async () => {
      memoryTracker.takeSnapshot();

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { rerender, unmount } = renderHook(
        ({ userId }) => useStableExpenses(userId),
        {
          wrapper,
          initialProps: { userId: 'user1' }
        }
      );

      // Simulate rapid re-renders with changing data
      for (let i = 0; i < 100; i++) {
        act(() => {
          queryClient.setQueryData(['fixed-expenses-list', 'user1'], [
            { id: 1, name: `Expense ${i}`, amount: 100 + i, userId: 'user1' }
          ]);
        });

        rerender({ userId: 'user1' });
      }

      unmount();

      if (global.gc) {
        global.gc();
      }

      memoryTracker.takeSnapshot();

      const memoryGrowth = memoryTracker.getMemoryGrowth();
      expect(memoryGrowth).toBeLessThan(3 * 1024 * 1024); // Less than 3MB growth
    });
  });

  describe('Long-running Performance Tests', () => {
    it('should maintain stable memory usage over time', async () => {
      const snapshots: MemorySnapshot[] = [];

      // Take initial snapshot
      snapshots.push(memoryTracker.takeSnapshot());

      // Simulate long-running application with periodic activity
      for (let cycle = 0; cycle < 10; cycle++) {
        // Simulate component renders
        for (let i = 0; i < 20; i++) {
          performanceMonitor.trackRender(`Component${i % 5}`, 90 + Math.random() * 10);
        }

        // Simulate cache operations
        for (let i = 0; i < 10; i++) {
          cacheLogger.log(
            'cache-operation',
            `user${i % 3}`,
            performance.now(),
            Math.random() > 0.1, // 90% success rate
            Math.random() > 0.9 ? new Error('Random error') : undefined
          );
        }

        // Take snapshot every few cycles
        if (cycle % 2 === 0) {
          snapshots.push(memoryTracker.takeSnapshot());
        }

        // Simulate time passing
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Final snapshot
      snapshots.push(memoryTracker.takeSnapshot());

      // Check that memory growth is linear and reasonable
      const totalGrowth = snapshots[snapshots.length - 1].heapUsed - snapshots[0].heapUsed;
      expect(totalGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB total growth

      // Check that growth rate is not accelerating (indicating a leak)
      const growthRates: number[] = [];
      for (let i = 1; i < snapshots.length; i++) {
        const growth = snapshots[i].heapUsed - snapshots[i - 1].heapUsed;
        const time = snapshots[i].timestamp - snapshots[i - 1].timestamp;
        growthRates.push(growth / Math.max(time, 1));
      }

      // Growth rate should not be consistently increasing
      const avgEarlyGrowth = growthRates.slice(0, Math.floor(growthRates.length / 2))
        .reduce((sum, rate) => sum + rate, 0) / Math.floor(growthRates.length / 2);

      const avgLateGrowth = growthRates.slice(Math.floor(growthRates.length / 2))
        .reduce((sum, rate) => sum + rate, 0) / Math.ceil(growthRates.length / 2);

      // Late growth should not be significantly higher than early growth
      expect(avgLateGrowth).toBeLessThan(avgEarlyGrowth * 2);
    });
  });

  describe('Cleanup Verification', () => {
    it('should properly clean up all monitoring resources', () => {
      // Create various monitoring data
      performanceMonitor.trackRender('TestComponent', 90);
      cacheLogger.log('test-op', 'user1', performance.now(), true);

      memoryTracker.takeSnapshot();

      // Clear everything
      performanceMonitor.clearAllMetrics();
      cacheLogger.clearLogs();

      memoryTracker.takeSnapshot();

      // Verify everything is cleared
      expect(performanceMonitor.getAllMetrics()).toHaveLength(0);
      expect(performanceMonitor.getAlerts()).toHaveLength(0);
      expect(cacheLogger.getLogs()).toHaveLength(0);

      // Memory should be stable after cleanup
      const memoryGrowth = memoryTracker.getMemoryGrowth();
      expect(Math.abs(memoryGrowth)).toBeLessThan(512 * 1024); // Less than 512KB difference
    });
  });
});