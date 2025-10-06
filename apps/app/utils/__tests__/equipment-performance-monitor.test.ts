/**
 * Tests for Equipment Performance Monitor
 *
 * Tests the performance monitoring system for infinite loop detection,
 * memory leak detection, and performance degradation alerts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { equipmentPerformanceMonitor } from '../equipment-performance-monitor';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
  }
};

// Mock global performance
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('EquipmentPerformanceMonitor', () => {
  beforeEach(() => {
    equipmentPerformanceMonitor.reset();
    equipmentPerformanceMonitor.initialize();
    vi.clearAllMocks();
  });

  afterEach(() => {
    equipmentPerformanceMonitor.cleanup();
  });

  describe('Render Tracking', () => {
    it('should track component renders', () => {
      const componentName = 'TestComponent';

      equipmentPerformanceMonitor.trackRender(componentName);
      equipmentPerformanceMonitor.trackRender(componentName);
      equipmentPerformanceMonitor.trackRender(componentName);

      const metrics = equipmentPerformanceMonitor.getMetrics(componentName);
      expect(metrics).toBeDefined();
      expect(metrics?.renderCount).toBe(3);
      expect(metrics?.componentName).toBe(componentName);
    });

    it('should detect infinite loop scenarios', () => {
      const componentName = 'InfiniteLoopComponent';

      // Simulate rapid renders (infinite loop scenario)
      mockPerformance.now.mockReturnValue(1000);
      for (let i = 0; i < 100; i++) {
        mockPerformance.now.mockReturnValue(1000 + i); // Very small time increments
        equipmentPerformanceMonitor.trackRender(componentName);
      }

      const metrics = equipmentPerformanceMonitor.getMetrics(componentName);
      const alerts = equipmentPerformanceMonitor.getCriticalAlerts();

      expect(metrics?.renderCount).toBe(100);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.type === 'infinite_loop')).toBe(true);
    });

    it('should detect high render frequency', () => {
      const componentName = 'HighFrequencyComponent';

      // Simulate high frequency renders
      let currentTime = 1000;
      for (let i = 0; i < 50; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        equipmentPerformanceMonitor.trackRender(componentName);
        currentTime += 10; // 10ms between renders = 100 renders/sec
      }

      const alerts = equipmentPerformanceMonitor.getAlerts();
      expect(alerts.some(alert => alert.type === 'render_frequency')).toBe(true);
    });

    it('should calculate average render intervals correctly', () => {
      const componentName = 'IntervalTestComponent';

      mockPerformance.now.mockReturnValue(1000);
      equipmentPerformanceMonitor.trackRender(componentName);

      mockPerformance.now.mockReturnValue(1100); // 100ms later
      equipmentPerformanceMonitor.trackRender(componentName);

      mockPerformance.now.mockReturnValue(1200); // 100ms later
      equipmentPerformanceMonitor.trackRender(componentName);

      const metrics = equipmentPerformanceMonitor.getMetrics(componentName);
      expect(metrics?.averageRenderInterval).toBe(100);
    });
  });

  describe('State Update Tracking', () => {
    it('should track state updates', () => {
      const componentName = 'StateComponent';
      const operation = 'setState';

      equipmentPerformanceMonitor.trackStateUpdate(componentName, operation);
      equipmentPerformanceMonitor.trackStateUpdate(componentName, operation);

      const metrics = equipmentPerformanceMonitor.getMetrics(componentName);
      expect(metrics?.stateUpdateCount).toBe(2);
    });

    it('should detect excessive state updates (state thrashing)', () => {
      const componentName = 'ThrashingComponent';
      const operation = 'rapidUpdate';

      // Simulate rapid consecutive state updates
      let currentTime = 1000;
      for (let i = 0; i < 25; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        equipmentPerformanceMonitor.trackStateUpdate(componentName, operation);
        currentTime += 10; // 10ms between updates
      }

      const alerts = equipmentPerformanceMonitor.getAlerts();
      expect(alerts.some(alert => alert.type === 'state_thrashing')).toBe(true);
    });

    it('should track consecutive state updates', () => {
      const componentName = 'ConsecutiveComponent';
      const operation = 'consecutiveUpdate';

      // Simulate consecutive updates (less than 50ms apart)
      mockPerformance.now.mockReturnValue(1000);
      equipmentPerformanceMonitor.trackStateUpdate(componentName, operation);

      mockPerformance.now.mockReturnValue(1020); // 20ms later
      equipmentPerformanceMonitor.trackStateUpdate(componentName, operation);

      mockPerformance.now.mockReturnValue(1040); // 20ms later
      equipmentPerformanceMonitor.trackStateUpdate(componentName, operation);

      // The state update metrics should track consecutive updates
      const report = equipmentPerformanceMonitor.generateReport();
      expect(report.summary.totalStateUpdates).toBe(3);
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should track memory usage', () => {
      const componentName = 'MemoryComponent';

      equipmentPerformanceMonitor.trackMemoryUsage(componentName);

      const metrics = equipmentPerformanceMonitor.getMetrics(componentName);
      expect(metrics?.memoryUsage).toBe(50 * 1024 * 1024); // 50MB
    });

    it('should detect memory leaks', () => {
      const componentName = 'LeakyComponent';

      // Initial memory usage
      equipmentPerformanceMonitor.trackMemoryUsage(componentName);

      // Simulate memory increase (memory leak)
      mockPerformance.memory.usedJSHeapSize = 70 * 1024 * 1024; // 70MB (20MB increase)
      equipmentPerformanceMonitor.trackMemoryUsage(componentName);

      const alerts = equipmentPerformanceMonitor.getAlerts();
      expect(alerts.some(alert => alert.type === 'memory_leak')).toBe(true);
    });

    it('should handle missing memory API gracefully', () => {
      // Temporarily remove memory API
      const originalMemory = mockPerformance.memory;
      delete (mockPerformance as any).memory;

      const componentName = 'NoMemoryAPIComponent';

      expect(() => {
        equipmentPerformanceMonitor.trackMemoryUsage(componentName);
      }).not.toThrow();

      const metrics = equipmentPerformanceMonitor.getMetrics(componentName);
      expect(metrics?.memoryUsage).toBe(0);

      // Restore memory API
      mockPerformance.memory = originalMemory;
    });
  });

  describe('Performance Degradation Detection', () => {
    it('should detect performance degradation', () => {
      const componentName = 'DegradingComponent';

      // Establish baseline with fast renders
      let currentTime = 1000;
      for (let i = 0; i < 10; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        equipmentPerformanceMonitor.trackRender(componentName);
        currentTime += 10; // 10ms between renders
      }

      // Simulate performance degradation with slower renders
      for (let i = 0; i < 10; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        equipmentPerformanceMonitor.trackRender(componentName);
        currentTime += 50; // 50ms between renders (5x slower)
      }

      const metrics = equipmentPerformanceMonitor.getMetrics(componentName);
      const alerts = equipmentPerformanceMonitor.getAlerts();

      expect(metrics?.performanceDegradation).toBe(true);
      expect(alerts.some(alert => alert.type === 'performance_degradation')).toBe(true);
    });
  });

  describe('Alert System', () => {
    it('should generate alerts with correct severity levels', () => {
      const componentName = 'AlertTestComponent';

      // Generate a critical alert (infinite loop)
      for (let i = 0; i < 100; i++) {
        mockPerformance.now.mockReturnValue(1000 + i);
        equipmentPerformanceMonitor.trackRender(componentName);
      }

      const criticalAlerts = equipmentPerformanceMonitor.getCriticalAlerts();
      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(criticalAlerts[0].severity).toBe('critical');
    });

    it('should include recommendations in alerts', () => {
      const componentName = 'RecommendationComponent';

      // Generate an alert
      for (let i = 0; i < 100; i++) {
        mockPerformance.now.mockReturnValue(1000 + i);
        equipmentPerformanceMonitor.trackRender(componentName);
      }

      const alerts = equipmentPerformanceMonitor.getAlerts();
      const infiniteLoopAlert = alerts.find(alert => alert.type === 'infinite_loop');

      expect(infiniteLoopAlert).toBeDefined();
      expect(infiniteLoopAlert?.recommendations).toBeDefined();
      expect(infiniteLoopAlert?.recommendations.length).toBeGreaterThan(0);
    });

    it('should limit the number of stored alerts', () => {
      const componentName = 'ManyAlertsComponent';

      // Generate many alerts
      for (let j = 0; j < 60; j++) {
        for (let i = 0; i < 100; i++) {
          mockPerformance.now.mockReturnValue(1000 + j * 1000 + i);
          equipmentPerformanceMonitor.trackRender(`${componentName}-${j}`);
        }
      }

      const allAlerts = equipmentPerformanceMonitor.getAlerts(100);
      expect(allAlerts.length).toBeLessThanOrEqual(50); // MAX_ALERTS = 50
    });
  });

  describe('Metrics and Reporting', () => {
    it('should generate comprehensive performance report', () => {
      const componentName = 'ReportTestComponent';

      // Generate some activity
      equipmentPerformanceMonitor.trackRender(componentName);
      equipmentPerformanceMonitor.trackStateUpdate(componentName, 'testUpdate');
      equipmentPerformanceMonitor.trackMemoryUsage(componentName);

      const report = equipmentPerformanceMonitor.generateReport();

      expect(report.summary).toBeDefined();
      expect(report.summary.totalComponents).toBe(1);
      expect(report.summary.totalRenders).toBe(1);
      expect(report.summary.totalStateUpdates).toBe(1);
      expect(report.metrics).toHaveLength(1);
      expect(report.metrics[0].componentName).toBe(componentName);
    });

    it('should calculate alert levels correctly', () => {
      const componentName = 'AlertLevelComponent';

      // Normal activity - should be 'none'
      equipmentPerformanceMonitor.trackRender(componentName);
      let metrics = equipmentPerformanceMonitor.getMetrics(componentName);
      expect(metrics?.alertLevel).toBe('none');

      // High render count - should be 'warning'
      for (let i = 0; i < 35; i++) {
        mockPerformance.now.mockReturnValue(1000 + i * 100);
        equipmentPerformanceMonitor.trackRender(componentName);
      }

      metrics = equipmentPerformanceMonitor.getMetrics(componentName);
      expect(metrics?.alertLevel).toBe('warning');
    });

    it('should clear metrics for specific components', () => {
      const componentName1 = 'Component1';
      const componentName2 = 'Component2';

      equipmentPerformanceMonitor.trackRender(componentName1);
      equipmentPerformanceMonitor.trackRender(componentName2);

      expect(equipmentPerformanceMonitor.getMetrics(componentName1)).toBeDefined();
      expect(equipmentPerformanceMonitor.getMetrics(componentName2)).toBeDefined();

      equipmentPerformanceMonitor.clearMetrics(componentName1);

      expect(equipmentPerformanceMonitor.getMetrics(componentName1)).toBeUndefined();
      expect(equipmentPerformanceMonitor.getMetrics(componentName2)).toBeDefined();
    });

    it('should reset all metrics and alerts', () => {
      const componentName = 'ResetTestComponent';

      equipmentPerformanceMonitor.trackRender(componentName);
      equipmentPerformanceMonitor.trackStateUpdate(componentName, 'testUpdate');

      expect(equipmentPerformanceMonitor.getAllMetrics()).toHaveLength(1);

      equipmentPerformanceMonitor.reset();

      expect(equipmentPerformanceMonitor.getAllMetrics()).toHaveLength(0);
      expect(equipmentPerformanceMonitor.getAlerts()).toHaveLength(0);
    });
  });

  describe('Integration with Requirements', () => {
    it('should meet requirement 3.3: consistent performance monitoring', () => {
      const componentName = 'ConsistentPerformanceComponent';

      // Simulate multiple equipment items (large dataset)
      const itemCount = 100;

      for (let i = 0; i < itemCount; i++) {
        mockPerformance.now.mockReturnValue(1000 + i * 10);
        equipmentPerformanceMonitor.trackRender(componentName);
        equipmentPerformanceMonitor.trackStateUpdate(componentName, 'categoryUpdate');
      }

      const metrics = equipmentPerformanceMonitor.getMetrics(componentName);
      const report = equipmentPerformanceMonitor.generateReport();

      // Should track performance consistently
      expect(metrics?.renderCount).toBe(itemCount);
      expect(metrics?.stateUpdateCount).toBe(itemCount);
      expect(report.summary.totalRenders).toBe(itemCount);
      expect(report.summary.totalStateUpdates).toBe(itemCount);
    });

    it('should meet requirement 4.2: clear error boundaries and logging', () => {
      const componentName = 'ErrorBoundaryComponent';

      // Simulate infinite loop scenario
      for (let i = 0; i < 100; i++) {
        mockPerformance.now.mockReturnValue(1000 + i);
        equipmentPerformanceMonitor.trackRender(componentName);
      }

      const alerts = equipmentPerformanceMonitor.getAlerts();
      const criticalAlerts = equipmentPerformanceMonitor.getCriticalAlerts();
      const report = equipmentPerformanceMonitor.generateReport();

      // Should provide clear error information
      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(criticalAlerts[0].message).toContain('Infinite loop detected');
      expect(criticalAlerts[0].recommendations).toBeDefined();
      expect(criticalAlerts[0].recommendations.length).toBeGreaterThan(0);

      // Should log detailed diagnostic information
      expect(report.summary.criticalAlerts).toBeGreaterThan(0);
      expect(report.summary.componentsWithIssues).toBeGreaterThan(0);
    });

    it('should provide recovery recommendations', () => {
      const componentName = 'RecoveryComponent';

      // Generate various types of issues
      // 1. Infinite loop
      for (let i = 0; i < 100; i++) {
        mockPerformance.now.mockReturnValue(1000 + i);
        equipmentPerformanceMonitor.trackRender(componentName);
      }

      // 2. State thrashing
      for (let i = 0; i < 25; i++) {
        mockPerformance.now.mockReturnValue(2000 + i * 10);
        equipmentPerformanceMonitor.trackStateUpdate(componentName, 'thrashing');
      }

      // 3. Memory leak
      mockPerformance.memory.usedJSHeapSize = 80 * 1024 * 1024; // 80MB
      equipmentPerformanceMonitor.trackMemoryUsage(componentName);

      const report = equipmentPerformanceMonitor.generateReport();

      // Should provide comprehensive recommendations
      expect(report.recommendations).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);

      // Should include specific recommendations for different issues
      const recommendations = report.recommendations.join(' ');
      expect(recommendations).toContain('circuit breaker');
      expect(recommendations).toContain('batching');
      expect(recommendations).toContain('memory');
    });
  });
});