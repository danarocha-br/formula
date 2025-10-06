import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  useSafeEffect,
  useStableDependencies,
  useEffectCleanupTracker,
  useStableReference,
  useEffectDebugger,
  effectSafeguard
} from '../use-effect-safeguards';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('useEffect Safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    effectSafeguard.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useSafeEffect', () => {
    it('should execute effect normally under normal conditions', () => {
      const effectFn = vi.fn();

      renderHook(() =>
        useSafeEffect(effectFn, [], 'TestComponent', 'testEffect')
      );

      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('should prevent infinite loops by blocking excessive executions', () => {
      const effectFn = vi.fn();
      let triggerRerender: () => void;

      const { rerender } = renderHook(() => {
        const [, setCount] = React.useState(0);
        triggerRerender = () => setCount(c => c + 1);

        useSafeEffect(effectFn, [Math.random()], 'TestComponent', 'infiniteEffect');
      });

      // Simulate rapid re-renders
      for (let i = 0; i < 15; i++) {
        act(() => {
          rerender();
        });
        vi.advanceTimersByTime(50); // 50ms between renders
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Infinite loop detected in TestComponent')
      );
    });

    it('should reset execution count after timeout', () => {
      const effectFn = vi.fn();

      const { rerender } = renderHook(() =>
        useSafeEffect(effectFn, [Math.random()], 'TestComponent', 'resetTest')
      );

      // Execute effect multiple times
      for (let i = 0; i < 5; i++) {
        rerender();
        vi.advanceTimersByTime(100);
      }

      // Wait for reset interval
      vi.advanceTimersByTime(6000);

      // Should allow execution again
      rerender();
      expect(effectFn).toHaveBeenCalledTimes(6); // 5 + 1 after reset
    });
  });

  describe('useStableDependencies', () => {
    it('should return stable reference when dependencies do not change', () => {
      const deps = ['a', 'b', 'c'];

      const { result, rerender } = renderHook(
        ({ dependencies }) => useStableDependencies(dependencies, 'TestComponent'),
        { initialProps: { dependencies: deps } }
      );

      const firstResult = result.current;
      rerender({ dependencies: deps }); // Same reference

      expect(result.current).toBe(firstResult);
    });

    it('should update reference when dependencies actually change', () => {
      const { result, rerender } = renderHook(
        ({ dependencies }) => useStableDependencies(dependencies, 'TestComponent'),
        { initialProps: { dependencies: ['a', 'b'] } }
      );

      const firstResult = result.current;
      rerender({ dependencies: ['a', 'c'] }); // Different values

      expect(result.current).not.toBe(firstResult);
      expect(result.current).toEqual(['a', 'c']);
    });

    it('should warn about frequent dependency changes', () => {
      const { rerender } = renderHook(
        ({ dependencies }) => useStableDependencies(dependencies, 'TestComponent', 'frequentEffect'),
        { initialProps: { dependencies: ['a'] } }
      );

      // Trigger many dependency changes
      for (let i = 0; i < 25; i++) {
        rerender({ dependencies: [`value${i}`] });
      }

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Frequent dependency changes detected in TestComponent:frequentEffect')
      );
    });
  });

  describe('useEffectCleanupTracker', () => {
    it('should track cleanup functions', () => {
      const { result } = renderHook(() =>
        useEffectCleanupTracker('TestComponent')
      );

      const cleanupFn = vi.fn();
      const trackedCleanup = result.current.trackCleanup(cleanupFn, 'testEffect');

      expect(result.current.getActiveCleanups()).toHaveLength(1);
      expect(result.current.getActiveCleanups()[0]).toContain('TestComponent:testEffect');

      // Execute cleanup
      trackedCleanup();
      expect(cleanupFn).toHaveBeenCalled();
      expect(result.current.getActiveCleanups()).toHaveLength(0);
    });

    it('should warn about uncleaned effects on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useEffectCleanupTracker('TestComponent')
      );

      const cleanupFn = vi.fn();
      result.current.trackCleanup(cleanupFn, 'uncleanedEffect');

      unmount();

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Component TestComponent unmounted with 1 uncleaned effects'),
        expect.any(Array)
      );
    });

    it('should handle cleanup errors gracefully', () => {
      const { result } = renderHook(() =>
        useEffectCleanupTracker('TestComponent')
      );

      const errorCleanup = vi.fn(() => {
        throw new Error('Cleanup error');
      });

      const trackedCleanup = result.current.trackCleanup(errorCleanup, 'errorEffect');

      expect(() => trackedCleanup()).not.toThrow();
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error in cleanup for TestComponent:errorEffect'),
        expect.any(Error)
      );
      expect(result.current.getActiveCleanups()).toHaveLength(0);
    });
  });

  describe('useStableReference', () => {
    it('should return stable reference for unchanged objects', () => {
      const obj = { a: 1, b: 2 };

      const { result, rerender } = renderHook(
        ({ value }) => useStableReference(value, 'TestComponent', 'testRef'),
        { initialProps: { value: obj } }
      );

      const firstResult = result.current;
      rerender({ value: obj }); // Same reference

      expect(result.current).toBe(firstResult);
    });

    it('should update reference when object content changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useStableReference(value, 'TestComponent', 'testRef'),
        { initialProps: { value: { a: 1 } } }
      );

      const firstResult = result.current;
      rerender({ value: { a: 2 } }); // Different content

      expect(result.current).not.toBe(firstResult);
      expect(result.current).toEqual({ a: 2 });
    });

    it('should warn about excessive reference changes', () => {
      const { rerender } = renderHook(
        ({ value }) => useStableReference(value, 'TestComponent', 'excessiveRef'),
        { initialProps: { value: { count: 0 } } }
      );

      // Trigger many reference changes
      for (let i = 1; i <= 55; i++) {
        rerender({ value: { count: i } });
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Excessive reference changes in TestComponent:excessiveRef')
      );
    });

    it('should handle primitive values correctly', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useStableReference(value, 'TestComponent', 'primitiveRef'),
        { initialProps: { value: 'test' } }
      );

      const firstResult = result.current;
      rerender({ value: 'test' }); // Same value

      expect(result.current).toBe(firstResult);

      rerender({ value: 'different' }); // Different value
      expect(result.current).toBe('different');
    });
  });

  describe('useEffectDebugger', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should log dependency changes in development', () => {
      const effectFn = vi.fn();

      const { rerender } = renderHook(
        ({ deps }) => useEffectDebugger(
          effectFn,
          deps,
          ['prop1', 'prop2'],
          'TestComponent'
        ),
        { initialProps: { deps: ['a', 'b'] } }
      );

      rerender({ deps: ['a', 'c'] }); // Change second dependency

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🔍 Effect triggered in TestComponent:',
        [{ name: 'prop2', before: 'b', after: 'c' }]
      );
    });

    it('should not log in production', () => {
      process.env.NODE_ENV = 'production';
      const effectFn = vi.fn();

      const { rerender } = renderHook(
        ({ deps }) => useEffectDebugger(
          effectFn,
          deps,
          ['prop1'],
          'TestComponent'
        ),
        { initialProps: { deps: ['a'] } }
      );

      rerender({ deps: ['b'] });

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should handle unnamed dependencies', () => {
      const effectFn = vi.fn();

      const { rerender } = renderHook(
        ({ deps }) => useEffectDebugger(
          effectFn,
          deps,
          [], // No names provided
          'TestComponent'
        ),
        { initialProps: { deps: ['a', 'b'] } }
      );

      rerender({ deps: ['c', 'd'] });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🔍 Effect triggered in TestComponent:',
        [
          { name: 'dep0', before: 'a', after: 'c' },
          { name: 'dep1', before: 'b', after: 'd' }
        ]
      );
    });
  });

  describe('effectSafeguard', () => {
    it('should provide execution stats', () => {
      effectSafeguard.shouldExecute('test-effect', 'TestComponent');
      effectSafeguard.shouldExecute('test-effect', 'TestComponent');

      const stats = effectSafeguard.getStats();
      expect(stats).toHaveLength(1);
      expect(stats[0].effectId).toBe('test-effect');
      expect(stats[0].count).toBe(2);
      expect(stats[0].componentName).toBe('TestComponent');
    });

    it('should clear specific effect tracking', () => {
      effectSafeguard.shouldExecute('test-effect', 'TestComponent');
      expect(effectSafeguard.getStats()).toHaveLength(1);

      effectSafeguard.clearEffect('test-effect');
      expect(effectSafeguard.getStats()).toHaveLength(0);
    });
  });
});