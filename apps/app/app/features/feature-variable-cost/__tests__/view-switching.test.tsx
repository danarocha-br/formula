import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VariableCostView } from '../index';

// Mock all dependencies
vi.mock('@/app/store/view-preference-store', () => ({
  useViewPreferenceStore: vi.fn()
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
  TableView: ({ data, userId, getCategoryColor, getCategoryLabel }: any) => (
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
import { useViewPreferenceStore } from '@/app/store/view-preference-store';
import { useStableEquipment } from '@/hooks/use-stable-equipment';

const mockUseViewPreferenceStore = useViewPreferenceStore as any;
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

const mockGetCategoryColor = (category: string) => 'bg-blue-300';
const mockGetCategoryLabel = (category: string) => category.charAt(0).toUpperCase() + category.slice(1);

describe('VariableCostView View Switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock setup
    mockUseStableEquipment.mockReturnValue({
      equipment: mockEquipmentData,
      isLoading: false,
    });
  });

  it('renders grid view when viewPreference is grid', () => {
    mockUseViewPreferenceStore.mockReturnValue({
      viewPreference: 'grid'
    });

    render(<VariableCostView userId="user-1" />);

    expect(screen.getByTestId('grid-view')).toBeInTheDocument();
    expect(screen.getByTestId('grid-view')).toHaveAttribute('data-user-id', 'user-1');
    expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
  });

  it('renders table view when viewPreference is table and data is available', () => {
    mockUseViewPreferenceStore.mockReturnValue({
      viewPreference: 'table'
    });

    render(<VariableCostView userId="user-1" />);

    expect(screen.getByTestId('table-view')).toBeInTheDocument();
    expect(screen.getByTestId('table-view')).toHaveAttribute('data-user-id', 'user-1');
    expect(screen.getByTestId('table-view')).toHaveAttribute('data-data-length', '1');
    expect(screen.queryByTestId('grid-view')).not.toBeInTheDocument();
  });

  it('renders table view with empty data when equipment data is null', () => {
    mockUseViewPreferenceStore.mockReturnValue({
      viewPreference: 'table'
    });

    mockUseStableEquipment.mockReturnValue({
      equipment: null,
      isLoading: false,
    });

    render(<VariableCostView userId="user-1" />);

    // Table view should still render with empty array (equipmentExpenses || [])
    expect(screen.getByTestId('table-view')).toBeInTheDocument();
    expect(screen.getByTestId('table-view')).toHaveAttribute('data-data-length', '0');
    expect(screen.queryByTestId('grid-view')).not.toBeInTheDocument();
  });

  it('renders table view when viewPreference is table but data is empty array', () => {
    mockUseViewPreferenceStore.mockReturnValue({
      viewPreference: 'table'
    });

    mockUseStableEquipment.mockReturnValue({
      equipment: [],
      isLoading: false,
    });

    render(<VariableCostView userId="user-1" />);

    // Table view should still render with empty data
    expect(screen.getByTestId('table-view')).toBeInTheDocument();
    expect(screen.getByTestId('table-view')).toHaveAttribute('data-data-length', '0');
    expect(screen.queryByTestId('grid-view')).not.toBeInTheDocument();
  });

  it('shows loading view when data is loading regardless of view preference', () => {
    mockUseViewPreferenceStore.mockReturnValue({
      viewPreference: 'table'
    });

    mockUseStableEquipment.mockReturnValue({
      equipment: mockEquipmentData,
      isLoading: true,
    });

    render(<VariableCostView userId="user-1" />);

    expect(screen.getByTestId('loading-view')).toBeInTheDocument();
    expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grid-view')).not.toBeInTheDocument();
  });

  it('passes correct props to TableView component', () => {
    mockUseViewPreferenceStore.mockReturnValue({
      viewPreference: 'table'
    });

    render(<VariableCostView userId="user-1" />);

    const tableView = screen.getByTestId('table-view');
    expect(tableView).toHaveAttribute('data-user-id', 'user-1');
    expect(tableView).toHaveAttribute('data-data-length', '1');
  });

  it('passes correct props to GridView component', () => {
    mockUseViewPreferenceStore.mockReturnValue({
      viewPreference: 'grid'
    });

    render(<VariableCostView userId="user-1" />);

    const gridView = screen.getByTestId('grid-view');
    expect(gridView).toHaveAttribute('data-user-id', 'user-1');
  });

  it('handles view preference changes correctly', () => {
    const { rerender } = render(<VariableCostView userId="user-1" />);

    // Start with grid view
    mockUseViewPreferenceStore.mockReturnValue({
      viewPreference: 'grid'
    });
    rerender(<VariableCostView userId="user-1" />);
    expect(screen.getByTestId('grid-view')).toBeInTheDocument();
    expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();

    // Switch to table view
    mockUseViewPreferenceStore.mockReturnValue({
      viewPreference: 'table'
    });
    rerender(<VariableCostView userId="user-1" />);
    expect(screen.getByTestId('table-view')).toBeInTheDocument();
    expect(screen.queryByTestId('grid-view')).not.toBeInTheDocument();
  });
});