import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { performanceMonitor, useRenderTracker, withRenderTracking } from '../performance-monitor';
import { renderHook } from '@testing-library/react';
import React from 'react';

// Mock performance.now
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleGroup = vi.spyOn(console, 'group').mockImplementation(() => {});
const mockConsoleGroupEnd = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.clearAllMetrics();
    mockPerformanceNow.mockReturnValue(100);
    vi.clearAllMocks();

    // Set NODE_ENV to development for testing
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('trackRender', () => {
    it('should track first render correctly', () => {
      performanceMonitor.trackRender('TestComponent', 90);

      const metrics = performanceMonitor.getMetrics('TestComponent');
      expect(metrics).toBeDefined();
      expect(metrics?.componentName).toBe('TestComponent');
      expect(metrics?.renderCount).toBe(1);
      expect(metrics?.averageRenderTime).toBe(10); // 100 - 90
    });

    it('should accumulate render metrics', () => {
      performanceMonitor.trackRender('TestComponent', 90); // 10ms render
      mockPerformanceNow.mockReturnValue(120);
      performanceMonitor.trackRender('TestComponent', 100); // 20ms render

      const metrics = performanceMonitor.getMetrics('TestComponent');
      expect(metrics?.renderCount).toBe(2);
      expect(metrics?.averageRenderTime).toBe(15); // (10 + 20) / 2
      expect(metrics?.maxRenderTime).toBe(20);
      expect(metrics?.minRenderTime).toBe(10);
    });

    it('should generate slow render alert', () => {
      mockPerformanceNow.mockReturnValue(150); // Current time
      performanceMonitor.trackRender('SlowComponent', 100); // Started at 100, now 150 = 50ms render (> 16ms threshold)

      const alerts = performanceMonitor.getAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('slow_render');
      expect(alerts[0].componentName).toBe('SlowComponent');
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Performance Alert [slow_render]')
      );
    });

    it('should not track renders in production', () => {
      performanceMonitor.clearAllMetrics(); // Clear any existing metrics
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      performanceMonitor.trackRender('TestComponent', 90);

      const metrics = performanceMonitor.getMetrics('TestComponent');
      expect(metrics).toBeUndefined();

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('memory leak detection', () => {
    it('should limit stored alerts to prevent memory leaks', () => {
      // Generate more alerts than the limit
      for (let i = 0; i < 150; i++) {
        performanceMonitor.trackRender(`Component${i}`, 50); // Slow renders
      }

      const alerts = performanceMonitor.getAlerts(200);
      expect(alerts.length).toBeLessThanOrEqual(100); // MAX_ALERTS = 100
    });

    it('should clear metrics when requested', () => {
      performanceMonitor.trackRender('TestComponent', 90);
      expect(performanceMonitor.getMetrics('TestComponent')).toBeDefined();

      performanceMonitor.clearMetrics('TestComponent');
      expect(performanceMonitor.getMetrics('TestComponent')).toBeUndefined();
    });

    it('should clear all metrics when requested', () => {
      performanceMonitor.trackRender('Component1', 90);
      performanceMonitor.trackRender('Component2', 90);

      expect(performanceMonitor.getAllMetrics()).toHaveLength(2);

      performanceMonitor.clearAllMetrics();
      expect(performanceMonitor.getAllMetrics()).toHaveLength(0);
      expect(performanceMonitor.getAlerts()).toHaveLength(0);
    });
  });

  describe('useRenderTracker hook', () => {
    it('should track renders when used in a component', () => {
      const { rerender } = renderHook(() => useRenderTracker('HookTestComponent'));

      expect(performanceMonitor.getMetrics('HookTestComponent')).toBeDefined();
      expect(performanceMonitor.getMetrics('HookTestComponent')?.renderCount).toBe(1);

      rerender();
      expect(performanceMonitor.getMetrics('HookTestComponent')?.renderCount).toBe(2);
    });
  });

  describe('withRenderTracking HOC', () => {
    it('should create a wrapped component that tracks renders', () => {
      const TestComponent = () => React.createElement('div', null, 'test');
      const TrackedComponent = withRenderTracking(TestComponent, 'HOCTestComponent');

      expect(TrackedComponent.displayName).toBe('withRenderTracking(HOCTestComponent)');
    });

    it('should use component name when no custom name provided', () => {
      const TestComponent = () => React.createElement('div', null, 'test');
      TestComponent.displayName = 'MyTestComponent';

      const TrackedComponent = withRenderTracking(TestComponent);
      expect(TrackedComponent.displayName).toBe('withRenderTracking(MyTestComponent)');
    });
  });

  describe('performance summary logging', () => {
    it('should log performance summary', () => {
      performanceMonitor.trackRender('Component1', 90);
      performanceMonitor.trackRender('Component2', 80);
      performanceMonitor.trackRender('Component1', 85); // Second render

      performanceMonitor.logSummary();

      expect(mockConsoleGroup).toHaveBeenCalledWith('🔍 Performance Monitor Summary');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Component1: 2 renders')
      );
      expect(mockConsoleGroupEnd).toHaveBeenCalled();
    });

    it('should not log when no metrics exist', () => {
      performanceMonitor.logSummary();

      expect(mockConsoleGroup).not.toHaveBeenCalled();
    });

    it('should include alerts in summary', () => {
      mockPerformanceNow.mockReturnValue(150); // Current time
      performanceMonitor.trackRender('SlowComponent', 100); // Started at 100, now 150 = 50ms render (> 16ms threshold)

      performanceMonitor.logSummary();

      expect(mockConsoleGroup).toHaveBeenCalledWith('🚨 Recent Alerts');
    });
  });

  describe('performance thresholds', () => {
    it('should identify problematic components', () => {
      // Create a component with many renders
      for (let i = 0; i < 25; i++) {
        performanceMonitor.trackRender('ProblematicComponent', 95);
      }

      performanceMonitor.logSummary();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ ProblematicComponent')
      );
    });

    it('should mark good components with checkmark', () => {
      performanceMonitor.trackRender('GoodComponent', 99); // 1ms render, 1 render

      performanceMonitor.logSummary();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ GoodComponent')
      );
    });
  });
});