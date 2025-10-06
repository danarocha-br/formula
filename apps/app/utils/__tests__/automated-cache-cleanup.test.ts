import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  automatedCacheCleanup,
  useAutomatedCacheCleanup,
  useQueryCleanup,
  useMutationCleanup,
  initializeAutomatedCacheCleanup
} from '../automated-cache-cleanup';

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock performance.now
const mockPerformanceNow = vi.spyOn(performance, 'now');

// Mock memory usage
const mockMemoryUsage = vi.fn();
Object.defineProperty(process, 'memoryUsage', {
  value: mockMemoryUsage,
  configurable: true,
});

describe('Automated Cache Cleanup', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    automatedCacheCleanup.clear();
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
    mockMemoryUsage.mockReturnValue({
      heapUsed: 50 * 1024 * 1024, // 50MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      external: 0,
      arrayBuffers: 0,
    });
  });

  afterEach(() => {
    automatedCacheCleanup.clear();
    queryClient.clear();
  });

  describe('AutomatedCacheCleanup', () => {
    it('should initialize with QueryClient', () => {
      automatedCacheCleanup.initialize(queryClient);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Automated cache cleanup initialized')
      );
    });

    it('should register feature cleanup configuration', () => {
      automatedCacheCleanup.registerFeatureCleanup('test-feature', {
        maxAge: 10000,
        maxSize: 100,
        priority: 'high',
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Registered cleanup config for test-feature'),
        expect.objectContaining({
          maxAge: 10000,
          maxSize: 100,
          priority: 'high',
          feature: 'test-feature',
        })
      );
    });

    it('should track cache access', () => {
      const queryKey = ['test-query', 'user1'];

      automatedCacheCleanup.trackCacheAccess(queryKey, 'test-feature', 1024);

      const entries = automatedCacheCleanup.getCacheEntries('test-feature');
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        queryKey,
        feature: 'test-feature',
        dataSize: 1024,
        accessCount: 1,
      });
    });

    it('should update access count on repeated access', () => {
      const queryKey = ['test-query', 'user1'];

      automatedCacheCleanup.trackCacheAccess(queryKey, 'test-feature');
      automatedCacheCleanup.trackCacheAccess(queryKey, 'test-feature');

      const entries = automatedCacheCleanup.getCacheEntries('test-feature');
      expect(entries[0].accessCount).toBe(2);
    });

    it('should schedule cleanup tasks', () => {
      const cleanupFn = vi.fn();

      automatedCacheCleanup.scheduleCleanup(
        'test-task',
        'cache_cleanup',
        'test-feature',
        cleanupFn,
        1000,
        2
      );

      const tasks = automatedCacheCleanup.getScheduledTasks('test-feature');
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        id: 'test-task',
        type: 'cache_cleanup',
        feature: 'test-feature',
        priority: 2,
        completed: false,
      });
    });

    it('should execute scheduled tasks', async () => {
      const cleanupFn = vi.fn().mockResolvedValue(undefined);

      automatedCacheCleanup.scheduleCleanup(
        'immediate-task',
        'cache_cleanup',
        'test-feature',
        cleanupFn,
        0 // Execute immediately
      );

      await automatedCacheCleanup.executeScheduledTasks();

      expect(cleanupFn).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Completed cleanup task immediate-task')
      );
    });

    it('should handle task execution errors', async () => {
      const cleanupFn = vi.fn().mockRejectedValue(new Error('Cleanup failed'));

      automatedCacheCleanup.scheduleCleanup(
        'failing-task',
        'cache_cleanup',
        'test-feature',
        cleanupFn,
        0
      );

      await automatedCacheCleanup.executeScheduledTasks();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed cleanup task failing-task'),
        expect.any(Error)
      );
    });

    it('should clean up stale entries', async () => {
      automatedCacheCleanup.initialize(queryClient);

      // Register feature with short max age
      automatedCacheCleanup.registerFeatureCleanup('test-feature', {
        maxAge: 1000, // 1 second
      });

      // Add some test data to query client
      queryClient.setQueryData(['test-query', 'user1'], { data: 'test' });

      // Track the access
      automatedCacheCleanup.trackCacheAccess(['test-query', 'user1'], 'test-feature');

      // Simulate time passing
      mockPerformanceNow.mockReturnValue(3000); // 3 seconds later

      const removedCount = await automatedCacheCleanup.cleanupStaleEntries('test-feature');

      expect(removedCount).toBe(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up 1 stale cache entries')
      );
    });

    it('should clean up by size limit', async () => {
      automatedCacheCleanup.initialize(queryClient);

      // Register feature with small max size
      automatedCacheCleanup.registerFeatureCleanup('test-feature', {
        maxSize: 2,
      });

      // Add multiple entries
      for (let i = 0; i < 5; i++) {
        const queryKey = ['test-query', `user${i}`];
        queryClient.setQueryData(queryKey, { data: `test${i}` });
        automatedCacheCleanup.trackCacheAccess(queryKey, 'test-feature');
      }

      const removedCount = await automatedCacheCleanup.cleanupBySize('test-feature');

      expect(removedCount).toBe(3); // Should remove 3 to get down to 2
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up 3 cache entries by size limit')
      );
    });

    it('should perform comprehensive cleanup', async () => {
      automatedCacheCleanup.initialize(queryClient);

      // Schedule a task
      const taskCleanup = vi.fn().mockResolvedValue(undefined);
      automatedCacheCleanup.scheduleCleanup(
        'comprehensive-task',
        'cache_cleanup',
        'test-feature',
        taskCleanup,
        0
      );

      // Add stale entries
      automatedCacheCleanup.registerFeatureCleanup('test-feature', { maxAge: 1000 });
      queryClient.setQueryData(['stale-query'], { data: 'stale' });
      automatedCacheCleanup.trackCacheAccess(['stale-query'], 'test-feature');

      mockPerformanceNow.mockReturnValue(3000); // Make entry stale

      const result = await automatedCacheCleanup.performComprehensiveCleanup();

      expect(result).toMatchObject({
        staleEntriesRemoved: expect.any(Number),
        sizeBasedRemoved: expect.any(Number),
        memoryFreed: expect.any(Number),
        tasksExecuted: expect.any(Number),
      });

      expect(taskCleanup).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Comprehensive cleanup completed')
      );
    });

    it('should track cleanup metrics', async () => {
      automatedCacheCleanup.initialize(queryClient);

      // Perform some cleanups
      await automatedCacheCleanup.cleanupStaleEntries();
      await automatedCacheCleanup.cleanupBySize();

      const metrics = automatedCacheCleanup.getMetrics();

      expect(metrics).toMatchObject({
        totalCleanups: expect.any(Number),
        successfulCleanups: expect.any(Number),
        failedCleanups: 0,
        memoryFreed: expect.any(Number),
        cacheEntriesRemoved: expect.any(Number),
        averageCleanupTime: expect.any(Number),
        lastCleanupTime: expect.any(Number),
      });
    });
  });

  describe('useAutomatedCacheCleanup', () => {
    it('should register feature cleanup and provide utilities', () => {
      const { result } = renderHook(() =>
        useAutomatedCacheCleanup('hook-feature', { maxAge: 5000 })
      );

      expect(result.current).toMatchObject({
        scheduleCleanup: expect.any(Function),
        trackAccess: expect.any(Function),
        performCleanup: expect.any(Function),
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Registered cleanup config for hook-feature')
      );
    });

    it('should schedule cleanup through hook', () => {
      const { result } = renderHook(() =>
        useAutomatedCacheCleanup('hook-feature')
      );

      const cleanupFn = vi.fn();
      act(() => {
        result.current.scheduleCleanup('hook-task', cleanupFn, 1000);
      });

      const tasks = automatedCacheCleanup.getScheduledTasks('hook-feature');
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should track access through hook', () => {
      const { result } = renderHook(() =>
        useAutomatedCacheCleanup('hook-feature')
      );

      act(() => {
        result.current.trackAccess(['hook-query'], 512);
      });

      const entries = automatedCacheCleanup.getCacheEntries('hook-feature');
      expect(entries).toHaveLength(1);
      expect(entries[0].dataSize).toBe(512);
    });

    it('should perform cleanup through hook', async () => {
      automatedCacheCleanup.initialize(queryClient);

      const { result } = renderHook(() =>
        useAutomatedCacheCleanup('hook-feature', { maxAge: 1000 })
      );

      // Add and track a query
      queryClient.setQueryData(['hook-query'], { data: 'test' });
      act(() => {
        result.current.trackAccess(['hook-query']);
      });

      // Make it stale
      mockPerformanceNow.mockReturnValue(3000);

      const removedCount = await act(async () => {
        return result.current.performCleanup();
      });

      expect(removedCount).toBe(1);
    });
  });

  describe('useQueryCleanup', () => {
    it('should track query access and schedule cleanup', () => {
      const onCleanup = vi.fn();

      renderHook(() =>
        useQueryCleanup(['query-cleanup-test'], 'test-feature', {
          maxAge: 5000,
          onCleanup,
          trackAccess: true,
        })
      );

      const entries = automatedCacheCleanup.getCacheEntries('test-feature');
      expect(entries).toHaveLength(1);
      expect(entries[0].queryKey).toEqual(['query-cleanup-test']);
    });

    it('should not track access when disabled', () => {
      renderHook(() =>
        useQueryCleanup(['no-track-query'], 'test-feature', {
          trackAccess: false,
        })
      );

      const entries = automatedCacheCleanup.getCacheEntries('test-feature');
      expect(entries).toHaveLength(0);
    });
  });

  describe('useMutationCleanup', () => {
    it('should schedule cleanup on unmount', () => {
      const cleanupFn = vi.fn();

      const { unmount } = renderHook(() =>
        useMutationCleanup('test-mutation', 'test-feature', cleanupFn)
      );

      // Should not have tasks before unmount
      expect(automatedCacheCleanup.getScheduledTasks('test-feature')).toHaveLength(0);

      unmount();

      // Should schedule cleanup on unmount
      const tasks = automatedCacheCleanup.getScheduledTasks('test-feature');
      expect(tasks.length).toBeGreaterThan(0);
    });
  });

  describe('initializeAutomatedCacheCleanup', () => {
    it('should initialize with default feature configs', () => {
      initializeAutomatedCacheCleanup(queryClient);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Automated cache cleanup initialized with default configs')
      );

      // Should have registered default features
      const fixedExpensesEntries = automatedCacheCleanup.getCacheEntries('fixed-expenses');
      const billableExpensesEntries = automatedCacheCleanup.getCacheEntries('billable-expenses');
      const equipmentExpensesEntries = automatedCacheCleanup.getCacheEntries('equipment-expenses');

      // These should be empty but the configs should be registered
      expect(Array.isArray(fixedExpensesEntries)).toBe(true);
      expect(Array.isArray(billableExpensesEntries)).toBe(true);
      expect(Array.isArray(equipmentExpensesEntries)).toBe(true);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large numbers of cache entries efficiently', () => {
      const startTime = performance.now();

      // Track many cache entries
      for (let i = 0; i < 1000; i++) {
        automatedCacheCleanup.trackCacheAccess(
          ['perf-test', `item${i}`],
          'perf-feature',
          1024
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(automatedCacheCleanup.getCacheEntries('perf-feature')).toHaveLength(1000);
    });

    it('should clean up resources on clear', () => {
      // Add various data
      automatedCacheCleanup.registerFeatureCleanup('clear-test');
      automatedCacheCleanup.trackCacheAccess(['clear-query'], 'clear-test');
      automatedCacheCleanup.scheduleCleanup('clear-task', 'cache_cleanup', 'clear-test', vi.fn());

      expect(automatedCacheCleanup.getCacheEntries()).toHaveLength(1);
      expect(automatedCacheCleanup.getScheduledTasks()).toHaveLength(1);

      automatedCacheCleanup.clear();

      expect(automatedCacheCleanup.getCacheEntries()).toHaveLength(0);
      expect(automatedCacheCleanup.getScheduledTasks()).toHaveLength(0);
      expect(automatedCacheCleanup.getMetrics().totalCleanups).toBe(0);
    });

    it('should handle memory usage tracking', () => {
      // Mock different memory values
      mockMemoryUsage
        .mockReturnValueOnce({ heapUsed: 50 * 1024 * 1024, heapTotal: 100 * 1024 * 1024, external: 0, arrayBuffers: 0 })
        .mockReturnValueOnce({ heapUsed: 40 * 1024 * 1024, heapTotal: 100 * 1024 * 1024, external: 0, arrayBuffers: 0 });

      automatedCacheCleanup.initialize(queryClient);

      // Should track memory usage during cleanup
      return automatedCacheCleanup.cleanupStaleEntries().then(() => {
        const metrics = automatedCacheCleanup.getMetrics();
        expect(metrics.memoryFreed).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle cleanup errors gracefully', async () => {
      automatedCacheCleanup.initialize(queryClient);

      // Mock queryClient.removeQueries to throw an error
      const originalRemoveQueries = queryClient.removeQueries;
      queryClient.removeQueries = vi.fn().mockImplementation(() => {
        throw new Error('Remove queries failed');
      });

      const removedCount = await automatedCacheCleanup.cleanupStaleEntries();

      expect(removedCount).toBe(0);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error during cache cleanup:',
        expect.any(Error)
      );

      // Restore original method
      queryClient.removeQueries = originalRemoveQueries;
    });

    it('should handle missing QueryClient gracefully', async () => {
      // Don't initialize with QueryClient
      const removedCount = await automatedCacheCleanup.cleanupStaleEntries();
      expect(removedCount).toBe(0);
    });
  });
});