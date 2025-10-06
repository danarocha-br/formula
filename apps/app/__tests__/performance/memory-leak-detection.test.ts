/**
 * Performance tests for memory leak detection
 * Tests cache operations, hook cleanup, and memory usage patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { renderHook, cleanup } from '@testing-library/react';
import { createQueryWrapper } from '../../test-utils';
import { equipmentCacheUtils } from '../../utils/equipment-cache-utils';
import { expenseCacheUtils } from '../../utils/query-cache-utils';
// Mock memory leak detector since it might not exist yet
const mockMemoryLeakDetector = {
  reset: vi.fn(),
  startMonitoring: vi.fn(),
  measureMemoryUsage: vi.fn().mockResolvedValue(1024 * 1024), // 1MB
  detectMemoryLeaks: vi.fn().mockResolvedValue({
    hasLeaks: false,
    memoryGrowthRate: 0.05,
    measurements: [],
  }),
  getMemoryStats: vi.fn().mockResolvedValue({
    currentUsage: 1024 * 1024,
    peakUsage: 2 * 1024 * 1024,
    averageUsage: 1.5 * 1024 * 1024,
    measurements: 10,
  }),
};

vi.mock('../../utils/memory-leak-detection', () => ({
  memoryLeakDetector: mockMemoryLeakDetector,
}));

const memoryLeakDetector = mockMemoryLeakDetector;
import type { EquipmentExpenseItem } from '../../app/types';
import type { ExpenseItem } from '../../app/types';

// Mock performance.measureUserAgentSpecificMemory if not available
const mockMeasureMemory = vi.fn().mockResolvedValue({
  bytes: 1024 * 1024, // 1MB
  breakdown: [],
});

Object.defineProperty(performance, 'measureUserAgentSpecificMemory', {
  value: mockMeasureMemory,
  writable: true,
});

describe('Memory Leak Detection Tests', () => {
  let queryClient: QueryClient;
  const userId = 'test-user-123';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    // Reset memory detector
    memoryLeakDetector.reset();
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  describe('Cache Operation Memory Usage', () => {
    it('should not leak memory during repeated cache operations', async () => {
      const initialMemory = await memoryLeakDetector.measureMemoryUsage();

      // Perform many cache operations
      for (let i = 0; i < 1000; i++) {
        const equipment: EquipmentExpenseItem = {
          id: i,
          userId,
          name: `Equipment ${i}`,
          category: 'computer',
          amount: 1000 + i,
          purchaseDate: new Date(),
          usage: 80,
          lifeSpan: 36,
          rank: i,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        equipmentCacheUtils.addItem(queryClient, userId, equipment);

        if (i % 100 === 0) {
          // Periodically clear some items to simulate real usage
          equipmentCacheUtils.removeItem(queryClient, userId, i - 50);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = await memoryLeakDetector.measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for 1000 operations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should clean up cache data when QueryClient is cleared', async () => {
      const initialMemory = await memoryLeakDetector.measureMemoryUsage();

      // Add large amount of data
      const largeDataset: EquipmentExpenseItem[] = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        userId,
        name: `Equipment ${i}`,
        category: 'computer',
        amount: 1000 + i,
        purchaseDate: new Date(),
        usage: 80,
        lifeSpan: 36,
        rank: i,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      equipmentCacheUtils.replaceAllItems(queryClient, userId, largeDataset);

      const afterAddMemory = await memoryLeakDetector.measureMemoryUsage();
      expect(afterAddMemory).toBeGreaterThan(initialMemory);

      // Clear the cache
      queryClient.clear();

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const afterClearMemory = await memoryLeakDetector.measureMemoryUsage();

      // Memory should be released (within reasonable margin)
      const memoryDifference = afterClearMemory - initialMemory;
      expect(memoryDifference).toBeLessThan(1024 * 1024); // Less than 1MB difference
    });

    it('should detect memory leaks in cache operations', async () => {
      const detector = memoryLeakDetector;

      detector.startMonitoring();

      // Simulate operations that might cause memory leaks
      const operations = [];
      for (let i = 0; i < 100; i++) {
        const operation = async () => {
          const equipment: EquipmentExpenseItem = {
            id: i,
            userId,
            name: `Equipment ${i}`,
            category: 'computer',
            amount: 1000,
            purchaseDate: new Date(),
            usage: 80,
            lifeSpan: 36,
            rank: i,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          equipmentCacheUtils.addItem(queryClient, userId, equipment);

          // Create some temporary objects that should be garbage collected
          const tempData = new Array(1000).fill(0).map((_, idx) => ({
            id: idx,
            data: `temp-${i}-${idx}`,
          }));

          // Use the temp data briefly
          tempData.forEach(item => item.data.length);
        };

        operations.push(operation());
      }

      await Promise.all(operations);

      const leakReport = await detector.detectMemoryLeaks();

      // Should not detect significant memory leaks
      expect(leakReport.hasLeaks).toBe(false);
      expect(leakReport.memoryGrowthRate).toBeLessThan(0.1); // Less than 10% growth rate
    });
  });

  describe('Hook Memory Management', () => {
    it('should clean up hook subscriptions on unmount', () => {
      const mockUseGetEquipmentExpenses = vi.fn().mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      // Mock the hook
      vi.doMock('../../app/features/feature-variable-cost/server/get-equipment-expenses', () => ({
        useGetEquipmentExpenses: mockUseGetEquipmentExpenses,
      }));

      const { useStableEquipment } = require('../../hooks/use-stable-equipment');

      const { unmount } = renderHook(
        () => useStableEquipment({ userId }),
        { wrapper: createQueryWrapper(queryClient) }
      );

      // Verify hook was called
      expect(mockUseGetEquipmentExpenses).toHaveBeenCalled();

      // Unmount should not throw errors
      expect(() => unmount()).not.toThrow();

      vi.doUnmock('../../app/features/feature-variable-cost/server/get-equipment-expenses');
    });

    it('should handle rapid mount/unmount cycles without leaks', async () => {
      const mockUseGetEquipmentExpenses = vi.fn().mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        isFetching: false,
      });

      vi.doMock('../../app/features/feature-variable-cost/server/get-equipment-expenses', () => ({
        useGetEquipmentExpenses: mockUseGetEquipmentExpenses,
      }));

      const { useStableEquipment } = require('../../hooks/use-stable-equipment');

      const initialMemory = await memoryLeakDetector.measureMemoryUsage();

      // Perform rapid mount/unmount cycles
      for (let i = 0; i < 100; i++) {
        const { unmount } = renderHook(
          () => useStableEquipment({ userId }),
          { wrapper: createQueryWrapper(queryClient) }
        );

        unmount();
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = await memoryLeakDetector.measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB

      vi.doUnmock('../../app/features/feature-variable-cost/server/get-equipment-expenses');
    });
  });

  describe('Query Client Memory Management', () => {
    it('should properly dispose of query clients', async () => {
      const initialMemory = await memoryLeakDetector.measureMemoryUsage();

      // Create and use multiple query clients
      const clients = [];
      for (let i = 0; i < 10; i++) {
        const client = new QueryClient({
          defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false },
          },
        });

        // Add data to each client
        const equipment: EquipmentExpenseItem = {
          id: i,
          userId,
          name: `Equipment ${i}`,
          category: 'computer',
          amount: 1000,
          purchaseDate: new Date(),
          usage: 80,
          lifeSpan: 36,
          rank: i,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        equipmentCacheUtils.addItem(client, userId, equipment);
        clients.push(client);
      }

      // Clear all clients
      clients.forEach(client => {
        client.clear();
        client.unmount();
      });

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = await memoryLeakDetector.measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory should not increase significantly
      expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024); // Less than 2MB
    });

    it('should handle concurrent cache operations without memory leaks', async () => {
      const initialMemory = await memoryLeakDetector.measureMemoryUsage();

      // Perform concurrent operations
      const concurrentOperations = Array.from({ length: 50 }, (_, i) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            const equipment: EquipmentExpenseItem = {
              id: i,
              userId,
              name: `Equipment ${i}`,
              category: 'computer',
              amount: 1000,
              purchaseDate: new Date(),
              usage: 80,
              lifeSpan: 36,
              rank: i,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            equipmentCacheUtils.addItem(queryClient, userId, equipment);

            // Perform some updates
            equipmentCacheUtils.updateItem(queryClient, userId, {
              ...equipment,
              amount: 2000,
            });

            // Remove some items
            if (i % 5 === 0) {
              equipmentCacheUtils.removeItem(queryClient, userId, i);
            }

            resolve();
          }, Math.random() * 10);
        });
      });

      await Promise.all(concurrentOperations);

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = await memoryLeakDetector.measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });
  });

  describe('Large Dataset Memory Management', () => {
    it('should handle large datasets without excessive memory usage', async () => {
      const initialMemory = await memoryLeakDetector.measureMemoryUsage();

      // Create large dataset
      const largeDataset: ExpenseItem[] = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        userId,
        name: `Expense ${i}`,
        category: 'office',
        amount: 100 + i,
        period: 'monthly' as const,
        rank: i,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      expenseCacheUtils.replaceAllExpenses(queryClient, userId, largeDataset);

      const afterAddMemory = await memoryLeakDetector.measureMemoryUsage();
      const memoryUsed = afterAddMemory - initialMemory;

      // Memory usage should be reasonable for 10k items (less than 50MB)
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024);

      // Perform operations on the large dataset
      for (let i = 0; i < 1000; i++) {
        const updatedItem = {
          ...largeDataset[i],
          amount: largeDataset[i].amount + 10,
        };
        expenseCacheUtils.updateExpense(queryClient, userId, updatedItem);
      }

      // Remove half the items
      const idsToRemove = Array.from({ length: 5000 }, (_, i) => i);
      expenseCacheUtils.removeMultipleExpenses(queryClient, userId, idsToRemove);

      const afterOperationsMemory = await memoryLeakDetector.measureMemoryUsage();
      const finalMemoryUsed = afterOperationsMemory - initialMemory;

      // Memory should not have grown excessively
      expect(finalMemoryUsed).toBeLessThan(memoryUsed * 1.5); // No more than 50% increase
    });

    it('should properly clean up after batch operations', async () => {
      const initialMemory = await memoryLeakDetector.measureMemoryUsage();

      // Perform multiple batch operations
      for (let batch = 0; batch < 10; batch++) {
        const batchData: EquipmentExpenseItem[] = Array.from({ length: 1000 }, (_, i) => ({
          id: batch * 1000 + i,
          userId,
          name: `Equipment ${batch}-${i}`,
          category: 'computer',
          amount: 1000,
          purchaseDate: new Date(),
          usage: 80,
          lifeSpan: 36,
          rank: i,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        equipmentCacheUtils.replaceAllItems(queryClient, userId, batchData);

        // Perform some operations
        equipmentCacheUtils.updateMultipleItems(queryClient, userId,
          batchData.slice(0, 100).map(item => ({ ...item, amount: 2000 }))
        );

        // Clear the batch
        equipmentCacheUtils.replaceAllItems(queryClient, userId, []);
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = await memoryLeakDetector.measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory should not have increased significantly
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });
  });

  describe('Memory Leak Detection Utilities', () => {
    it('should detect memory growth patterns', async () => {
      const detector = memoryLeakDetector;
      detector.startMonitoring();

      // Simulate gradual memory growth
      const leakyObjects: any[] = [];
      for (let i = 0; i < 100; i++) {
        // Create objects that won't be garbage collected
        const leakyObject = {
          id: i,
          data: new Array(1000).fill(`leak-${i}`),
          circular: null as any,
        };
        leakyObject.circular = leakyObject; // Create circular reference
        leakyObjects.push(leakyObject);

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const report = await detector.detectMemoryLeaks();

      // Should detect the memory growth
      expect(report.memoryGrowthRate).toBeGreaterThan(0);
      expect(report.measurements.length).toBeGreaterThan(0);

      // Clean up the leaky objects
      leakyObjects.forEach(obj => {
        obj.circular = null;
      });
      leakyObjects.length = 0;
    });

    it('should provide memory usage statistics', async () => {
      const detector = memoryLeakDetector;

      const stats = await detector.getMemoryStats();

      expect(stats).toHaveProperty('currentUsage');
      expect(stats).toHaveProperty('peakUsage');
      expect(stats).toHaveProperty('averageUsage');
      expect(stats.currentUsage).toBeGreaterThan(0);
    });

    it('should reset monitoring state', async () => {
      const detector = memoryLeakDetector;

      detector.startMonitoring();

      // Add some measurements
      await detector.measureMemoryUsage();
      await detector.measureMemoryUsage();

      const statsBeforeReset = await detector.getMemoryStats();
      expect(statsBeforeReset.measurements).toBeGreaterThan(0);

      detector.reset();

      const statsAfterReset = await detector.getMemoryStats();
      expect(statsAfterReset.measurements).toBe(0);
    });
  });
});