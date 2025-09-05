import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useExpenseFeatureSafeguards,
  useQuerySafeguards,
  useMutationSafeguards,
  useExpenseComponentSafeguards
} from '../use-effect-safeguards';

// Mock console methods
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock Date.now for consistent timing
const mockDateNow = vi.spyOn(Date, 'now');

describe('Enhanced useEffect Safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDateNow.mockReturnValue(1000);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('useExpenseFeatureSafeguards', () => {
    it('should provide safeguard utilities for expense features', () => {
      const { result } = renderHook(() =>
        useExpenseFeatureSafeguards('TestComponent', 'fixed-expenses')
      );

      expect(result.current).toMatchObject({
        safeEffect: expect.any(Function),
        stableDeps: expect.any(Function),
        stableRef: expect.any(Function),
        trackCleanup: expect.any(Function),
        isRenderSafe: true,
      });
    });

    it('should detect excessive rendering', () => {
      const { result, rerender } = renderHook(() =>
        useExpenseFeatureSafeguards('ExcessiveComponent', 'billable-expenses')
      );

      // Simulate many rapid re-renders
      for (let i = 0; i < 105; i++) {
        mockDateNow.mockReturnValue(1000 + i); // 1ms apart
        rerender();
      }

      expect(result.current.isRenderSafe).toBe(false);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Excessive rendering detected in billable-expenses feature')
      );
    });

    it('should provide safe effect wrapper', () => {
      const { result } = renderHook(() =>
        useExpenseFeatureSafeguards('SafeEffectComponent', 'equipment-expenses')
      );

      const effectCallback = vi.fn();
      const deps = ['dep1', 'dep2'];

      act(() => {
        result.current.safeEffect(effectCallback, deps, 'test-effect');
      });

      // The effect should be wrapped with safeguards
      expect(effectCallback).toHaveBeenCalled();
    });

    it('should provide stable dependencies wrapper', () => {
      const { result } = renderHook(() =>
        useExpenseFeatureSafeguards('StableDepsComponent', 'fixed-expenses')
      );

      const deps = ['dep1', 'dep2'];
      const stableDeps = result.current.stableDeps(deps, 'test-deps');

      expect(stableDeps).toEqual(deps);
    });

    it('should provide stable reference wrapper', () => {
      const { result } = renderHook(() =>
        useExpenseFeatureSafeguards('StableRefComponent', 'billable-expenses')
      );

      const value = { data: 'test' };
      const stableValue = result.current.stableRef(value, 'test-ref');

      expect(stableValue).toEqual(value);
    });

    it('should track cleanup functions', () => {
      const { result } = renderHook(() =>
        useExpenseFeatureSafeguards('CleanupComponent', 'equipment-expenses')
      );

      const cleanupFn = vi.fn();
      const wrappedCleanup = result.current.trackCleanup(cleanupFn, 'test-cleanup');

      expect(typeof wrappedCleanup).toBe('function');

      // Execute cleanup
      wrappedCleanup();
      expect(cleanupFn).toHaveBeenCalled();
    });
  });

  describe('useQuerySafeguards', () => {
    it('should provide safe query key and refetch control', () => {
      const { result } = renderHook(() =>
        useQuerySafeguards(['query', 'user1'], 'QueryComponent', 'fixed-expenses')
      );

      expect(result.current).toMatchObject({
        safeQueryKey: ['query', 'user1'],
        shouldRefetch: true,
        refetchCount: 0,
      });
    });

    it('should detect excessive refetching', () => {
      const { result, rerender } = renderHook(() =>
        useQuerySafeguards(['query', 'user1'], 'ExcessiveQueryComponent', 'billable-expenses')
      );

      // Simulate rapid refetches within 1 second
      for (let i = 0; i < 12; i++) {
        mockDateNow.mockReturnValue(1000 + i * 50); // 50ms apart, within 1 second
        rerender();
      }

      expect(result.current.shouldRefetch).toBe(false);
      expect(result.current.refetchCount).toBeGreaterThan(10);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Excessive query refetching detected')
      );
    });

    it('should reset refetch count after time window', () => {
      const { result, rerender } = renderHook(() =>
        useQuerySafeguards(['query', 'user1'], 'TimerQueryComponent', 'equipment-expenses')
      );

      // Trigger many refetches
      for (let i = 0; i < 12; i++) {
        mockDateNow.mockReturnValue(1000 + i * 50);
        rerender();
      }

      expect(result.current.shouldRefetch).toBe(false);

      // Advance time by more than 1 second
      mockDateNow.mockReturnValue(3000);
      rerender();

      expect(result.current.shouldRefetch).toBe(true);
      expect(result.current.refetchCount).toBe(0);
    });

    it('should provide stable query key', () => {
      const { result, rerender } = renderHook(
        ({ queryKey }) => useQuerySafeguards(queryKey, 'StableQueryComponent', 'fixed-expenses'),
        { initialProps: { queryKey: ['query', 'user1'] } }
      );

      const firstQueryKey = result.current.safeQueryKey;

      // Re-render with same query key
      rerender({ queryKey: ['query', 'user1'] });

      expect(result.current.safeQueryKey).toBe(firstQueryKey); // Should be same reference
    });
  });

  describe('useMutationSafeguards', () => {
    it('should provide mutation control utilities', () => {
      const { result } = renderHook(() =>
        useMutationSafeguards('MutationComponent', 'fixed-expenses')
      );

      expect(result.current).toMatchObject({
        shouldExecuteMutation: expect.any(Function),
        trackMutation: expect.any(Function),
        getMutationCount: expect.any(Function),
      });
    });

    it('should allow normal mutations', () => {
      const { result } = renderHook(() =>
        useMutationSafeguards('NormalMutationComponent', 'billable-expenses')
      );

      expect(result.current.shouldExecuteMutation('create')).toBe(true);
      expect(result.current.shouldExecuteMutation('update')).toBe(true);
      expect(result.current.shouldExecuteMutation('delete')).toBe(true);
    });

    it('should detect excessive mutations', () => {
      const { result } = renderHook(() =>
        useMutationSafeguards('ExcessiveMutationComponent', 'equipment-expenses')
      );

      // Trigger many mutations of the same type
      for (let i = 0; i < 6; i++) {
        mockDateNow.mockReturnValue(1000 + i * 100); // Within 5 seconds
        expect(result.current.shouldExecuteMutation('create')).toBe(i < 5);
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Excessive mutations detected')
      );
    });

    it('should reset mutation count after time window', () => {
      const { result } = renderHook(() =>
        useMutationSafeguards('TimerMutationComponent', 'fixed-expenses')
      );

      // Trigger maximum mutations
      for (let i = 0; i < 5; i++) {
        mockDateNow.mockReturnValue(1000 + i * 100);
        result.current.shouldExecuteMutation('update');
      }

      expect(result.current.shouldExecuteMutation('update')).toBe(false);

      // Advance time by more than 5 seconds
      mockDateNow.mockReturnValue(7000);

      expect(result.current.shouldExecuteMutation('update')).toBe(true);
    });

    it('should track mutation counts', () => {
      const { result } = renderHook(() =>
        useMutationSafeguards('TrackingMutationComponent', 'billable-expenses')
      );

      act(() => {
        result.current.trackMutation('create');
        result.current.trackMutation('create');
        result.current.trackMutation('update');
      });

      expect(result.current.getMutationCount('create')).toBe(2);
      expect(result.current.getMutationCount('update')).toBe(1);
      expect(result.current.getMutationCount('delete')).toBe(0);
    });

    it('should handle different mutation types independently', () => {
      const { result } = renderHook(() =>
        useMutationSafeguards('IndependentMutationComponent', 'equipment-expenses')
      );

      // Max out 'create' mutations
      for (let i = 0; i < 5; i++) {
        result.current.shouldExecuteMutation('create');
      }

      expect(result.current.shouldExecuteMutation('create')).toBe(false);
      expect(result.current.shouldExecuteMutation('update')).toBe(true); // Should still work
      expect(result.current.shouldExecuteMutation('delete')).toBe(true); // Should still work
    });
  });

  describe('useExpenseComponentSafeguards', () => {
    it('should provide comprehensive safeguards', () => {
      const { result } = renderHook(() =>
        useExpenseComponentSafeguards('ComprehensiveComponent', 'fixed-expenses')
      );

      expect(result.current).toMatchObject({
        safeEffect: expect.any(Function),
        stableDeps: expect.any(Function),
        stableRef: expect.any(Function),
        safeQueryKey: expect.any(Function),
        shouldExecuteMutation: expect.any(Function),
        trackMutation: expect.any(Function),
        isComponentHealthy: true,
        healthReport: expect.objectContaining({
          renderCount: expect.any(Number),
          isRenderSafe: expect.any(Boolean),
          mutationCounts: expect.any(Object),
        }),
      });
    });

    it('should detect unhealthy components', () => {
      const { result, rerender } = renderHook(() =>
        useExpenseComponentSafeguards('UnhealthyComponent', 'billable-expenses', {
          maxRenders: 5,
        })
      );

      // Trigger many renders
      for (let i = 0; i < 7; i++) {
        rerender();
      }

      expect(result.current.isComponentHealthy).toBe(false);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Component health warning'),
        expect.any(Object)
      );
    });

    it('should provide health report', () => {
      const { result } = renderHook(() =>
        useExpenseComponentSafeguards('HealthReportComponent', 'equipment-expenses')
      );

      const healthReport = result.current.healthReport;

      expect(healthReport).toMatchObject({
        renderCount: expect.any(Number),
        isRenderSafe: expect.any(Boolean),
        mutationCounts: {
          create: expect.any(Number),
          update: expect.any(Number),
          delete: expect.any(Number),
        },
      });
    });

    it('should handle custom options', () => {
      const { result } = renderHook(() =>
        useExpenseComponentSafeguards('CustomOptionsComponent', 'fixed-expenses', {
          maxRenders: 10,
          maxMutations: 3,
          maxRefetches: 5,
          enableMemoryTracking: false,
        })
      );

      expect(result.current.healthReport.memoryUsage).toBeUndefined();
    });

    it('should track memory usage when enabled', () => {
      // Mock process.memoryUsage for Node.js environment
      const mockMemoryUsage = vi.fn().mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      });

      Object.defineProperty(process, 'memoryUsage', {
        value: mockMemoryUsage,
        configurable: true,
      });

      const { result } = renderHook(() =>
        useExpenseComponentSafeguards('MemoryTrackingComponent', 'billable-expenses', {
          enableMemoryTracking: true,
        })
      );

      expect(result.current.healthReport.memoryUsage).toBeDefined();
      expect(mockMemoryUsage).toHaveBeenCalled();
    });

    it('should provide safe query key wrapper', () => {
      const { result } = renderHook(() =>
        useExpenseComponentSafeguards('QueryKeyComponent', 'equipment-expenses')
      );

      const queryKey = ['test-query', 'user1'];
      const safeQueryKey = result.current.safeQueryKey(queryKey);

      expect(safeQueryKey).toEqual(queryKey);
    });

    it('should integrate mutation safeguards', () => {
      const { result } = renderHook(() =>
        useExpenseComponentSafeguards('MutationIntegrationComponent', 'fixed-expenses')
      );

      expect(result.current.shouldExecuteMutation('create')).toBe(true);

      act(() => {
        result.current.trackMutation('create');
      });

      expect(result.current.healthReport.mutationCounts.create).toBe(1);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle many components efficiently', () => {
      const startTime = performance.now();

      // Create many components with safeguards
      const hooks = [];
      for (let i = 0; i < 100; i++) {
        const { result } = renderHook(() =>
          useExpenseComponentSafeguards(`PerfComponent${i}`, 'fixed-expenses')
        );
        hooks.push(result);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(hooks).toHaveLength(100);
    });

    it('should clean up resources properly', () => {
      const { unmount } = renderHook(() =>
        useExpenseComponentSafeguards('CleanupTestComponent', 'billable-expenses')
      );

      // Component should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      const { result, rerender } = renderHook(
        ({ feature }) => useExpenseComponentSafeguards('RapidChangeComponent', feature),
        { initialProps: { feature: 'fixed-expenses' as const } }
      );

      // Rapidly change feature
      rerender({ feature: 'billable-expenses' as const });
      rerender({ feature: 'equipment-expenses' as const });
      rerender({ feature: 'fixed-expenses' as const });

      expect(result.current.isComponentHealthy).toBe(true);
    });

    it('should handle undefined or null dependencies', () => {
      const { result } = renderHook(() =>
        useExpenseComponentSafeguards('NullDepsComponent', 'equipment-expenses')
      );

      expect(() => {
        result.current.stableDeps([null, undefined, 'valid']);
      }).not.toThrow();
    });

    it('should handle empty query keys', () => {
      const { result } = renderHook(() =>
        useExpenseComponentSafeguards('EmptyQueryComponent', 'fixed-expenses')
      );

      expect(() => {
        result.current.safeQueryKey([]);
      }).not.toThrow();
    });
  });
});