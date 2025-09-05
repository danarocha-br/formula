import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performanceMonitor, useRenderTracker, useCacheTracker, measurePerformance, measurePerformanceAsync } from '../performance-monitor';
import { renderHook } from '@testing-library/react';

// Mock performance.now and performance.memory
const mockPerformanceNow = vi.fn();
const mockPerformanceMemory = {
  usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  totalJSHeapSize: 100 * 1024 * 1024, // 100MB
};

Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    memory: mockPerformanceMemory,
  },
  writable: true,
});

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleWarn = vi.fn();
const mockConsoleError = vi.fn();
const mockConsoleGroup = vi.fn();
const mockConsoleGroupEnd = vi.fn();

Object.defineProperty(global.console, 'log', { value: mockConsoleLog });
Object.defineProperty(global.console, 'warn', { value: mockConsoleWarn });
Object.defineProperty(global.console, 'error', { value: mockConsoleError });
Object.defineProperty(global.console, 'group', { value: mockConsoleGroup });
Object.defineProperty(global.console, 'groupEnd', { value: mockConsoleGroupEnd });

describe('Enhanced Performance Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
    performanceMonitor.clearAllMetrics();
    performanceMonitor.resetBenchmarks();

    // Force enable performance monitoring for tests
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    performanceMonitor.stopMemoryTracking();
  });

  describe('Render Tracking', () => {
    it('should track component renders', () => {
      // Mock performance.now to return different values for start and end
      mockPerformanceNow.mockReturnValueOnce(1016); // Called when trackRender calculates duration

      performanceMonitor.trackRender('TestComponent', 1000); // Start time is 1000

      const metrics = performanceMonitor.getRenderMetrics('TestComponent');
      expect(metrics).toEqual({
        componentName: 'TestComponent',
        renderCount: 1,
        lastRenderTime: expect.any(Number),
        averageRenderTime: 16, // 1016 - 1000 = 16ms
        totalRenderTime: 16,
        maxRenderTime: 16,
        minRenderTime: 16,
      });
    });

    it('should detect slow renders', () => {
      mockPerformanceNow.mockReturnValueOnce(1050); // Called when trackRender calculates duration

      performanceMonitor.trackRender('SlowComponent', 1000); // Start time is 1000, duration = 50ms

      const alerts = performanceMonitor.getAlertsByType('slow_render');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'slow_render',
        componentName: 'SlowComponent',
        severity: 'high',
        message: expect.stringContaining('took 50.00ms to render'),
      });
    });

    it('should detect excessive renders', () => {
      // Simulate many renders in a short time
      for (let i = 0; i < 60; i++) {
        mockPerformanceNow.mockReturnValue(1000 + i * 10);
        performanceMonitor.trackRender('ExcessiveComponent', 1000 + i * 10);
      }

      const alerts = performanceMonitor.getAlertsByType('excessive_renders');
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0]).toMatchObject({
        type: 'excessive_renders',
        componentName: 'ExcessiveComponent',
        severity: 'high',
      });
    });

    it('should update render benchmarks', () => {
      mockPerformanceNow.mockReturnValueOnce(1016); // First render: 16ms
      performanceMonitor.trackRender('TestComponent', 1000);

      mockPerformanceNow.mockReturnValueOnce(2050); // Second render: 50ms (regression)
      performanceMonitor.trackRender('TestComponent', 2000);

      const regressions = performanceMonitor.getRegressions();
      expect(regressions.length).toBeGreaterThan(0);
      expect(regressions[0].name).toBe('render-TestComponent');
    });
  });

  describe('Cache Operation Tracking', () => {
    it('should track cache operations', () => {
      performanceMonitor.trackCacheOperation('add', 'equipment', 25, true, { itemId: 123 });

      const metrics = performanceMonitor.getCacheMetrics('equipment', 'add');
      expect(metrics).toEqual({
        operation: 'add',
        feature: 'equipment',
        operationCount: 1,
        totalDuration: 25,
        averageDuration: 25,
        maxDuration: 25,
        minDuration: 25,
        successCount: 1,
        failureCount: 0,
        lastOperationTime: expect.any(Number),
      });
    });

    it('should detect slow cache operations', () => {
      performanceMonitor.trackCacheOperation('update', 'billable', 100, true); // 100ms (slow)

      const alerts = performanceMonitor.getAlertsByType('cache_slow');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'cache_slow',
        feature: 'billable',
        operation: 'update',
        severity: 'high',
        message: expect.stringContaining('took 100.00ms'),
      });
    });

    it('should detect high cache failure rates', () => {
      // Add successful operations first
      for (let i = 0; i < 10; i++) {
        performanceMonitor.trackCacheOperation('delete', 'equipment', 10, true);
      }

      // Add failed operations to trigger high failure rate
      for (let i = 0; i < 5; i++) {
        performanceMonitor.trackCacheOperation('delete', 'equipment', 10, false);
      }

      const alerts = performanceMonitor.getAlertsByType('cache_failure');
      // Filter to only cache_failure alerts for this specific operation
      const relevantAlerts = alerts.filter(alert =>
        alert.feature === 'equipment' && alert.operation === 'delete'
      );
      expect(relevantAlerts).toHaveLength(1);
      expect(relevantAlerts[0]).toMatchObject({
        type: 'cache_failure',
        feature: 'equipment',
        operation: 'delete',
        severity: 'high',
        message: expect.stringContaining('high failure rate'),
      });
    });

    it('should update cache benchmarks', () => {
      performanceMonitor.trackCacheOperation('add', 'equipment', 10, true);
      performanceMonitor.trackCacheOperation('add', 'equipment', 30, true); // Regression (200% increase)

      const regressions = performanceMonitor.getRegressions();
      expect(regressions.length).toBeGreaterThan(0);
      expect(regressions[0].name).toBe('cache-equipment-add');
    });
  });

  describe('Memory Tracking', () => {
    it('should track memory usage', () => {
      performanceMonitor.trackMemoryUsage(100, 50, 25);

      const memoryHistory = performanceMonitor.getMemoryHistory();
      expect(memoryHistory).toHaveLength(1);
      expect(memoryHistory[0]).toMatchObject({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        cacheSize: 100,
        queryCount: 50,
        componentCount: 25,
      });
    });

    it('should detect memory leaks', () => {
      // Simulate increasing memory usage - need at least 10 samples for leak detection
      for (let i = 0; i < 15; i++) {
        mockPerformanceMemory.usedJSHeapSize = (50 + i * 10) * 1024 * 1024; // Increase by 10MB each time
        performanceMonitor.trackMemoryUsage();
      }

      const alerts = performanceMonitor.getAlertsByType('memory_leak');
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0]).toMatchObject({
        type: 'memory_leak',
        severity: 'critical', // Should be critical due to large increase
        message: expect.stringContaining('memory leak detected'),
      });
    });

    it('should start and stop memory tracking', () => {
      vi.useFakeTimers();

      performanceMonitor.startMemoryTracking();
      expect(performanceMonitor['memoryTrackingInterval']).toBeDefined();

      performanceMonitor.stopMemoryTracking();
      expect(performanceMonitor['memoryTrackingInterval']).toBeUndefined();

      vi.useRealTimers();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should create and update benchmarks', () => {
      performanceMonitor['updateBenchmark']('test-operation', 'cache', 10);

      const benchmarks = performanceMonitor.getBenchmarks();
      expect(benchmarks).toHaveLength(1);
      expect(benchmarks[0]).toMatchObject({
        name: 'test-operation',
        category: 'cache',
        baseline: 10,
        current: 10,
        regression: false,
      });
    });

    it('should detect performance regressions', () => {
      performanceMonitor['updateBenchmark']('test-operation', 'cache', 10);
      performanceMonitor['updateBenchmark']('test-operation', 'cache', 20); // 100% increase (regression)

      const regressions = performanceMonitor.getRegressions();
      expect(regressions).toHaveLength(1);
      expect(regressions[0].regression).toBe(true);

      const alerts = performanceMonitor.getAlertsByType('regression');
      expect(alerts).toHaveLength(1);
    });

    it('should reset benchmarks', () => {
      performanceMonitor['updateBenchmark']('test-operation', 'cache', 10);
      expect(performanceMonitor.getBenchmarks()).toHaveLength(1);

      performanceMonitor.resetBenchmarks();
      expect(performanceMonitor.getBenchmarks()).toHaveLength(0);
    });
  });

  describe('Alert Management', () => {
    it('should categorize alerts by severity', () => {
      performanceMonitor['addAlert']({
        type: 'slow_render',
        message: 'Test critical alert',
        timestamp: Date.now(),
        metrics: {},
        severity: 'critical',
      });

      performanceMonitor['addAlert']({
        type: 'cache_slow',
        message: 'Test medium alert',
        timestamp: Date.now(),
        metrics: {},
        severity: 'medium',
      });

      const criticalAlerts = performanceMonitor.getAlertsBySeverity('critical');
      const mediumAlerts = performanceMonitor.getAlertsBySeverity('medium');

      expect(criticalAlerts).toHaveLength(1);
      expect(mediumAlerts).toHaveLength(1);
    });

    it('should limit alert history', () => {
      // Add more alerts than the maximum
      for (let i = 0; i < 250; i++) {
        performanceMonitor['addAlert']({
          type: 'slow_render',
          message: `Alert ${i}`,
          timestamp: Date.now(),
          metrics: {},
          severity: 'low',
        });
      }

      const allAlerts = performanceMonitor.getAlerts(300);
      expect(allAlerts.length).toBeLessThanOrEqual(200); // MAX_ALERTS = 200
    });
  });

  describe('React Hooks', () => {
    it('should track renders with useRenderTracker', () => {
      mockPerformanceNow.mockReturnValue(1000);

      renderHook(() => useRenderTracker('HookComponent'));

      const metrics = performanceMonitor.getRenderMetrics('HookComponent');
      expect(metrics?.componentName).toBe('HookComponent');
      expect(metrics?.renderCount).toBe(1);
    });

    it('should track cache operations with useCacheTracker', () => {
      const { result } = renderHook(() => useCacheTracker('test-feature'));

      result.current('add', 25, true, { itemId: 123 });

      const metrics = performanceMonitor.getCacheMetrics('test-feature', 'add');
      expect(metrics?.operationCount).toBe(1);
      expect(metrics?.averageDuration).toBe(25);
    });
  });

  describe('Performance Measurement Utilities', () => {
    it('should measure synchronous function performance', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1025); // 25ms

      const testFn = vi.fn(() => 'result');
      const result = measurePerformance(testFn, 'test-operation', 'test-feature');

      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalled();

      const metrics = performanceMonitor.getCacheMetrics('test-feature', 'test-operation');
      expect(metrics?.averageDuration).toBe(25);
      expect(metrics?.successCount).toBe(1);
    });

    it('should measure asynchronous function performance', async () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1030); // 30ms

      const testFn = vi.fn(async () => 'async-result');
      const result = await measurePerformanceAsync(testFn, 'async-operation', 'test-feature');

      expect(result).toBe('async-result');
      expect(testFn).toHaveBeenCalled();

      const metrics = performanceMonitor.getCacheMetrics('test-feature', 'async-operation');
      expect(metrics?.averageDuration).toBe(30);
      expect(metrics?.successCount).toBe(1);
    });

    it('should track failed operations', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1020); // 20ms

      const testFn = vi.fn(() => {
        throw new Error('Test error');
      });

      expect(() => measurePerformance(testFn, 'failing-operation', 'test-feature')).toThrow('Test error');

      const metrics = performanceMonitor.getCacheMetrics('test-feature', 'failing-operation');
      expect(metrics?.averageDuration).toBe(20);
      expect(metrics?.failureCount).toBe(1);
      expect(metrics?.successCount).toBe(0);
    });
  });

  describe('Reporting', () => {
    it('should generate comprehensive performance report', () => {
      // Add some test data
      performanceMonitor.trackRender('TestComponent', 1000);
      performanceMonitor.trackCacheOperation('add', 'equipment', 25, true);
      performanceMonitor.trackMemoryUsage(100, 50, 25);

      const report = performanceMonitor.generateReport();

      expect(report).toMatchObject({
        summary: {
          totalComponents: 1,
          totalCacheOperations: 1,
          totalAlerts: expect.any(Number),
          criticalAlerts: expect.any(Number),
          memoryUsage: expect.any(Number),
          regressions: expect.any(Number),
        },
        renderMetrics: expect.arrayContaining([
          expect.objectContaining({ componentName: 'TestComponent' })
        ]),
        cacheMetrics: expect.arrayContaining([
          expect.objectContaining({ feature: 'equipment', operation: 'add' })
        ]),
        memoryMetrics: expect.any(Array),
        benchmarks: expect.any(Array),
        alerts: expect.any(Array),
      });
    });

    it('should log comprehensive summary', () => {
      performanceMonitor.trackRender('TestComponent', 1000);
      performanceMonitor.trackCacheOperation('add', 'equipment', 25, true);
      performanceMonitor.trackMemoryUsage(100, 50, 25);

      performanceMonitor.logSummary();

      expect(mockConsoleGroup).toHaveBeenCalledWith('🔍 Enhanced Performance Monitor Summary');
      expect(mockConsoleGroupEnd).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clear all metrics and history', () => {
      performanceMonitor.trackRender('TestComponent', 1000);
      performanceMonitor.trackCacheOperation('add', 'equipment', 25, true);
      performanceMonitor.trackMemoryUsage(100, 50, 25);

      expect(performanceMonitor.getAllRenderMetrics()).toHaveLength(1);
      expect(performanceMonitor.getAllCacheMetrics()).toHaveLength(1);
      expect(performanceMonitor.getMemoryHistory()).toHaveLength(1);

      performanceMonitor.clearAllMetrics();

      expect(performanceMonitor.getAllRenderMetrics()).toHaveLength(0);
      expect(performanceMonitor.getAllCacheMetrics()).toHaveLength(0);
      expect(performanceMonitor.getMemoryHistory()).toHaveLength(0);
    });

    it('should cleanup properly', () => {
      performanceMonitor.startMemoryTracking();
      expect(performanceMonitor['memoryTrackingInterval']).toBeDefined();

      performanceMonitor.cleanup();

      expect(performanceMonitor['memoryTrackingInterval']).toBeUndefined();
      expect(performanceMonitor.getAllRenderMetrics()).toHaveLength(0);
    });
  });
});