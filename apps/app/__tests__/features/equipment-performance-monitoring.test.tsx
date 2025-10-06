/**
 * Integration tests for Equipment Performance Monitoring
 *
 * Tests the performance monitoring integration in the equipment cost table view
 * to ensure infinite loop detection and performance degradation alerts work correctly
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { equipmentPerformanceMonitor } from '@/utils/equipment-performance-monitor';
import { TableView } from '@/app/features/feature-variable-cost/table-view';
import type { EquipmentExpenseItem } from '@/app/types';

// Mock the hooks and utilities
vi.mock('@/hooks/use-translation', () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/app/store/currency-store', () => ({
  useCurrencyStore: () => ({
    selectedCurrency: { code: 'USD', symbol: '$' },
  }),
}));

vi.mock('@repo/design-system/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock server hooks
vi.mock('@/app/features/feature-variable-cost/server/create-equipment-expense', () => ({
  useCreateEquipmentExpense: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/app/features/feature-variable-cost/server/update-equipment-expense', () => ({
  useUpdateEquipmentExpense: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/app/features/feature-variable-cost/server/delete-equipment-expense', () => ({
  useDeleteEquipmentExpense: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock data
const mockEquipmentData: EquipmentExpenseItem[] = [
  {
    id: 1,
    userId: 'user-1',
    name: 'Laptop',
    amount: 1200,
    category: 'equipment',
    rank: 1,
    purchaseDate: new Date('2024-01-01'),
    usage: 100,
    lifeSpan: 24,
  },
  {
    id: 2,
    userId: 'user-1',
    name: 'Monitor',
    amount: 300,
    category: 'equipment',
    rank: 2,
    purchaseDate: new Date('2024-01-15'),
    usage: 80,
    lifeSpan: 36,
  },
];

const mockGetCategoryColor = (category: string) => 'bg-blue-500';
const mockGetCategoryLabel = (category: string) => category;

describe('Equipment Performance Monitoring Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    equipmentPerformanceMonitor.reset();
    equipmentPerformanceMonitor.initialize();
    vi.clearAllMocks();
  });

  afterEach(() => {
    equipmentPerformanceMonitor.cleanup();
    queryClient.clear();
  });

  const renderTableView = (data = mockEquipmentData) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TableView
          data={data}
          userId="user-1"
          getCategoryColor={mockGetCategoryColor}
          getCategoryLabel={mockGetCategoryLabel}
          isLoading={false}
          isRefetching={false}
          error={null}
        />
      </QueryClientProvider>
    );
  };

  describe('Render Frequency Monitoring', () => {
    it('should track component renders without performance issues', async () => {
      renderTableView();

      // Wait for component to stabilize
      await waitFor(() => {
        expect(screen.getByText('Laptop')).toBeInTheDocument();
      });

      const metrics = equipmentPerformanceMonitor.getMetrics('EquipmentTableView');
      expect(metrics).toBeDefined();
      expect(metrics?.renderCount).toBeGreaterThan(0);
      expect(metrics?.alertLevel).toBe('none');
    });

    it('should detect excessive re-renders during state updates', async () => {
      const { rerender } = renderTableView();

      // Simulate rapid re-renders by forcing component updates
      let currentTime = 1000;
      for (let i = 0; i < 50; i++) {
        mockPerformance.now.mockReturnValue(currentTime);

        act(() => {
          rerender(
            <QueryClientProvider client={queryClient}>
              <TableView
                data={mockEquipmentData}
                userId="user-1"
                getCategoryColor={mockGetCategoryColor}
                getCategoryLabel={mockGetCategoryLabel}
                isLoading={false}
                isRefetching={false}
                error={null}
              />
            </QueryClientProvider>
          );
        });

        currentTime += 10; // 10ms between renders = 100 renders/sec
      }

      await waitFor(() => {
        const alerts = equipmentPerformanceMonitor.getAlerts();
        expect(alerts.some(alert => alert.type === 'render_frequency')).toBe(true);
      });
    });

    it('should detect infinite loop scenarios', async () => {
      renderTableView();

      // Simulate infinite loop by tracking many rapid renders
      let currentTime = 1000;
      for (let i = 0; i < 100; i++) {
        mockPerformance.now.mockReturnValue(currentTime + i);
        equipmentPerformanceMonitor.trackRender('EquipmentTableView');
      }

      await waitFor(() => {
        const criticalAlerts = equipmentPerformanceMonitor.getCriticalAlerts();
        expect(criticalAlerts.length).toBeGreaterThan(0);
        expect(criticalAlerts.some(alert => alert.type === 'infinite_loop')).toBe(true);
      });
    });
  });

  describe('State Update Monitoring', () => {
    it('should track state updates during normal operations', async () => {
      renderTableView();

      // Simulate normal state updates
      act(() => {
        equipmentPerformanceMonitor.trackStateUpdate('EquipmentTableView', 'setItemLoading');
        equipmentPerformanceMonitor.trackStateUpdate('EquipmentTableView', 'setOptimisticUpdate');
      });

      const metrics = equipmentPerformanceMonitor.getMetrics('EquipmentTableView');
      expect(metrics?.stateUpdateCount).toBeGreaterThan(0);
    });

    it('should detect state thrashing during rapid updates', async () => {
      renderTableView();

      // Simulate rapid state updates (state thrashing)
      let currentTime = 1000;
      for (let i = 0; i < 25; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        equipmentPerformanceMonitor.trackStateUpdate('EquipmentTableView', 'rapidUpdate');
        currentTime += 10; // 10ms between updates
      }

      await waitFor(() => {
        const alerts = equipmentPerformanceMonitor.getAlerts();
        expect(alerts.some(alert => alert.type === 'state_thrashing')).toBe(true);
      });
    });

    it('should track batched state updates', async () => {
      renderTableView();

      // Simulate batched state updates
      act(() => {
        equipmentPerformanceMonitor.trackStateUpdate('EquipmentTableView', 'batchedUpdate');
        equipmentPerformanceMonitor.trackStateUpdate('EquipmentTableView', 'batchedUpdate');
        equipmentPerformanceMonitor.trackStateUpdate('EquipmentTableView', 'batchedUpdate');
      });

      const metrics = equipmentPerformanceMonitor.getMetrics('EquipmentTableView');
      expect(metrics?.stateUpdateCount).toBe(3);
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should track memory usage during component lifecycle', async () => {
      renderTableView();

      // Track memory usage
      act(() => {
        equipmentPerformanceMonitor.trackMemoryUsage('EquipmentTableView');
      });

      const metrics = equipmentPerformanceMonitor.getMetrics('EquipmentTableView');
      expect(metrics?.memoryUsage).toBe(50 * 1024 * 1024); // 50MB
    });

    it('should detect memory leaks during operations', async () => {
      renderTableView();

      // Initial memory tracking
      act(() => {
        equipmentPerformanceMonitor.trackMemoryUsage('EquipmentTableView');
      });

      // Simulate memory increase (potential leak)
      mockPerformance.memory.usedJSHeapSize = 70 * 1024 * 1024; // 70MB (20MB increase)

      act(() => {
        equipmentPerformanceMonitor.trackMemoryUsage('EquipmentTableView');
      });

      await waitFor(() => {
        const alerts = equipmentPerformanceMonitor.getAlerts();
        expect(alerts.some(alert => alert.type === 'memory_leak')).toBe(true);
      });
    });

    it('should handle memory monitoring with large datasets', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        userId: 'user-1',
        name: `Equipment ${i + 1}`,
        amount: 1000 + i * 10,
        category: 'equipment',
        rank: i + 1,
        purchaseDate: new Date('2024-01-01'),
        usage: 100,
        lifeSpan: 24,
      }));

      renderTableView(largeDataset);

      // Track memory with large dataset
      act(() => {
        equipmentPerformanceMonitor.trackMemoryUsage('EquipmentTableView');
      });

      const metrics = equipmentPerformanceMonitor.getMetrics('EquipmentTableView');
      expect(metrics?.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Performance Degradation Detection', () => {
    it('should detect performance degradation over time', async () => {
      renderTableView();

      // Establish baseline with fast operations
      let currentTime = 1000;
      for (let i = 0; i < 10; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        equipmentPerformanceMonitor.trackRender('EquipmentTableView');
        currentTime += 10; // 10ms between renders
      }

      // Simulate performance degradation with slower operations
      for (let i = 0; i < 10; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        equipmentPerformanceMonitor.trackRender('EquipmentTableView');
        currentTime += 50; // 50ms between renders (5x slower)
      }

      await waitFor(() => {
        const metrics = equipmentPerformanceMonitor.getMetrics('EquipmentTableView');
        const alerts = equipmentPerformanceMonitor.getAlerts();

        expect(metrics?.performanceDegradation).toBe(true);
        expect(alerts.some(alert => alert.type === 'performance_degradation')).toBe(true);
      });
    });
  });

  describe('Alert System Integration', () => {
    it('should generate alerts with actionable recommendations', async () => {
      renderTableView();

      // Generate an infinite loop scenario
      for (let i = 0; i < 100; i++) {
        mockPerformance.now.mockReturnValue(1000 + i);
        equipmentPerformanceMonitor.trackRender('EquipmentTableView');
      }

      await waitFor(() => {
        const alerts = equipmentPerformanceMonitor.getAlerts();
        const infiniteLoopAlert = alerts.find(alert => alert.type === 'infinite_loop');

        expect(infiniteLoopAlert).toBeDefined();
        expect(infiniteLoopAlert?.severity).toBe('critical');
        expect(infiniteLoopAlert?.recommendations).toBeDefined();
        expect(infiniteLoopAlert?.recommendations.length).toBeGreaterThan(0);

        // Check for specific recommendations
        const recommendations = infiniteLoopAlert?.recommendations.join(' ') || '';
        expect(recommendations).toContain('circuit breaker');
        expect(recommendations).toContain('dependency arrays');
      });
    });

    it('should provide different severity levels for different issues', async () => {
      renderTableView();

      // Generate different types of issues

      // 1. Critical: Infinite loop
      for (let i = 0; i < 100; i++) {
        mockPerformance.now.mockReturnValue(1000 + i);
        equipmentPerformanceMonitor.trackRender('EquipmentTableView');
      }

      // 2. High: State thrashing
      let currentTime = 2000;
      for (let i = 0; i < 25; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        equipmentPerformanceMonitor.trackStateUpdate('EquipmentTableView', 'thrashing');
        currentTime += 10;
      }

      // 3. Medium: Performance degradation
      currentTime = 3000;
      for (let i = 0; i < 20; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        equipmentPerformanceMonitor.trackRender('EquipmentTableView');
        currentTime += i < 10 ? 10 : 50; // Gradual degradation
      }

      await waitFor(() => {
        const alerts = equipmentPerformanceMonitor.getAlerts();

        const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
        const highAlerts = alerts.filter(alert => alert.severity === 'high');
        const mediumAlerts = alerts.filter(alert => alert.severity === 'medium');

        expect(criticalAlerts.length).toBeGreaterThan(0);
        expect(highAlerts.length).toBeGreaterThan(0);
        expect(mediumAlerts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate comprehensive performance reports', async () => {
      renderTableView();

      // Generate some activity
      act(() => {
        equipmentPerformanceMonitor.trackRender('EquipmentTableView');
        equipmentPerformanceMonitor.trackStateUpdate('EquipmentTableView', 'testUpdate');
        equipmentPerformanceMonitor.trackMemoryUsage('EquipmentTableView');
      });

      const report = equipmentPerformanceMonitor.generateReport();

      expect(report.summary).toBeDefined();
      expect(report.summary.totalComponents).toBeGreaterThan(0);
      expect(report.summary.totalRenders).toBeGreaterThan(0);
      expect(report.summary.totalStateUpdates).toBeGreaterThan(0);
      expect(report.summary.memoryUsage).toBeGreaterThan(0);

      expect(report.metrics).toBeDefined();
      expect(report.metrics.length).toBeGreaterThan(0);

      expect(report.alerts).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should track components with issues correctly', async () => {
      renderTableView();

      // Generate issues in the component
      for (let i = 0; i < 100; i++) {
        mockPerformance.now.mockReturnValue(1000 + i);
        equipmentPerformanceMonitor.trackRender('EquipmentTableView');
      }

      await waitFor(() => {
        const report = equipmentPerformanceMonitor.generateReport();
        expect(report.summary.componentsWithIssues).toBeGreaterThan(0);
        expect(report.summary.criticalAlerts).toBeGreaterThan(0);
      });
    });
  });

  describe('Requirements Compliance', () => {
    it('should meet requirement 3.3: consistent performance monitoring', async () => {
      // Test with multiple equipment items
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        userId: 'user-1',
        name: `Equipment ${i + 1}`,
        amount: 1000 + i * 10,
        category: 'equipment',
        rank: i + 1,
        purchaseDate: new Date('2024-01-01'),
        usage: 100,
        lifeSpan: 24,
      }));

      renderTableView(largeDataset);

      // Simulate category updates on multiple items
      for (let i = 0; i < 50; i++) {
        act(() => {
          equipmentPerformanceMonitor.trackStateUpdate('EquipmentTableView', 'categoryUpdate');
          equipmentPerformanceMonitor.trackRender('EquipmentTableView');
        });
      }

      const metrics = equipmentPerformanceMonitor.getMetrics('EquipmentTableView');
      expect(metrics?.renderCount).toBe(50);
      expect(metrics?.stateUpdateCount).toBe(50);

      // Performance should remain consistent (no degradation alerts)
      const degradationAlerts = equipmentPerformanceMonitor.getAlerts()
        .filter(alert => alert.type === 'performance_degradation');
      expect(degradationAlerts.length).toBe(0);
    });

    it('should meet requirement 4.2: clear error boundaries and logging', async () => {
      renderTableView();

      // Generate infinite loop scenario
      for (let i = 0; i < 100; i++) {
        mockPerformance.now.mockReturnValue(1000 + i);
        equipmentPerformanceMonitor.trackRender('EquipmentTableView');
      }

      await waitFor(() => {
        const criticalAlerts = equipmentPerformanceMonitor.getCriticalAlerts();
        const report = equipmentPerformanceMonitor.generateReport();

        // Should capture and display meaningful error messages
        expect(criticalAlerts.length).toBeGreaterThan(0);
        expect(criticalAlerts[0].message).toContain('Infinite loop detected');
        expect(criticalAlerts[0].message).toContain('EquipmentTableView');

        // Should log detailed diagnostic information
        expect(report.summary.criticalAlerts).toBeGreaterThan(0);
        expect(report.summary.componentsWithIssues).toBeGreaterThan(0);

        // Should provide clear feedback about recovery process
        expect(criticalAlerts[0].recommendations).toBeDefined();
        expect(criticalAlerts[0].recommendations.length).toBeGreaterThan(0);

        // Should offer alternative recovery options
        const recommendations = criticalAlerts[0].recommendations.join(' ');
        expect(recommendations).toContain('circuit breaker');
        expect(recommendations).toContain('dependency arrays');
        expect(recommendations).toContain('memoization');
      });
    });

    it('should provide performance degradation alerts', async () => {
      renderTableView();

      // Simulate performance degradation scenario
      let currentTime = 1000;

      // Fast baseline
      for (let i = 0; i < 10; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        equipmentPerformanceMonitor.trackRender('EquipmentTableView');
        currentTime += 10;
      }

      // Slow degraded performance
      for (let i = 0; i < 10; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        equipmentPerformanceMonitor.trackRender('EquipmentTableView');
        currentTime += 100; // 10x slower
      }

      await waitFor(() => {
        const alerts = equipmentPerformanceMonitor.getAlerts();
        const degradationAlert = alerts.find(alert => alert.type === 'performance_degradation');

        expect(degradationAlert).toBeDefined();
        expect(degradationAlert?.message).toContain('Performance degradation detected');
        expect(degradationAlert?.recommendations).toBeDefined();
      });
    });
  });
});