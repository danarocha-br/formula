/**
 * Cross-View Compatibility and Edge Cases Tests
 * Tests panel toggle behavior across different views and edge cases
 */

import { usePanelToggleStore } from '@/app/store/panel-toggle-store';
import { useViewPreferenceStore } from '@/app/store/view-preference-store';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Cross-View Compatibility and Edge Cases', () => {
  beforeEach(() => {
    // Reset all stores before each test
    usePanelToggleStore.setState({
      isBillablePanelVisible: true,
    });
    useViewPreferenceStore.setState({
      viewPreference: 'grid',
    });
    vi.clearAllTimers();
  });

  describe('Cross-View State Isolation', () => {
    it('should not interfere with node view', () => {
      const { result: panelStore } = renderHook(() => usePanelToggleStore());
      const { result: viewStore } = renderHook(() => useViewPreferenceStore());

      // Switch to node view
      act(() => {
        viewStore.current.setViewPreference('node');
      });

      // Panel toggle should still work but not affect node view
      act(() => {
        panelStore.current.toggleBillablePanel();
      });

      expect(panelStore.current.isBillablePanelVisible).toBe(false);
      expect(viewStore.current.viewPreference).toBe('node');
    });

    it('should not interfere with chart view', () => {
      const { result: panelStore } = renderHook(() => usePanelToggleStore());
      const { result: viewStore } = renderHook(() => useViewPreferenceStore());

      // Switch to chart view
      act(() => {
        viewStore.current.setViewPreference('chart');
      });

      // Panel toggle should still work but not affect chart view
      act(() => {
        panelStore.current.hideBillablePanel();
      });

      expect(panelStore.current.isBillablePanelVisible).toBe(false);
      expect(viewStore.current.viewPreference).toBe('chart');
    });

    it('should maintain panel state when switching between views', () => {
      const { result: panelStore } = renderHook(() => usePanelToggleStore());
      const { result: viewStore } = renderHook(() => useViewPreferenceStore());

      // Hide panel in grid view
      act(() => {
        panelStore.current.hideBillablePanel();
      });
      expect(panelStore.current.isBillablePanelVisible).toBe(false);

      // Switch to node view
      act(() => {
        viewStore.current.setViewPreference('node');
      });
      expect(panelStore.current.isBillablePanelVisible).toBe(false);

      // Switch back to grid view
      act(() => {
        viewStore.current.setViewPreference('grid');
      });
      expect(panelStore.current.isBillablePanelVisible).toBe(false);
    });
  });

  describe('View Transition Behavior', () => {
    it('should handle rapid view transitions without state corruption', () => {
      const { result: panelStore } = renderHook(() => usePanelToggleStore());
      const { result: viewStore } = renderHook(() => useViewPreferenceStore());

      // Hide panel
      act(() => {
        panelStore.current.hideBillablePanel();
      });

      // Rapid view transitions
      act(() => {
        viewStore.current.setViewPreference('node');
        viewStore.current.setViewPreference('chart');
        viewStore.current.setViewPreference('grid');
        viewStore.current.setViewPreference('table');
        viewStore.current.setViewPreference('grid');
      });

      // Panel state should remain consistent
      expect(panelStore.current.isBillablePanelVisible).toBe(false);
      expect(viewStore.current.viewPreference).toBe('grid');
    });

    it('should preserve panel state during navigation simulation', () => {
      const { result: panelStore } = renderHook(() => usePanelToggleStore());
      const { result: viewStore } = renderHook(() => useViewPreferenceStore());

      // Set specific panel state
      act(() => {
        panelStore.current.showBillablePanel();
      });

      // Simulate navigation by switching views multiple times
      const views = ['grid', 'node', 'chart', 'table', 'grid'] as const;

      views.forEach(view => {
        act(() => {
          viewStore.current.setViewPreference(view);
        });
        // Panel state should persist
        expect(panelStore.current.isBillablePanelVisible).toBe(true);
      });
    });

    it('should handle concurrent view and panel state changes', () => {
      const { result: panelStore } = renderHook(() => usePanelToggleStore());
      const { result: viewStore } = renderHook(() => useViewPreferenceStore());

      // Concurrent operations
      act(() => {
        panelStore.current.toggleBillablePanel(); // false
        viewStore.current.setViewPreference('node');
        panelStore.current.showBillablePanel(); // true
        viewStore.current.setViewPreference('chart');
        panelStore.current.hideBillablePanel(); // false
        viewStore.current.setViewPreference('grid');
      });

      expect(panelStore.current.isBillablePanelVisible).toBe(false);
      expect(viewStore.current.viewPreference).toBe('grid');
    });
  });

  describe('Edge Cases and Rapid Interactions', () => {
    it('should handle rapid toggle clicks without race conditions', () => {
      const { result } = renderHook(() => usePanelToggleStore());

      // Simulate rapid clicking
      act(() => {
        for (let i = 0; i < 1000; i++) {
          result.current.toggleBillablePanel();
        }
      });

      // Final state should be consistent (even number of toggles = original state)
      expect(result.current.isBillablePanelVisible).toBe(true);
      expect(typeof result.current.isBillablePanelVisible).toBe('boolean');
    });

    it('should handle mixed rapid operations', () => {
      const { result } = renderHook(() => usePanelToggleStore());

      // Mixed rapid operations
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.toggleBillablePanel();
          result.current.showBillablePanel();
          result.current.hideBillablePanel();
          result.current.toggleBillablePanel();
        }
      });

      // State should remain valid boolean
      expect(typeof result.current.isBillablePanelVisible).toBe('boolean');
      expect(result.current.isBillablePanelVisible === true || result.current.isBillablePanelVisible === false).toBe(true);
    });

    it('should maintain state consistency during stress testing', () => {
      const { result } = renderHook(() => usePanelToggleStore());

      // Stress test with various operations
      act(() => {
        // Phase 1: Rapid toggles
        for (let i = 0; i < 50; i++) {
          result.current.toggleBillablePanel();
        }

        // Phase 2: Show/hide cycles
        for (let i = 0; i < 25; i++) {
          result.current.showBillablePanel();
          result.current.hideBillablePanel();
        }

        // Phase 3: Mixed operations
        for (let i = 0; i < 25; i++) {
          result.current.toggleBillablePanel();
          result.current.showBillablePanel();
          result.current.toggleBillablePanel();
          result.current.hideBillablePanel();
        }
      });

      // Final state should be valid
      expect(typeof result.current.isBillablePanelVisible).toBe('boolean');
    });
  });

  describe('Responsive Behavior Testing', () => {
    // Mock window.matchMedia for responsive testing
    const mockMatchMedia = (matches: boolean) => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    };

    it('should handle mobile viewport changes', () => {
      const { result } = renderHook(() => usePanelToggleStore());

      // Mock mobile viewport
      mockMatchMedia(true); // matches mobile query

      // Panel operations should work on mobile
      act(() => {
        result.current.toggleBillablePanel();
      });

      expect(result.current.isBillablePanelVisible).toBe(false);
    });

    it('should handle desktop viewport changes', () => {
      const { result } = renderHook(() => usePanelToggleStore());

      // Mock desktop viewport
      mockMatchMedia(false); // doesn't match mobile query

      // Panel operations should work on desktop
      act(() => {
        result.current.hideBillablePanel();
      });

      expect(result.current.isBillablePanelVisible).toBe(false);
    });

    it('should maintain state during viewport transitions', () => {
      const { result } = renderHook(() => usePanelToggleStore());

      // Set panel state
      act(() => {
        result.current.hideBillablePanel();
      });

      // Simulate viewport change from desktop to mobile
      mockMatchMedia(true);
      expect(result.current.isBillablePanelVisible).toBe(false);

      // Simulate viewport change from mobile to desktop
      mockMatchMedia(false);
      expect(result.current.isBillablePanelVisible).toBe(false);
    });
  });

  describe('State Consistency Verification', () => {
    it('should maintain consistent state across all operations', () => {
      const { result: panelStore } = renderHook(() => usePanelToggleStore());
      const { result: viewStore } = renderHook(() => useViewPreferenceStore());

      // Complex scenario with mixed operations
      act(() => {
        // Start with panel visible
        panelStore.current.showBillablePanel();

        // Switch views while toggling panel
        viewStore.current.setViewPreference('node');
        panelStore.current.toggleBillablePanel(); // hidden

        viewStore.current.setViewPreference('chart');
        panelStore.current.showBillablePanel(); // visible

        viewStore.current.setViewPreference('grid');
        panelStore.current.hideBillablePanel(); // hidden

        // Rapid operations
        for (let i = 0; i < 10; i++) {
          panelStore.current.toggleBillablePanel();
        }
      });

      // Verify final state is consistent
      expect(typeof panelStore.current.isBillablePanelVisible).toBe('boolean');
      expect(viewStore.current.viewPreference).toBe('grid');
    });
  });
});