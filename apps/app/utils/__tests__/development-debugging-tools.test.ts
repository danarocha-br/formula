/**
 * Tests for development debugging tools
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  developmentDebuggingTools,
  useRenderMonitoring,
  useStateChangeMonitoring,
  initializeDevelopmentDebugging,
  devDebugCommands,
} from '../development-debugging-tools';

// Mock console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  group: console.group,
  groupEnd: console.groupEnd,
};

const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
};

describe('DevelopmentDebuggingTools', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Set development environment for tests
    process.env.NODE_ENV = 'development';

    // Mock console methods
    Object.assign(console, mockConsole);

    // Clear all metrics before each test
    developmentDebuggingTools.clearAll();

    // Reset all mocks
    Object.values(mockConsole).forEach(mock => mock.mockClear());
  });

  afterAll(() => {
    // Restore environment
    process.env.NODE_ENV = originalEnv;

    // Restore console methods
    Object.assign(console, originalConsole);
  });

  describe('render tracking', () => {
    it('should track component renders', () => {
      const metrics1 = developmentDebuggingTools.trackRender('TestComponent');
      expect(metrics1.componentName).toBe('TestComponent');
      expect(metrics1.renderCount).toBe(1);
      expect(metrics1.isExcessive).toBe(false);

      const metrics2 = developmentDebuggingTools.trackRender('TestComponent');
      expect(metrics2.renderCount).toBe(2);
    });

    it('should detect excessive rendering', () => {
      // Configure low thresholds for testing
      developmentDebuggingTools.configure({
        warningThreshold: 2,
        errorThreshold: 5,
      });

      // Simulate rapid renders
      for (let i = 0; i < 10; i++) {
        developmentDebuggingTools.trackRender('ExcessiveComponent');
      }

      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();

      const metrics = developmentDebuggingTools.getRenderMetrics('ExcessiveComponent');
      expect(metrics?.isExcessive).toBe(true);
    });

    it('should reset render count after monitoring window', async () => {
      // Configure short monitoring window for testing
      developmentDebuggingTools.configure({
        monitoringWindow: 100, // 100ms
      });

      developmentDebuggingTools.trackRender('TestComponent');

      // Wait for monitoring window to pass
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = developmentDebuggingTools.trackRender('TestComponent');
      expect(metrics.renderCount).toBe(1); // Should reset
    });

    it('should calculate renders per second correctly', () => {
      const startTime = performance.now();

      // Mock performance.now to control timing
      const mockPerformanceNow = vi.spyOn(performance, 'now');
      mockPerformanceNow.mockReturnValue(startTime);

      developmentDebuggingTools.trackRender('TimingComponent');

      // Simulate 1 second passing with 5 more renders
      mockPerformanceNow.mockReturnValue(startTime + 1000);
      for (let i = 0; i < 5; i++) {
        developmentDebuggingTools.trackRender('TimingComponent');
      }

      const metrics = developmentDebuggingTools.getRenderMetrics('TimingComponent');
      expect(metrics?.rendersPerSecond).toBeCloseTo(6, 1); // 6 renders in 1 second

      mockPerformanceNow.mockRestore();
    });
  });

  describe('state change logging', () => {
    it('should log state changes', () => {
      developmentDebuggingTools.logStateChange(
        'TestComponent',
        'count',
        0,
        1
      );

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('State change in TestComponent.count'),
        expect.objectContaining({
          from: 0,
          to: 1,
        })
      );

      const logs = developmentDebuggingTools.getStateChangeLogs('TestComponent');
      expect(logs).toHaveLength(1);
      expect(logs[0].stateName).toBe('count');
      expect(logs[0].oldValue).toBe(0);
      expect(logs[0].newValue).toBe(1);
    });

    it('should serialize complex values', () => {
      const complexObject = {
        nested: { value: 1 },
        array: [1, 2, 3],
        func: () => {},
        set: new Set([1, 2, 3]),
        map: new Map([['key', 'value']]),
      };

      developmentDebuggingTools.logStateChange(
        'TestComponent',
        'complexState',
        null,
        complexObject
      );

      const logs = developmentDebuggingTools.getStateChangeLogs('TestComponent');
      expect(logs[0].newValue).toEqual(expect.objectContaining({
        nested: '[Object]',
        array: '[Object]',
        func: expect.any(Function),
        set: '[Object]',
        map: '[Object]',
      }));
    });

    it('should limit log size', () => {
      // Configure small log limit for testing
      const originalMaxLogs = (developmentDebuggingTools as any).MAX_STATE_LOGS;
      (developmentDebuggingTools as any).MAX_STATE_LOGS = 5;

      // Add more logs than the limit
      for (let i = 0; i < 10; i++) {
        developmentDebuggingTools.logStateChange(
          'TestComponent',
          `state${i}`,
          i - 1,
          i
        );
      }

      const logs = developmentDebuggingTools.getStateChangeLogs();
      expect(logs).toHaveLength(5);
      expect(logs[0].stateName).toBe('state5'); // Should keep the latest logs

      // Restore original limit
      (developmentDebuggingTools as any).MAX_STATE_LOGS = originalMaxLogs;
    });
  });

  describe('configuration', () => {
    it('should allow configuration updates', () => {
      const config = {
        maxRendersPerSecond: 50,
        warningThreshold: 25,
        errorThreshold: 75,
        logStateChanges: false,
      };

      developmentDebuggingTools.configure(config);

      // Test that configuration is applied
      developmentDebuggingTools.logStateChange('Test', 'state', 0, 1);
      expect(mockConsole.log).not.toHaveBeenCalled(); // Should not log due to config
    });
  });

  describe('reporting', () => {
    it('should generate comprehensive report', () => {
      // Add some test data
      developmentDebuggingTools.trackRender('Component1');
      developmentDebuggingTools.trackRender('Component2');
      developmentDebuggingTools.logStateChange('Component1', 'state1', 0, 1);

      const report = developmentDebuggingTools.generateReport();

      expect(report.summary.totalComponents).toBe(2);
      expect(report.summary.totalStateChanges).toBe(1);
      expect(report.renderMetrics).toHaveLength(2);
      expect(report.stateChangeLogs).toHaveLength(1);
    });
  });
});

describe('useRenderMonitoring hook', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    Object.assign(console, mockConsole);
    developmentDebuggingTools.clearAll();
    Object.values(mockConsole).forEach(mock => mock.mockClear());
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    Object.assign(console, originalConsole);
  });

  it('should track renders using hook', () => {
    const { result, rerender } = renderHook(() =>
      useRenderMonitoring('HookTestComponent')
    );

    expect(result.current.metrics.componentName).toBe('HookTestComponent');
    expect(result.current.metrics.renderCount).toBe(1);

    rerender();
    expect(result.current.metrics.renderCount).toBe(2);
  });

  it('should provide state change logging function', () => {
    const { result } = renderHook(() =>
      useRenderMonitoring('HookTestComponent')
    );

    act(() => {
      result.current.logStateChange('testState', 'old', 'new');
    });

    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('State change in HookTestComponent.testState'),
      expect.objectContaining({
        from: 'old',
        to: 'new',
      })
    );
  });
});

describe('useStateChangeMonitoring hook', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    Object.assign(console, mockConsole);
    developmentDebuggingTools.clearAll();
    Object.values(mockConsole).forEach(mock => mock.mockClear());
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    Object.assign(console, originalConsole);
  });

  it('should monitor state changes automatically', () => {
    let value = 0;
    const { rerender } = renderHook(() =>
      useStateChangeMonitoring('AutoMonitorComponent', 'count', value)
    );

    // Change value and rerender
    value = 1;
    rerender();

    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('State change in AutoMonitorComponent.count'),
      expect.objectContaining({
        from: 0,
        to: 1,
      })
    );
  });

  it('should respect enabled flag', () => {
    let value = 0;
    const { rerender } = renderHook(() =>
      useStateChangeMonitoring('DisabledMonitorComponent', 'count', value, false)
    );

    value = 1;
    rerender();

    expect(mockConsole.log).not.toHaveBeenCalled();
  });
});

describe('devDebugCommands', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    Object.assign(console, mockConsole);
    developmentDebuggingTools.clearAll();
    Object.values(mockConsole).forEach(mock => mock.mockClear());
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    Object.assign(console, originalConsole);
  });

  it('should provide help command', () => {
    devDebugCommands.help();
    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('Development Debugging Commands')
    );
  });

  it('should generate report command', () => {
    developmentDebuggingTools.trackRender('TestComponent');
    const report = devDebugCommands.report();

    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('Development Debugging Report'),
      expect.any(Object)
    );
    expect(report.summary.totalComponents).toBe(1);
  });

  it('should show render metrics command', () => {
    developmentDebuggingTools.trackRender('TestComponent');
    const metrics = devDebugCommands.renders('TestComponent');

    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('Render metrics for TestComponent'),
      expect.any(Object)
    );
    expect(metrics?.componentName).toBe('TestComponent');
  });

  it('should show state logs command', () => {
    developmentDebuggingTools.logStateChange('TestComponent', 'state', 0, 1);
    const logs = devDebugCommands.states('TestComponent');

    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('State change logs for TestComponent'),
      expect.any(Array)
    );
    expect(logs).toHaveLength(1);
  });

  it('should show excessive components command', () => {
    // Configure low threshold and create excessive component
    developmentDebuggingTools.configure({ warningThreshold: 1 });
    developmentDebuggingTools.trackRender('ExcessiveComponent');
    developmentDebuggingTools.trackRender('ExcessiveComponent');

    const excessive = devDebugCommands.excessive();
    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('Components with excessive renders'),
      expect.any(Array)
    );
  });

  it('should clear all data command', () => {
    developmentDebuggingTools.trackRender('TestComponent');
    devDebugCommands.clear();

    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('Development debugging tools cleared')
    );

    const metrics = developmentDebuggingTools.getAllRenderMetrics();
    expect(metrics).toHaveLength(0);
  });

  it('should configure tools command', () => {
    const config = { warningThreshold: 50 };
    devDebugCommands.config(config);

    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('Debugging tools configured'),
      config
    );
  });
});

describe('initializeDevelopmentDebugging', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    Object.assign(console, mockConsole);
    Object.values(mockConsole).forEach(mock => mock.mockClear());
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    Object.assign(console, originalConsole);
  });

  it('should initialize debugging tools', () => {
    initializeDevelopmentDebugging();

    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('Development debugging tools initialized')
    );
  });

  it('should apply configuration during initialization', () => {
    const config = { warningThreshold: 100 };
    initializeDevelopmentDebugging(config);

    expect(mockConsole.log).toHaveBeenCalledWith(
      expect.stringContaining('Development debugging tools initialized')
    );
  });
});

describe('production environment', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should not track renders in production', () => {
    const metrics = developmentDebuggingTools.trackRender('ProductionComponent');
    expect(metrics.renderCount).toBe(0);
  });

  it('should not log state changes in production', () => {
    Object.assign(console, mockConsole);
    developmentDebuggingTools.logStateChange('ProductionComponent', 'state', 0, 1);
    expect(mockConsole.log).not.toHaveBeenCalled();
    Object.assign(console, originalConsole);
  });
});