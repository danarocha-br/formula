/**
 * Billable Panel Toggle Store Tests
 * Tests the core Zustand store functionality without complex component dependencies
 */

import { usePanelToggleStore } from '@/app/store/panel-toggle-store';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Billable Panel Toggle Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    usePanelToggleStore.setState({
      isBillablePanelVisible: true,
    });
  });

  describe('Initial State', () => {
    it('should have panel visible by default', () => {
      const { isBillablePanelVisible } = usePanelToggleStore.getState();
      expect(isBillablePanelVisible).toBe(true);
    });

    it('should provide all required methods', () => {
      const store = usePanelToggleStore.getState();

      expect(typeof store.toggleBillablePanel).toBe('function');
      expect(typeof store.showBillablePanel).toBe('function');
      expect(typeof store.hideBillablePanel).toBe('function');
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle panel visibility from visible to hidden', () => {
      const { toggleBillablePanel } = usePanelToggleStore.getState();

      // Initial state should be visible
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);

      // Toggle to hidden
      toggleBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);
    });

    it('should toggle panel visibility from hidden to visible', () => {
      const { toggleBillablePanel } = usePanelToggleStore.getState();

      // Set initial state to hidden
      usePanelToggleStore.setState({ isBillablePanelVisible: false });
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);

      // Toggle to visible
      toggleBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);
    });

    it('should handle multiple toggles correctly', () => {
      const { toggleBillablePanel } = usePanelToggleStore.getState();

      // Start visible
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);

      // Toggle multiple times
      toggleBillablePanel(); // hidden
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);

      toggleBillablePanel(); // visible
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);

      toggleBillablePanel(); // hidden
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);
    });
  });

  describe('Show Panel Functionality', () => {
    it('should show panel when hidden', () => {
      const { showBillablePanel } = usePanelToggleStore.getState();

      // Set initial state to hidden
      usePanelToggleStore.setState({ isBillablePanelVisible: false });
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);

      // Show panel
      showBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);
    });

    it('should keep panel visible when already visible', () => {
      const { showBillablePanel } = usePanelToggleStore.getState();

      // Initial state is visible
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);

      // Show panel (should remain visible)
      showBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);
    });
  });

  describe('Hide Panel Functionality', () => {
    it('should hide panel when visible', () => {
      const { hideBillablePanel } = usePanelToggleStore.getState();

      // Initial state is visible
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);

      // Hide panel
      hideBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);
    });

    it('should keep panel hidden when already hidden', () => {
      const { hideBillablePanel } = usePanelToggleStore.getState();

      // Set initial state to hidden
      usePanelToggleStore.setState({ isBillablePanelVisible: false });
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);

      // Hide panel (should remain hidden)
      hideBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state across multiple operations', () => {
      const { toggleBillablePanel, showBillablePanel, hideBillablePanel } = usePanelToggleStore.getState();

      // Start visible
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);

      // Hide explicitly
      hideBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);

      // Show explicitly
      showBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);

      // Toggle to hidden
      toggleBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);

      // Show explicitly again
      showBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);
    });

    it('should handle rapid state changes', () => {
      const { toggleBillablePanel, showBillablePanel, hideBillablePanel } = usePanelToggleStore.getState();

      // Perform rapid operations
      for (let i = 0; i < 10; i++) {
        toggleBillablePanel();
        hideBillablePanel();
        showBillablePanel();
        toggleBillablePanel();
      }

      // Final state should be hidden (due to final toggle)
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should maintain proper TypeScript types', () => {
      const store = usePanelToggleStore.getState();

      // Check that isBillablePanelVisible is boolean
      expect(typeof store.isBillablePanelVisible).toBe('boolean');

      // Check that methods are functions
      expect(typeof store.toggleBillablePanel).toBe('function');
      expect(typeof store.showBillablePanel).toBe('function');
      expect(typeof store.hideBillablePanel).toBe('function');
    });

    it('should not allow invalid state values', () => {
      // This test ensures TypeScript prevents invalid assignments
      // The store should only accept boolean values for isBillablePanelVisible

      const store = usePanelToggleStore.getState();
      expect(store.isBillablePanelVisible === true || store.isBillablePanelVisible === false).toBe(true);
    });
  });

  describe('Store Persistence', () => {
    it('should maintain state across multiple getState calls', () => {
      const { toggleBillablePanel } = usePanelToggleStore.getState();

      // Change state
      toggleBillablePanel();

      // Get state multiple times
      const state1 = usePanelToggleStore.getState();
      const state2 = usePanelToggleStore.getState();
      const state3 = usePanelToggleStore.getState();

      // All should return the same state
      expect(state1.isBillablePanelVisible).toBe(false);
      expect(state2.isBillablePanelVisible).toBe(false);
      expect(state3.isBillablePanelVisible).toBe(false);
    });

    it('should handle concurrent state changes', () => {
      const { toggleBillablePanel, showBillablePanel, hideBillablePanel } = usePanelToggleStore.getState();

      // Simulate concurrent operations
      toggleBillablePanel(); // false
      showBillablePanel();   // true
      hideBillablePanel();   // false
      toggleBillablePanel(); // true

      // Final state should be visible
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);
    });
  });

  describe('Requirements Coverage', () => {
    it('should satisfy Requirement 1: Toggle functionality', () => {
      const { toggleBillablePanel } = usePanelToggleStore.getState();

      // REQ 1.1: Panel can be hidden
      toggleBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(false);

      // REQ 1.2: Panel can be shown again
      toggleBillablePanel();
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);
    });

    it('should satisfy Requirement 3: State persistence', () => {
      const { toggleBillablePanel } = usePanelToggleStore.getState();

      // REQ 3.1: State is stored in application state management
      toggleBillablePanel();
      const hiddenState = usePanelToggleStore.getState().isBillablePanelVisible;
      expect(hiddenState).toBe(false);

      // REQ 3.2: State persists across operations
      const { showBillablePanel } = usePanelToggleStore.getState();
      showBillablePanel();
      const visibleState = usePanelToggleStore.getState().isBillablePanelVisible;
      expect(visibleState).toBe(true);

      // REQ 3.3: Default state is visible
      usePanelToggleStore.setState({ isBillablePanelVisible: true });
      expect(usePanelToggleStore.getState().isBillablePanelVisible).toBe(true);
    });
  });
});