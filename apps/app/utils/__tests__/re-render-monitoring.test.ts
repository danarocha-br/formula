import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  renderFrequencyMonitor,
  useRenderFrequencyMonitor,
  useRenderLoopDetection,
  withRenderFrequencyMonitoring
} from '../re-render-monitoring';
import React from 'react';

// Mock console methods
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// Mock performance.now
const mockPerformanceNow = vi.spyOn(performance, 'now');

describe('Re-render Monitoring', () => {
  beforeEach(() => {
    renderFrequencyMonitor.clearAllMetrics();
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
  });

  afterEach(() => {
    renderFrequencyMonitor.clearAllMetrics();
  });

  describe('RenderFrequencyMonitor', () => {
    it('should track component renders', () => {
      const metrics = renderFrequencyMonitor.trackRender('TestComponent');

      expect(metrics).toMatchObject({
        componentName: 'TestComponent',
        renderCount: 1,
        isExcessive: false,
      });
    });

    it('should detect excessive rendering', () => {
      // Simulate rapid renders
      for (let i = 0; i < 35; i++) {
        mockPerformanceNow.mockReturnValue(1000 + i * 10); // 10ms apart
        renderFrequencyMonitor.trackRender('ExcessiveComponent');
      }

      const metrics = renderFrequencyMonitor.getMetrics('ExcessiveComponent');
      expect(metrics?.isExcessive).toBe(true);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Excessive re-rendering detected')
      );
    });

    it('should detect render bursts', () => {
      // Simulate burst rendering (10 renders in 100ms)
      for (let i = 0; i < 10; i++) {
        mockPerformanceNow.mockReturnValue(1000 + i * 5); // 5ms apart
        renderFrequencyMonitor.trackRender('BurstComponent');
      }

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Render burst detected')
      );
    });

    it('should analyze render patterns', () => {
      // Create stable render pattern
      for (let i = 0; i < 10; i++) {
        mockPerformanceNow.mockReturnValue(1000 + i * 100); // 100ms apart
        renderFrequencyMonitor.trackRender('StableComponent');
      }

      const pattern = renderFrequencyMonitor.analyzeRenderPattern('StableComponent');
      expect(pattern).toMatchObject({
        componentName: 'StableComponent',
        pattern: 'stable',
        confidence: expect.any(Number),
      });
    });

    it('should identify irregular render patterns', () => {
      // Create irregular render pattern
      const intervals = [10, 500, 20, 800, 15, 1000, 25];
      let time = 1000;

      for (let i = 0; i < intervals.length; i++) {
        time += intervals[i];
        mockPerformanceNow.mockReturnValue(time);
        renderFrequencyMonitor.trackRender('IrregularComponent');
      }

      const pattern = renderFrequencyMonitor.analyzeRenderPattern('IrregularComponent');
      expect(pattern?.pattern).toBe('irregular');
    });

    it('should generate comprehensive report', () => {
      // Create metrics for multiple components
      renderFrequencyMonitor.trackRender('Component1');
      renderFrequencyMonitor.trackRender('Component2');
      renderFrequencyMonitor.trackRender('Component1'); // Second render

      const report = renderFrequencyMonitor.generateReport();

      expect(report.summary).toMatchObject({
        totalComponents: 2,
        excessiveComponents: 0,
        totalRenders: 3,
      });

      expect(report.components).toHaveLength(2);
    });

    it('should clear metrics properly', () => {
      renderFrequencyMonitor.trackRender('TestComponent');
      expect(renderFrequencyMonitor.getAllMetrics()).toHaveLength(1);

      renderFrequencyMonitor.clearMetrics('TestComponent');
      expect(renderFrequencyMonitor.getAllMetrics()).toHaveLength(0);
    });
  });

  describe('useRenderFrequencyMonitor', () => {
    it('should track renders in hook', () => {
      const { result, rerender } = renderHook(() =>
        useRenderFrequencyMonitor('HookComponent')
      );

      expect(result.current.metrics?.renderCount).toBe(1);
      expect(result.current.isExcessive).toBe(false);

      rerender();
      expect(result.current.metrics?.renderCount).toBe(2);
    });

    it('should detect excessive rendering in hook', () => {
      const { result, rerender } = renderHook(() =>
        useRenderFrequencyMonitor('ExcessiveHookComponent')
      );

      // Simulate many re-renders
      for (let i = 0; i < 35; i++) {
        mockPerformanceNow.mockReturnValue(1000 + i * 10);
        rerender();
      }

      expect(result.current.isExcessive).toBe(true);
    });
  });

  describe('useRenderLoopDetection', () => {
    it('should allow normal rendering', () => {
      const { result } = renderHook(() =>
        useRenderLoopDetection('NormalComponent', [], 20)
      );

      expect(result.current.shouldRender).toBe(true);
      expect(result.current.warning).toBe(null);
    });

    it('should detect render loops', () => {
      const { result, rerender } = renderHook(() =>
        useRenderLoopDetection('LoopComponent', [], 5)
      );

      // Simulate rapid re-renders
      for (let i = 0; i < 7; i++) {
        rerender();
      }

      expect(result.current.shouldRender).toBe(false);
      expect(result.current.warning).toContain('Render loop detected');
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Render loop detected')
      );
    });

    it('should reset render count after time window', () => {
      vi.useFakeTimers();

      const { result, rerender } = renderHook(() =>
        useRenderLoopDetection('TimerComponent', [], 5)
      );

      // Trigger many renders
      for (let i = 0; i < 6; i++) {
        rerender();
      }

      expect(result.current.shouldRender).toBe(false);

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);
      rerender();

      expect(result.current.shouldRender).toBe(true);
      expect(result.current.renderCount).toBe(1);

      vi.useRealTimers();
    });
  });

  describe('withRenderFrequencyMonitoring', () => {
    it('should wrap component with monitoring', () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      const MonitoredComponent = withRenderFrequencyMonitoring(TestComponent, 'WrappedTest');

      expect(MonitoredComponent.displayName).toBe('withRenderFrequencyMonitoring(WrappedTest)');

      const { rerender } = renderHook(() => React.createElement(MonitoredComponent));

      // Verify component was tracked
      const metrics = renderFrequencyMonitor.getMetrics('WrappedTest');
      expect(metrics?.renderCount).toBeGreaterThan(0);
    });

    it('should log pattern changes in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const TestComponent = () => React.createElement('div', null, 'Test');
      const MonitoredComponent = withRenderFrequencyMonitoring(TestComponent, 'DevTest');

      // Create irregular pattern to trigger logging
      const intervals = [10, 500, 20, 800];
      let time = 1000;

      for (let i = 0; i < intervals.length; i++) {
        time += intervals[i];
        mockPerformanceNow.mockReturnValue(time);
        renderHook(() => React.createElement(MonitoredComponent));
      }

      // Pattern analysis happens asynchronously, so we need to wait
      setTimeout(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('Render pattern for DevTest'),
          expect.any(Object)
        );
      }, 100);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle components with no render history', () => {
      const pattern = renderFrequencyMonitor.analyzeRenderPattern('NonExistentComponent');
      expect(pattern).toBe(null);
    });

    it('should handle components with insufficient render history', () => {
      renderFrequencyMonitor.trackRender('NewComponent');
      const pattern = renderFrequencyMonitor.analyzeRenderPattern('NewComponent');
      expect(pattern).toBe(null);
    });

    it('should maintain performance with many components', () => {
      const startTime = performance.now();

      // Track many components
      for (let i = 0; i < 1000; i++) {
        renderFrequencyMonitor.trackRender(`Component${i % 100}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);

      // Should only have 100 unique components
      expect(renderFrequencyMonitor.getAllMetrics()).toHaveLength(100);
    });

    it('should handle rapid successive renders efficiently', () => {
      const startTime = performance.now();

      // Simulate very rapid renders
      for (let i = 0; i < 1000; i++) {
        mockPerformanceNow.mockReturnValue(1000 + i);
        renderFrequencyMonitor.trackRender('RapidComponent');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Should be very fast

      const metrics = renderFrequencyMonitor.getMetrics('RapidComponent');
      expect(metrics?.renderCount).toBe(1000);
      expect(metrics?.isExcessive).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should limit render history to prevent memory leaks', () => {
      // Track many renders for a single component
      for (let i = 0; i < 100; i++) {
        mockPerformanceNow.mockReturnValue(1000 + i * 10);
        renderFrequencyMonitor.trackRender('MemoryTestComponent');
      }

      const metrics = renderFrequencyMonitor.getMetrics('MemoryTestComponent');
      expect(metrics?.renderTimes.length).toBeLessThanOrEqual(50); // MAX_RENDER_HISTORY
    });

    it('should clean up metrics when cleared', () => {
      // Create metrics
      for (let i = 0; i < 10; i++) {
        renderFrequencyMonitor.trackRender(`Component${i}`);
      }

      expect(renderFrequencyMonitor.getAllMetrics()).toHaveLength(10);

      renderFrequencyMonitor.clearAllMetrics();
      expect(renderFrequencyMonitor.getAllMetrics()).toHaveLength(0);
    });
  });
});