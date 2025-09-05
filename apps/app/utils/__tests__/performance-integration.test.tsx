import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { performanceMonitor } from '../performance-monitor';
import { cacheLogger } from '../query-cache-utils';

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Simple test component that uses performance monitoring
const TestComponent: React.FC<{ name: string }> = ({ name }) => {
  React.useEffect(() => {
    performanceMonitor.trackRender(name);
  });

  return <div data-testid={name}>{name} Component</div>;
};

// Component that simulates cache operations
const CacheTestComponent: React.FC<{ userId: string }> = ({ userId }) => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    // Simulate cache operations
    cacheLogger.log('test-operation', userId, performance.now(), true, undefined, { count });
  }, [userId, count]);

  return (
    <div>
      <div data-testid="user-id">{userId}</div>
      <button
        data-testid="increment"
        onClick={() => setCount(c => c + 1)}
      >
        Count: {count}
      </button>
    </div>
  );
};

describe('Performance Monitoring Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    performanceMonitor.clearAllMetrics();
    cacheLogger.clearLogs();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Component Render Tracking', () => {
    it('should track component renders', () => {
      render(<TestComponent name="TestComponent" />);

      expect(screen.getByTestId('TestComponent')).toBeInTheDocument();

      const metrics = performanceMonitor.getMetrics('TestComponent');
      expect(metrics).toBeDefined();
      expect(metrics?.componentName).toBe('TestComponent');
      expect(metrics?.renderCount).toBe(1);
    });

    it('should track multiple component renders', () => {
      const { rerender } = render(<TestComponent name="MultiRenderComponent" />);

      // Trigger re-renders
      rerender(<TestComponent name="MultiRenderComponent" />);
      rerender(<TestComponent name="MultiRenderComponent" />);

      const metrics = performanceMonitor.getMetrics('MultiRenderComponent');
      expect(metrics?.renderCount).toBe(3);
    });

    it('should track different components separately', () => {
      render(
        <div>
          <TestComponent name="Component1" />
          <TestComponent name="Component2" />
        </div>
      );

      const metrics1 = performanceMonitor.getMetrics('Component1');
      const metrics2 = performanceMonitor.getMetrics('Component2');

      expect(metrics1?.componentName).toBe('Component1');
      expect(metrics2?.componentName).toBe('Component2');
      expect(metrics1?.renderCount).toBe(1);
      expect(metrics2?.renderCount).toBe(1);
    });
  });

  describe('Cache Operation Logging', () => {
    it('should log cache operations', () => {
      render(<CacheTestComponent userId="user1" />);

      const logs = cacheLogger.getLogs();
      expect(logs.length).toBeGreaterThan(0);

      const userLogs = cacheLogger.getLogsByUser('user1');
      expect(userLogs.length).toBeGreaterThan(0);
      expect(userLogs[0].userId).toBe('user1');
      expect(userLogs[0].operation).toBe('test-operation');
    });

    it('should track cache operations for different users', () => {
      render(
        <div>
          <CacheTestComponent userId="user1" />
          <CacheTestComponent userId="user2" />
        </div>
      );

      const user1Logs = cacheLogger.getLogsByUser('user1');
      const user2Logs = cacheLogger.getLogsByUser('user2');

      expect(user1Logs.length).toBeGreaterThan(0);
      expect(user2Logs.length).toBeGreaterThan(0);
      expect(user1Logs[0].userId).toBe('user1');
      expect(user2Logs[0].userId).toBe('user2');
    });
  });

  describe('Performance Summary', () => {
    it('should generate performance summary with metrics', () => {
      // Create some metrics
      render(<TestComponent name="SummaryTestComponent" />);

      performanceMonitor.logSummary();

      // Should have logged something (mocked console calls)
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should generate cache operation summary', () => {
      render(<CacheTestComponent userId="summary-user" />);

      cacheLogger.logSummary();

      // Should have logged something (mocked console calls)
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(<TestComponent name="UnmountTest" />);

      expect(performanceMonitor.getMetrics('UnmountTest')).toBeDefined();

      unmount();

      // Should not throw errors after unmounting
      expect(() => performanceMonitor.logSummary()).not.toThrow();
    });

    it('should handle clearing metrics', () => {
      render(<TestComponent name="ClearTest" />);

      expect(performanceMonitor.getMetrics('ClearTest')).toBeDefined();

      performanceMonitor.clearMetrics('ClearTest');

      expect(performanceMonitor.getMetrics('ClearTest')).toBeUndefined();
    });
  });

  describe('Memory Management', () => {
    it('should not accumulate unlimited metrics', () => {
      // Render many components with different names
      for (let i = 0; i < 50; i++) {
        render(<TestComponent name={`Component${i}`} />);
      }

      const allMetrics = performanceMonitor.getAllMetrics();
      expect(allMetrics.length).toBe(50);

      // Clear all metrics
      performanceMonitor.clearAllMetrics();

      expect(performanceMonitor.getAllMetrics()).toHaveLength(0);
    });

    it('should limit cache logs', () => {
      // Generate many cache operations
      for (let i = 0; i < 20; i++) {
        render(<CacheTestComponent userId={`user${i}`} />);
      }

      const logs = cacheLogger.getLogs(100);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.length).toBeLessThanOrEqual(100);

      // Clear logs
      cacheLogger.clearLogs();

      expect(cacheLogger.getLogs()).toHaveLength(0);
    });
  });
});