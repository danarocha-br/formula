/**
 * Integration tests for development debugging tools with React components
 */

import React, { useState, useEffect } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  useRenderMonitoring,
  useStateChangeMonitoring,
  withRenderMonitoring,
  developmentDebuggingTools,
  initializeDevelopmentDebugging,
} from '../../utils/development-debugging-tools';

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
};

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  group: console.group,
  groupEnd: console.groupEnd,
};

// Test component with render monitoring
const TestComponentWithMonitoring: React.FC<{ triggerRerender?: boolean }> = ({ triggerRerender }) => {
  const [count, setCount] = useState(0);
  const { metrics, isExcessive, logStateChange } = useRenderMonitoring('TestComponentWithMonitoring');

  // Monitor state changes
  const monitoredCount = useStateChangeMonitoring('TestComponentWithMonitoring', 'count', count);

  useEffect(() => {
    if (triggerRerender) {
      // Trigger multiple re-renders to test excessive rendering detection
      const interval = setInterval(() => {
        setCount(prev => prev + 1);
      }, 10);

      setTimeout(() => clearInterval(interval), 100);
      return () => clearInterval(interval);
    }
  }, [triggerRerender]);

  const handleClick = () => {
    const oldCount = count;
    const newCount = count + 1;
    logStateChange('count', oldCount, newCount);
    setCount(newCount);
  };

  return (
    <div>
      <div data-testid="count">{monitoredCount}</div>
      <div data-testid="render-count">{metrics.renderCount}</div>
      <div data-testid="is-excessive">{isExcessive.toString()}</div>
      <button onClick={handleClick} data-testid="increment">
        Increment
      </button>
    </div>
  );
};

// Test component with HOC monitoring
const SimpleComponent: React.FC<{ value: number }> = ({ value }) => {
  return <div data-testid="hoc-value">{value}</div>;
};

const MonitoredHOCComponent = withRenderMonitoring(SimpleComponent, 'HOCTestComponent');

// Component that causes excessive re-renders
const ExcessiveRenderComponent: React.FC = () => {
  const [count, setCount] = useState(0);
  const { isExcessive } = useRenderMonitoring('ExcessiveRenderComponent');

  // This will cause excessive re-renders
  useEffect(() => {
    if (count < 50) {
      setCount(count + 1);
    }
  }, [count]);

  return (
    <div>
      <div data-testid="excessive-count">{count}</div>
      <div data-testid="excessive-flag">{isExcessive.toString()}</div>
    </div>
  );
};

describe('Development Debugging Tools Integration', () => {
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

    // Initialize debugging tools
    initializeDevelopmentDebugging({
      warningThreshold: 5,
      errorThreshold: 20,
      logStateChanges: true,
      enableConsoleWarnings: true,
    });
  });

  afterAll(() => {
    // Restore environment
    process.env.NODE_ENV = originalEnv;

    // Restore console methods
    Object.assign(console, originalConsole);
  });

  describe('useRenderMonitoring hook integration', () => {
    it('should track renders in React component', () => {
      const { getByTestId, rerender } = render(<TestComponentWithMonitoring />);

      expect(getByTestId('render-count')).toHaveTextContent('1');
      expect(getByTestId('is-excessive')).toHaveTextContent('false');

      // Trigger rerender
      rerender(<TestComponentWithMonitoring />);
      expect(getByTestId('render-count')).toHaveTextContent('2');
    });

    it('should log state changes when button is clicked', () => {
      const { getByTestId } = render(<TestComponentWithMonitoring />);

      fireEvent.click(getByTestId('increment'));

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('State change in TestComponentWithMonitoring.count'),
        expect.objectContaining({
          from: 0,
          to: 1,
        })
      );

      expect(getByTestId('count')).toHaveTextContent('1');
    });

    it('should detect excessive rendering', async () => {
      const { getByTestId } = render(<TestComponentWithMonitoring triggerRerender={true} />);

      // Wait for excessive renders to be detected
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Should have logged warnings about excessive rendering
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Excessive re-rendering detected in TestComponentWithMonitoring')
      );
    });
  });

  describe('useStateChangeMonitoring hook integration', () => {
    it('should automatically log state changes', () => {
      const { getByTestId } = render(<TestComponentWithMonitoring />);

      fireEvent.click(getByTestId('increment'));

      // Should log both manual and automatic state change
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('State change in TestComponentWithMonitoring.count'),
        expect.any(Object)
      );
    });
  });

  describe('withRenderMonitoring HOC integration', () => {
    it('should monitor renders with HOC', () => {
      const { rerender } = render(<MonitoredHOCComponent value={1} />);

      const metrics = developmentDebuggingTools.getRenderMetrics('HOCTestComponent');
      expect(metrics?.renderCount).toBe(1);

      rerender(<MonitoredHOCComponent value={2} />);

      const updatedMetrics = developmentDebuggingTools.getRenderMetrics('HOCTestComponent');
      expect(updatedMetrics?.renderCount).toBe(2);
    });

    it('should warn about excessive rendering in HOC', () => {
      // Render multiple times quickly
      const { rerender } = render(<MonitoredHOCComponent value={1} />);

      for (let i = 2; i <= 10; i++) {
        rerender(<MonitoredHOCComponent value={i} />);
      }

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Component HOCTestComponent is re-rendering excessively')
      );
    });
  });

  describe('excessive rendering detection', () => {
    it('should detect and warn about infinite loops', async () => {
      render(<ExcessiveRenderComponent />);

      // Wait for excessive renders to accumulate
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should have detected excessive rendering
      expect(mockConsole.warn).toHaveBeenCalled();

      const metrics = developmentDebuggingTools.getRenderMetrics('ExcessiveRenderComponent');
      expect(metrics?.isExcessive).toBe(true);
    });

    it('should log recent state changes when infinite loop detected', async () => {
      // Configure very low thresholds to trigger error quickly
      developmentDebuggingTools.configure({
        warningThreshold: 2,
        errorThreshold: 5,
      });

      render(<ExcessiveRenderComponent />);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should have logged error about infinite loop
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: Infinite loop detected in ExcessiveRenderComponent')
      );
    });
  });

  describe('debugging report generation', () => {
    it('should generate comprehensive report with component data', () => {
      render(<TestComponentWithMonitoring />);
      render(<MonitoredHOCComponent value={1} />);

      fireEvent.click(document.querySelector('[data-testid="increment"]')!);

      const report = developmentDebuggingTools.generateReport();

      expect(report.summary.totalComponents).toBe(2);
      expect(report.summary.totalStateChanges).toBeGreaterThan(0);
      expect(report.renderMetrics).toHaveLength(2);
      expect(report.stateChangeLogs.length).toBeGreaterThan(0);

      // Check that component names are tracked
      const componentNames = report.renderMetrics.map(m => m.componentName);
      expect(componentNames).toContain('TestComponentWithMonitoring');
      expect(componentNames).toContain('HOCTestComponent');
    });
  });

  describe('production environment behavior', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => {
      process.env.NODE_ENV = 'production';
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should not track renders in production', () => {
      const { getByTestId } = render(<TestComponentWithMonitoring />);

      // In production, render count should be 0 (not tracked)
      expect(getByTestId('render-count')).toHaveTextContent('0');
      expect(getByTestId('is-excessive')).toHaveTextContent('false');
    });

    it('should not log state changes in production', () => {
      const { getByTestId } = render(<TestComponentWithMonitoring />);

      fireEvent.click(getByTestId('increment'));

      // Should not log in production
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe('memory management', () => {
    it('should limit state change logs to prevent memory leaks', () => {
      // Override the max logs limit for testing
      const originalMaxLogs = (developmentDebuggingTools as any).MAX_STATE_LOGS;
      (developmentDebuggingTools as any).MAX_STATE_LOGS = 5;

      const { getByTestId } = render(<TestComponentWithMonitoring />);

      // Generate more state changes than the limit
      for (let i = 0; i < 10; i++) {
        fireEvent.click(getByTestId('increment'));
      }

      const logs = developmentDebuggingTools.getStateChangeLogs();
      expect(logs.length).toBeLessThanOrEqual(5);

      // Restore original limit
      (developmentDebuggingTools as any).MAX_STATE_LOGS = originalMaxLogs;
    });

    it('should clear all data when requested', () => {
      render(<TestComponentWithMonitoring />);
      fireEvent.click(document.querySelector('[data-testid="increment"]')!);

      // Verify data exists
      expect(developmentDebuggingTools.getAllRenderMetrics().length).toBeGreaterThan(0);
      expect(developmentDebuggingTools.getStateChangeLogs().length).toBeGreaterThan(0);

      // Clear all data
      developmentDebuggingTools.clearAll();

      // Verify data is cleared
      expect(developmentDebuggingTools.getAllRenderMetrics()).toHaveLength(0);
      expect(developmentDebuggingTools.getStateChangeLogs()).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle circular references in state values', () => {
      const CircularComponent: React.FC = () => {
        const [state, setState] = useState<any>({});
        const { logStateChange } = useRenderMonitoring('CircularComponent');

        useEffect(() => {
          const circular: any = { prop: 'value' };
          circular.self = circular; // Create circular reference

          logStateChange('circularState', null, circular);
        }, [logStateChange]);

        return <div>Circular test</div>;
      };

      expect(() => render(<CircularComponent />)).not.toThrow();
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle React elements in state values', () => {
      const ReactElementComponent: React.FC = () => {
        const [element, setElement] = useState<React.ReactElement | null>(null);
        const monitoredElement = useStateChangeMonitoring('ReactElementComponent', 'element', element);

        useEffect(() => {
          setElement(<div>Test element</div>);
        }, []);

        return <div>{monitoredElement}</div>;
      };

      expect(() => render(<ReactElementComponent />)).not.toThrow();
    });
  });
});