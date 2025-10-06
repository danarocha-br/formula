import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  withPerformanceTracking,
  withAsyncPerformanceTracking,
  createMonitoredCacheUtils,
  MonitoredQueryClient,
  withMutationPerformanceTracking,
  withQueryPerformanceTracking,
  PerformanceRegressionDetector,
  performanceRegressionDetector,
  createPerformanceAwareCacheOperation,
  initializePerformanceMonitoring,
} from '../performance-integration';
import { performanceMonitor } from '../performance-monitor';

// Mock performance.now
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

// Mock console methods
const mockConsoleWarn = vi.fn();
const mockConsoleLog = vi.fn();
Object.defineProperty(global.console, 'warn', { value: mockConsoleWarn });
Object.defineProperty(global.console, 'log', { value: mockConsoleLog });

describe('Performance Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
    performanceMonitor.clearAllMetrics();
    performanceMonitor.resetBenchmarks();
  });

  describe('Performance Tracking Wrappers', () => {
    it('should wrap synchronous functions with performance tracking', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1025); // 25ms

      const originalFn = vi.fn((a: number, b: number) => a + b);
      const wrappedFn = withPerformanceTracking(originalFn, 'add', 'math');

      const result = wrappedFn(2, 3);

      expect(result).toBe(5);
      expect(originalFn).toHaveBeenCalledWith(2, 3);

      const metrics = performanceMonitor.getCacheMetrics('math', 'add');
      expect(metrics?.averageDuration).toBe(25);
      expect(metrics?.successCount).toBe(1);
    });

    it('should wrap asynchronous functions with performance tracking', async () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1030); // 30ms

      const originalFn = vi.fn(async (value: string) => `processed-${value}`);
      const wrappedFn = withAsyncPerformanceTracking(originalFn, 'process', 'async');

      const result = await wrappedFn('test');

      expect(result).toBe('processed-test');
      expect(originalFn).toHaveBeenCalledWith('test');

      const metrics = performanceMonitor.getCacheMetrics('async', 'process');
      expect(metrics?.averageDuration).toBe(30);
      expect(metrics?.successCount).toBe(1);
    });

    it('should track failed operations', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1020); // 20ms

      const originalFn = vi.fn(() => {
        throw new Error('Test error');
      });
      const wrappedFn = withPerformanceTracking(originalFn, 'fail', 'error');

      expect(() => wrappedFn()).toThrow('Test error');

      const metrics = performanceMonitor.getCacheMetrics('error', 'fail');
      expect(metrics?.averageDuration).toBe(20);
      expect(metrics?.failureCount).toBe(1);
      expect(metrics?.successCount).toBe(0);
    });
  });

  describe('Monitored Cache Utils', () => {
    it('should create monitored cache utilities', () => {
      const baseCacheUtils = {
        addItem: vi.fn(),
        updateItem: vi.fn(),
        removeItem: vi.fn(),
        constant: 'test-value',
      };

      const monitoredUtils = createMonitoredCacheUtils(baseCacheUtils, 'test-feature');

      expect(typeof monitoredUtils.addItem).toBe('function');
      expect(typeof monitoredUtils.updateItem).toBe('function');
      expect(typeof monitoredUtils.removeItem).toBe('function');
      expect(monitoredUtils.constant).toBe('test-value');

      // Test that wrapped functions work
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1015); // 15ms
      monitoredUtils.addItem('test');

      expect(baseCacheUtils.addItem).toHaveBeenCalledWith('test');
      const metrics = performanceMonitor.getCacheMetrics('test-feature', 'addItem');
      expect(metrics?.averageDuration).toBe(15);
    });
  });

  describe('MonitoredQueryClient', () => {
    let queryClient: QueryClient;
    let monitoredClient: MonitoredQueryClient;

    beforeEach(() => {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      monitoredClient = new MonitoredQueryClient(queryClient);
    });

    it('should track cache metrics', () => {
      // Add some test data to the cache
      queryClient.setQueryData(['test', 'data'], [{ id: 1 }, { id: 2 }]);
      queryClient.setQueryData(['other', 'data'], { id: 3 });

      monitoredClient.trackCacheMetrics();

      const memoryHistory = performanceMonitor.getMemoryHistory();
      expect(memoryHistory.length).toBeGreaterThan(0);

      const latest = memoryHistory[memoryHistory.length - 1];
      expect(latest.cacheSize).toBe(3); // 2 items in array + 1 object
      expect(latest.queryCount).toBe(2); // 2 queries
    });

    it('should wrap setQueryData with performance tracking', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1010); // 10ms

      monitoredClient.setQueryData(['test'], { id: 1 });

      const metrics = performanceMonitor.getCacheMetrics('react-query', 'setQueryData');
      expect(metrics?.averageDuration).toBe(10);
      expect(metrics?.successCount).toBe(1);
    });

    it('should wrap getQueryData with performance tracking', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1005); // 5ms

      queryClient.setQueryData(['test'], { id: 1 });
      const result = monitoredClient.getQueryData(['test']);

      expect(result).toEqual({ id: 1 });
      const metrics = performanceMonitor.getCacheMetrics('react-query', 'getQueryData');
      expect(metrics?.averageDuration).toBe(5);
    });

    it('should provide access to underlying query client', () => {
      expect(monitoredClient.getQueryClient()).toBe(queryClient);
    });
  });

  describe('Mutation Performance Tracking', () => {
    it('should wrap mutation configuration with performance tracking', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(1000).mockReturnValueOnce(1050) // mutationFn: 50ms
        .mockReturnValueOnce(2000).mockReturnValueOnce(2010) // onSuccess: 10ms
        .mockReturnValueOnce(3000).mockReturnValueOnce(3005); // onSettled: 5ms

      const mutationConfig = {
        mutationFn: vi.fn(async (data: { id: number }) => ({ ...data, processed: true })),
        onSuccess: vi.fn((data: any, variables: any) => {
          console.log('Success', data, variables);
        }),
        onSettled: vi.fn(() => {
          console.log('Settled');
        }),
      };

      const wrappedConfig = withMutationPerformanceTracking(
        mutationConfig,
        'create',
        'test-feature'
      );

      // Execute mutation
      const result = await wrappedConfig.mutationFn({ id: 1 });
      wrappedConfig.onSuccess?.(result, { id: 1 }, null);
      wrappedConfig.onSettled?.(result, null, { id: 1 }, null);

      expect(result).toEqual({ id: 1, processed: true });

      // Check performance tracking
      const mutationMetrics = performanceMonitor.getCacheMetrics('test-feature', 'create');
      const successMetrics = performanceMonitor.getCacheMetrics('test-feature', 'create-onSuccess');
      const settledMetrics = performanceMonitor.getCacheMetrics('test-feature', 'create-onSettled');

      expect(mutationMetrics?.averageDuration).toBe(50);
      expect(successMetrics?.averageDuration).toBe(10);
      expect(settledMetrics?.averageDuration).toBe(5);
    });
  });

  describe('Query Performance Tracking', () => {
    it('should wrap query configuration with performance tracking', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(1000).mockReturnValueOnce(1040) // queryFn: 40ms
        .mockReturnValueOnce(2000).mockReturnValueOnce(2005) // select: 5ms
        .mockReturnValueOnce(3000).mockReturnValueOnce(3002); // onSuccess: 2ms

      const queryConfig = {
        queryFn: vi.fn(async () => ({ data: [1, 2, 3] })),
        select: vi.fn((data: any) => data.data.length),
        onSuccess: vi.fn((data: any) => {
          console.log('Query success', data);
        }),
      };

      const wrappedConfig = withQueryPerformanceTracking(
        queryConfig,
        'fetch',
        'test-feature'
      );

      // Execute query
      const result = await wrappedConfig.queryFn();
      const selected = wrappedConfig.select?.(result);
      wrappedConfig.onSuccess?.(selected);

      expect(result).toEqual({ data: [1, 2, 3] });
      expect(selected).toBe(3);

      // Check performance tracking
      const queryMetrics = performanceMonitor.getCacheMetrics('test-feature', 'fetch');
      const selectMetrics = performanceMonitor.getCacheMetrics('test-feature', 'fetch-select');
      const successMetrics = performanceMonitor.getCacheMetrics('test-feature', 'fetch-onSuccess');

      expect(queryMetrics?.averageDuration).toBe(40);
      expect(selectMetrics?.averageDuration).toBe(5);
      expect(successMetrics?.averageDuration).toBe(2);
    });
  });

  describe('Performance Regression Detector', () => {
    let detector: PerformanceRegressionDetector;

    beforeEach(() => {
      detector = new PerformanceRegressionDetector();
    });

    it('should record baseline performance', () => {
      detector.recordBaseline('add', 'cache', 10);

      const baselines = detector.getBaselines();
      expect(baselines.get('cache-add')).toBe(10);
    });

    it('should update baseline with moving average', () => {
      detector.recordBaseline('add', 'cache', 10);
      detector.recordBaseline('add', 'cache', 20);

      const baselines = detector.getBaselines();
      expect(baselines.get('cache-add')).toBe(15); // (10 + 20) / 2
    });

    it('should detect performance regression', () => {
      detector.recordBaseline('add', 'cache', 10);

      const hasRegression = detector.checkRegression('add', 'cache', 20); // 100% increase
      expect(hasRegression).toBe(true);
    });

    it('should not detect regression within threshold', () => {
      detector.recordBaseline('add', 'cache', 10);

      const hasRegression = detector.checkRegression('add', 'cache', 14); // 40% increase (below 50% threshold)
      expect(hasRegression).toBe(false);
    });

    it('should reset baselines', () => {
      detector.recordBaseline('add', 'cache', 10);
      expect(detector.getBaselines().size).toBe(1);

      detector.resetBaselines();
      expect(detector.getBaselines().size).toBe(0);
    });
  });

  describe('Performance Aware Cache Operations', () => {
    it('should create performance-aware cache operations', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1025); // 25ms

      const operation = vi.fn((value: number) => value * 2);
      const performanceAwareOp = createPerformanceAwareCacheOperation(
        operation,
        'multiply',
        'math',
        { trackRegression: true, alertOnSlow: true, slowThreshold: 20 }
      );

      const result = performanceAwareOp(5);

      expect(result).toBe(10);
      expect(operation).toHaveBeenCalledWith(5);

      // Should alert on slow operation (25ms > 20ms threshold)
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Slow cache operation detected: math-multiply took 25.00ms')
      );

      const metrics = performanceMonitor.getCacheMetrics('math', 'multiply');
      expect(metrics?.averageDuration).toBe(25);
    });

    it('should detect regression in performance-aware operations', () => {
      // Set baseline
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1010); // 10ms
      const operation = vi.fn((value: number) => value * 2);
      const performanceAwareOp = createPerformanceAwareCacheOperation(
        operation,
        'multiply',
        'math'
      );

      performanceAwareOp(5); // Establish baseline

      // Trigger regression
      mockPerformanceNow.mockReturnValueOnce(2000).mockReturnValueOnce(2020); // 20ms (100% increase)
      performanceAwareOp(10);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Performance regression detected in math-multiply: 20.00ms')
      );
    });
  });

  describe('Initialization', () => {
    it('should initialize performance monitoring', () => {
      const initializeSpy = vi.spyOn(performanceMonitor, 'initialize');

      initializePerformanceMonitoring();

      expect(initializeSpy).toHaveBeenCalled();
    });
  });

  describe('Global Regression Detector', () => {
    it('should provide global regression detector instance', () => {
      expect(performanceRegressionDetector).toBeInstanceOf(PerformanceRegressionDetector);

      performanceRegressionDetector.recordBaseline('test', 'global', 15);
      const baselines = performanceRegressionDetector.getBaselines();
      expect(baselines.get('global-test')).toBe(15);
    });
  });
});