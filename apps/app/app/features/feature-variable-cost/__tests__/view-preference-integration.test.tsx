import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VariableCostView } from '../index';

// Mock the view preference store with actual state management
const mockViewPreferenceState = {
  viewPreference: 'grid' as 'grid' | 'table',
  setViewPreference: vi.fn((newView: 'grid' | 'table') => {
    mockViewPreferenceState.viewPreference = newView;
  })
};

vi.mock('@/app/store/view-preference-store', () => ({
  useViewPreferenceStore: () => mockViewPreferenceState
}));

vi.mock('@/hooks/use-stable-equipment', () => ({
  useStableEquipment: vi.fn()
}));

vi.mock('@/utils/use-effect-safeguards', () => ({
  useExpenseComponentSafeguards: () => ({
    isComponentHealthy: true,
    healthReport: {}
  })
}));

vi.mock('@/utils/memory-leak-detection', () => ({
  useMemoryLeakDetection: () => ({
    registerCleanup: vi.fn(() => vi.fn())
  })
}));

vi.mock('@/utils/re-render-monitoring', () => ({
  useRenderFrequencyMonitor: () => ({
    isExcessive: false
  })
}));

vi.mock('../grid-view', () => ({
  GridView: ({ userId }: any) => <div data-testid="grid-view" data-user-id={userId}>Grid View</div>
}));

vi.mock('../table-view', () => ({
  TableView: ({ data, userId }: any) => (
    <div
      data-testid="table-view"
      data-user-id={userId}
      data-data-length={data?.length || 0}
    >
      Table View
    </div>
  )
}));

vi.mock('../../feature-hourly-cost/loading-view', () => ({
  LoadingView: () => <div data-testid="loading-view">Loading...</div>
}));

// Import the mocked modules
import { useStableEquipment } from '@/hooks/use-stable-equipment';

const mockUseStableEquipment = useStableEquipment as any;

const mockEquipmentData = [
  {
    id: 1,
    userId: 'user-1',
    rank: 1,
    name: 'MacBook Pro',
    amount: 2400,
    category: 'computer',
    purchaseDate: new Date('2023-01-01'),
    usage: 100,
    lifeSpan: 24
  }
];

describe('VariableCostView View Preference Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset view preference to grid
    mockViewPreferenceState.viewPreference = 'grid';

    // Default mock setup
    mockUseStableEquipment.mockReturnValue({
      equipment: mockEquipmentData,
      isLoading: false,
    });
  });

  it('maintains view preference state across re-renders', () => {
    const { rerender } = render(<VariableCostView userId="user-1" />);

    // Initially shows grid view
    expect(screen.getByTestId('grid-view')).toBeInTheDocument();
    expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();

    // Simulate view preference change to table
    act(() => {
      mockViewPreferenceState.setViewPreference('table');
    });

    // Re-render with new preference
    rerender(<VariableCostView userId="user-1" />);

    expect(screen.getByTestId('table-view')).toBeInTheDocument();
    expect(screen.queryByTestId('grid-view')).not.toBeInTheDocument();

    // Switch back to grid
    act(() => {
      mockViewPreferenceState.setViewPreference('grid');
    });

    rerender(<VariableCostView userId="user-1" />);

    expect(screen.getByTestId('grid-view')).toBeInTheDocument();
    expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
  });

  it('preserves data state when switching between views', () => {
    const { rerender } = render(<VariableCostView userId="user-1" />);

    // Start with grid view
    expect(screen.getByTestId('grid-view')).toBeInTheDocument();

    // Switch to table view
    act(() => {
      mockViewPreferenceState.setViewPreference('table');
    });

    rerender(<VariableCostView userId="user-1" />);

    // Verify table view receives the same data
    const tableView = screen.getByTestId('table-view');
    expect(tableView).toHaveAttribute('data-data-length', '1');
    expect(tableView).toHaveAttribute('data-user-id', 'user-1');

    // Switch back to grid view
    act(() => {
      mockViewPreferenceState.setViewPreference('grid');
    });

    rerender(<VariableCostView userId="user-1" />);

    // Verify grid view still has access to the same data
    const gridView = screen.getByTestId('grid-view');
    expect(gridView).toHaveAttribute('data-user-id', 'user-1');
  });

  it('handles rapid view switching without issues', () => {
    const { rerender } = render(<VariableCostView userId="user-1" />);

    // Perform rapid view switches
    const viewSequence = ['table', 'grid', 'table', 'grid', 'table'] as const;

    viewSequence.forEach((view) => {
      act(() => {
        mockViewPreferenceState.setViewPreference(view);
      });

      rerender(<VariableCostView userId="user-1" />);

      if (view === 'table') {
        expect(screen.getByTestId('table-view')).toBeInTheDocument();
        expect(screen.queryByTestId('grid-view')).not.toBeInTheDocument();
      } else {
        expect(screen.getByTestId('grid-view')).toBeInTheDocument();
        expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
      }
    });
  });

  it('maintains view preference during loading states', () => {
    // Start with table view preference
    mockViewPreferenceState.viewPreference = 'table';

    // Set loading state
    mockUseStableEquipment.mockReturnValue({
      equipment: mockEquipmentData,
      isLoading: true,
    });

    const { rerender } = render(<VariableCostView userId="user-1" />);

    // Should show loading view regardless of preference
    expect(screen.getByTestId('loading-view')).toBeInTheDocument();
    expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grid-view')).not.toBeInTheDocument();

    // Finish loading
    mockUseStableEquipment.mockReturnValue({
      equipment: mockEquipmentData,
      isLoading: false,
    });

    rerender(<VariableCostView userId="user-1" />);

    // Should now show table view as per preference
    expect(screen.getByTestId('table-view')).toBeInTheDocument();
    expect(screen.queryByTestId('grid-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-view')).not.toBeInTheDocument();
  });
});