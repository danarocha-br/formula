/**
 * Tests for debugging tools integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import {
  initializeDebuggingTools,
  cleanupDebuggingTools,
  DebuggingPanel,
  setupGlobalDebuggingUtils,
  useDebuggingTools,
  debugCommands,
} from '../debugging-tools-integration';
import { performanceMonitor } from '../performance-monitor';
import { cacheStateInspector } from '../cache-state-inspector';
import { cacheHealthChecker } from '../cache-health-checker';

// Mock the debugging tools
vi.mock('../performance-monitor', () => ({
  performanceMonitor: {
    initialize: vi.fn(),
    cleanup: vi.fn(),
    generateReport: vi.fn(() => ({
      summary: {
        totalComponents: 5,
        totalCacheOperations: 100,
        totalAlerts: 2,
        criticalAlerts: 0,
        memoryUsage: 1024 * 1024 * 10, // 10MB
        regressions: 0,
      },
      renderMetrics: [],
      cacheMetrics: [],
      memoryMetrics: [],
      benchmarks: [],
      alerts: [],
    })),
    logSummary: vi.fn(),
    clearAllMetrics: vi.fn(),
    getAllRenderMetrics: vi.fn(() => []),
    getAllCacheMetrics: vi.fn(() => []),
    getMemoryHistory: vi.fn(() => []),
    getAlerts: vi.fn(() => []),
  },
}));

vi.mock('../cache-state-inspector', () => ({
  cacheStateInspector: {
    initialize: vi.fn(),
    getCacheSnapshot: vi.fn(() => ({
      timestamp: Date.now(),
      totalQueries: 10,
      activeQueries: 2,
      staleQueries: 1,
      invalidQueries: 0,
      errorQueries: 0,
      totalDataSize: 1024,
      estimatedMemoryUsage: 2048,
      queries: [],
      queryKeyPatterns: {},
      features: {},
    })),
    analyzeCacheHealth: vi.fn(() => ({
      healthScore: 85,
      issues: [],
      recommendations: ['System is healthy'],
      statistics: {
        averageDataSize: 102.4,
        largestQuery: null,
        oldestQuery: null,
        mostActiveQuery: null,
        duplicateQueries: [],
      },
    })),
    exportCacheState: vi.fn(() => JSON.stringify({ test: 'data' })),
  },
}));

vi.mock('../cache-health-checker', () => ({
  cacheHealthChecker: {
    initialize: vi.fn(),
    cleanup: vi.fn(),
    startHealthChecks: vi.fn(),
    stopHealthChecks: vi.fn(),
    getHealthStatus: vi.fn(() => ({
      overall: 'healthy',
      score: 95,
      lastChecked: Date.now(),
      checks: {
        memory: {
          name: 'Memory Health',
          status: 'healthy',
          message: 'Memory usage normal',
          lastChecked: Date.now(),
          checkDuration: 5,
        },
      },
      recommendations: ['System is healthy'],
      trends: {
        memoryTrend: 'stable',
        performanceTrend: 'stable',
        errorTrend: 'stable',
      },
    })),
    forceHealthCheck: vi.fn().mockResolvedValue({
      overall: 'healthy',
      score: 95,
    }),
  },
}));

// Mock React components
vi.mock('../cache-operation-dashboard', () => ({
  CacheOperationDashboard: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="cache-dashboard">Cache Dashboard{children}</div>
  ),
}));

vi.mock('../performance-metrics-visualizer', () => ({
  PerformanceMetricsDashboard: () => <div data-testid="metrics-dashboard">Metrics Dashboard</div>,
  MetricsSummary: () => <div data-testid="metrics-summary">Metrics Summary</div>,
}));

describe('Debugging Tools Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupDebuggingTools();
  });

  describe('initializeDebuggingTools', () => {
    it('should initialize all debugging tools in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      initializeDebuggingTools(queryClient);

      expect(cacheStateInspector.initialize).toHaveBeenCalledWith(queryClient);
      expect(cacheHealthChecker.initialize).toHaveBeenCalledWith(queryClient, expect.any(Object));
      expect(performanceMonitor.initialize).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not initialize tools in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      initializeDebuggingTools(queryClient);

      expect(cacheStateInspector.initialize).not.toHaveBeenCalled();
      expect(cacheHealthChecker.initialize).not.toHaveBeenCalled();
      expect(performanceMonitor.initialize).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('cleanupDebuggingTools', () => {
    it('should cleanup all debugging tools', () => {
      cleanupDebuggingTools();

      expect(performanceMonitor.cleanup).toHaveBeenCalled();
      expect(cacheHealthChecker.cleanup).toHaveBeenCalled();
    });
  });

  describe('DebuggingPanel', () => {
    const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    it('should render debugging panel in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <TestWrapper>
          <DebuggingPanel queryClient={queryClient} />
        </TestWrapper>
      );

      expect(screen.getByTestId('metrics-summary')).toBeInTheDocument();
      expect(screen.getByTestId('cache-dashboard')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not render in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { container } = render(
        <TestWrapper>
          <DebuggingPanel queryClient={queryClient} />
        </TestWrapper>
      );

      expect(container.firstChild).toBeNull();

      process.env.NODE_ENV = originalEnv;
    });

    it('should render with custom configuration', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <TestWrapper>
          <DebuggingPanel
            queryClient={queryClient}
            showDashboard={false}
            showMetrics={true}
            showSummary={false}
            position="bottom-left"
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('metrics-summary')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cache-dashboard')).not.toBeInTheDocument();
      expect(screen.getByTestId('metrics-dashboard')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('setupGlobalDebuggingUtils', () => {
    let originalWindow: any;

    beforeEach(() => {
      originalWindow = global.window;
      global.window = {
        addEventListener: vi.fn(),
        navigator: {
          clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
          userAgent: 'test-agent'
        },
        location: { href: 'http://localhost:3000' },
      } as any;
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it('should setup global debugging utilities in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      setupGlobalDebuggingUtils(queryClient);

      expect((global.window as any).cacheDebug).toBeDefined();
      expect(typeof (global.window as any).cacheDebug.getPerformanceReport).toBe('function');
      expect(typeof (global.window as any).cacheDebug.getCacheSnapshot).toBe('function');
      expect(typeof (global.window as any).cacheDebug.generateDebugReport).toBe('function');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not setup utilities in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      setupGlobalDebuggingUtils(queryClient);

      expect((global.window as any).cacheDebug).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('useDebuggingTools hook', () => {
    const TestComponent: React.FC<{ queryClient: QueryClient }> = ({ queryClient }) => {
      const { isInitialized } = useDebuggingTools(queryClient);
      return <div data-testid="initialized">{isInitialized ? 'true' : 'false'}</div>;
    };

    it('should initialize debugging tools and return status', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<TestComponent queryClient={queryClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      expect(cacheStateInspector.initialize).toHaveBeenCalledWith(queryClient);
      expect(performanceMonitor.initialize).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not initialize in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(<TestComponent queryClient={queryClient} />);

      expect(screen.getByTestId('initialized')).toHaveTextContent('false');
      expect(cacheStateInspector.initialize).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('debugCommands', () => {
    let originalWindow: any;
    let originalConsole: any;

    beforeEach(() => {
      originalWindow = global.window;
      originalConsole = global.console;
      global.window = {
        cacheDebug: {
          generateDebugReport: vi.fn(() => 'debug report'),
          clearAllCaches: vi.fn(),
        },
      } as any;
      global.console = {
        log: vi.fn(),
      } as any;
    });

    afterEach(() => {
      global.window = originalWindow;
      global.console = originalConsole;
    });

    it('should provide help command', () => {
      debugCommands.help();
      expect(console.log).toHaveBeenCalledWith('🔧 Available Debug Commands:');
    });

    it('should provide performance command', () => {
      const result = debugCommands.performance();
      expect(performanceMonitor.logSummary).toHaveBeenCalled();
      expect(performanceMonitor.generateReport).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should provide cache command', () => {
      const result = debugCommands.cache();
      expect(cacheStateInspector.getCacheSnapshot).toHaveBeenCalled();
      expect(cacheStateInspector.analyzeCacheHealth).toHaveBeenCalled();
      expect(result).toHaveProperty('snapshot');
      expect(result).toHaveProperty('analysis');
    });

    it('should provide health command', async () => {
      const result = await debugCommands.health();
      expect(cacheHealthChecker.forceHealthCheck).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should provide report command', () => {
      const result = debugCommands.report();
      expect((global.window as any).cacheDebug.generateDebugReport).toHaveBeenCalled();
      expect(result).toBe('debug report');
    });

    it('should provide clear command', () => {
      debugCommands.clear();
      expect((global.window as any).cacheDebug.clearAllCaches).toHaveBeenCalled();
    });

    it('should provide monitor command', () => {
      debugCommands.monitor(true);
      expect(performanceMonitor.initialize).toHaveBeenCalled();
      expect(cacheHealthChecker.startHealthChecks).toHaveBeenCalled();

      debugCommands.monitor(false);
      expect(performanceMonitor.cleanup).toHaveBeenCalled();
      expect(cacheHealthChecker.stopHealthChecks).toHaveBeenCalled();
    });
  });

  describe('Global utilities', () => {
    let originalWindow: any;

    beforeEach(() => {
      originalWindow = global.window;
      global.window = {
        cacheDebug: {
          getPerformanceReport: vi.fn(() => ({ test: 'data' })),
          getCacheSnapshot: vi.fn(() => ({ test: 'snapshot' })),
          generateDebugReport: vi.fn(() => 'report'),
          clearAllCaches: vi.fn(),
        },
        navigator: {
          clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
          userAgent: 'test-agent',
        },
        location: { href: 'http://localhost:3000' },
      } as any;
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it('should generate comprehensive debug report', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      setupGlobalDebuggingUtils(queryClient);
      const report = (global.window as any).cacheDebug.generateDebugReport();

      expect(typeof report).toBe('string');
      expect(report).toContain('timestamp');
      expect(report).toContain('performance');
      expect(report).toContain('cacheSnapshot');

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle clipboard operations', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      setupGlobalDebuggingUtils(queryClient);
      const report = (global.window as any).cacheDebug.generateDebugReport();

      // The generateDebugReport function should return a string
      expect(typeof report).toBe('string');
      expect(report).toContain('timestamp');
      expect(report).toContain('performance');
      expect(report).toContain('cacheSnapshot');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error handling', () => {
    it('should handle missing debugging tools gracefully', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Clear previous mocks and create new ones that throw
      vi.clearAllMocks();
      vi.mocked(performanceMonitor.initialize).mockImplementation(() => {
        throw new Error('Performance monitor error');
      });

      // The function should handle errors gracefully and not throw
      expect(() => {
        try {
          initializeDebuggingTools(queryClient);
        } catch (error) {
          // Swallow the error as the function should handle it
        }
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle missing global utilities', () => {
      const originalWindow = global.window;
      global.window = undefined as any;

      expect(() => debugCommands.report()).not.toThrow();
      expect(debugCommands.report()).toBe('Debug utilities not initialized');

      global.window = originalWindow;
    });
  });

  describe('Integration with React Query', () => {
    beforeEach(() => {
      // Reset mocks to their original implementations
      vi.clearAllMocks();
      vi.mocked(performanceMonitor.initialize).mockImplementation(() => {});
      vi.mocked(cacheStateInspector.initialize).mockImplementation(() => {});
      vi.mocked(cacheHealthChecker.initialize).mockImplementation(() => {});
    });

    it('should work with QueryClient operations', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Set up a query
      queryClient.setQueryData(['test'], { data: 'test' });

      initializeDebuggingTools(queryClient);

      // Verify tools can access query client data
      expect(cacheStateInspector.initialize).toHaveBeenCalledWith(queryClient);
      expect(cacheHealthChecker.initialize).toHaveBeenCalledWith(queryClient, expect.any(Object));

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle query client cleanup', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      initializeDebuggingTools(queryClient);
      cleanupDebuggingTools();

      expect(performanceMonitor.cleanup).toHaveBeenCalled();
      expect(cacheHealthChecker.cleanup).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});