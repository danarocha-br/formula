import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createElement } from 'react';
import type { ReactNode } from 'react';

import { useCreateEquipmentExpense } from '../create-equipment-expense';
import { useUpdateEquipmentExpense } from '../update-equipment-expense';
import { useDeleteEquipmentExpense } from '../delete-equipment-expense';
import { useUpdateBatchEquipmentExpense, useReorderEquipmentExpenses } from '../update-batch-equipment-expense';
import { equipmentExpenseCacheUtils } from '@/utils/equipment-cache-utils';
import type { EquipmentExpenseItem } from '@/app/types';

// Mock the RPC client
vi.mock('@repo/design-system/lib/rpc', () => ({
  client: {
    api: {
      expenses: {
        'equipment-costs': {
          $post: vi.fn(),
          $patch: vi.fn(),
          $put: vi.fn(),
          ':userId': {
            ':id': {
              $delete: vi.fn()
            }
          }
        }
      }
    }
  }
}));

// Mock translations
vi.mock('@/utils/translations', () => ({
  getTranslations: () => ({
    validation: {
      error: {
        'create-failed': 'Create failed',
        'update-failed': 'Update failed',
        'delete-failed': 'Delete failed'
      }
    }
  })
}));

// Mock cache utilities
vi.mock('@/utils/equipment-cache-utils', () => ({
  equipmentExpenseCacheUtils: {
    getCurrentItems: vi.fn(),
    validateEquipment: vi.fn(),
    addOptimisticEquipment: vi.fn(),
    replaceAllItems: vi.fn(),
    replaceOptimisticEquipment: vi.fn(),
    getEquipment: vi.fn(),
    updateItem: vi.fn(),
    reorderItems: vi.fn(),
    batchUpdateEquipment: vi.fn()
  },
  equipmentRankUtils: {
    removeAndAdjustRanks: vi.fn()
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockEquipment: EquipmentExpenseItem = {
  id: 1,
  name: 'Test Equipment',
  userId: 'user-123',
  rank: 1,
  amount: 1000,
  purchaseDate: new Date('2024-01-01'),
  usage: 100,
  lifeSpan: 12,
  category: 'computer',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

describe('Equipment Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCreateEquipmentExpense', () => {
    it('should use cache utilities for optimistic updates', async () => {
      const wrapper = createWrapper();
      const mockAddOptimistic = vi.mocked(equipmentExpenseCacheUtils.addOptimisticEquipment);
      const mockValidate = vi.mocked(equipmentExpenseCacheUtils.validateEquipment);
      const mockGetCurrentItems = vi.mocked(equipmentExpenseCacheUtils.getCurrentItems);

      mockValidate.mockReturnValue([]);
      mockGetCurrentItems.mockReturnValue([]);
      mockAddOptimistic.mockReturnValue({ ...mockEquipment, id: -1 });

      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['equipment-costs'].$post).mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          success: true,
          status: 201,
          data: mockEquipment
        })
      } as any);

      const { result } = renderHook(() => useCreateEquipmentExpense(), { wrapper });

      result.current.mutate({
        json: {
          userId: 'user-123',
          name: 'Test Equipment',
          amount: 1000,
          rank: 1,
          category: 'computer',
          purchaseDate: '2024-01-01',
          usage: 100,
          lifeSpan: 12
        }
      });

      await waitFor(() => {
        expect(mockValidate).toHaveBeenCalled();
        expect(mockAddOptimistic).toHaveBeenCalled();
      });
    });

    it('should rollback on error', async () => {
      const wrapper = createWrapper();
      const mockReplaceAll = vi.mocked(equipmentExpenseCacheUtils.replaceAllItems);
      const mockGetCurrentItems = vi.mocked(equipmentExpenseCacheUtils.getCurrentItems);
      const mockValidate = vi.mocked(equipmentExpenseCacheUtils.validateEquipment);

      mockValidate.mockReturnValue([]);
      mockGetCurrentItems.mockReturnValue([mockEquipment]);

      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['equipment-costs'].$post).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCreateEquipmentExpense(), { wrapper });

      result.current.mutate({
        json: {
          userId: 'user-123',
          name: 'Test Equipment',
          amount: 1000,
          rank: 1,
          category: 'computer',
          purchaseDate: '2024-01-01',
          usage: 100,
          lifeSpan: 12
        }
      });

      await waitFor(() => {
        expect(mockReplaceAll).toHaveBeenCalledWith(
          expect.anything(),
          'user-123',
          [mockEquipment]
        );
      });
    });
  });

  describe('useUpdateEquipmentExpense', () => {
    it('should use cache utilities for precise updates', async () => {
      const wrapper = createWrapper();
      const mockGetEquipment = vi.mocked(equipmentExpenseCacheUtils.getEquipment);
      const mockUpdateItem = vi.mocked(equipmentExpenseCacheUtils.updateItem);
      const mockValidate = vi.mocked(equipmentExpenseCacheUtils.validateEquipment);

      mockGetEquipment.mockReturnValue(mockEquipment);
      mockValidate.mockReturnValue([]);

      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['equipment-costs'].$patch).mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: { ...mockEquipment, name: 'Updated Equipment' }
        })
      } as any);

      const { result } = renderHook(() => useUpdateEquipmentExpense(), { wrapper });

      result.current.mutate({
        json: {
          id: 1,
          userId: 'user-123',
          name: 'Updated Equipment'
        }
      });

      await waitFor(() => {
        expect(mockGetEquipment).toHaveBeenCalledWith(expect.anything(), 'user-123', 1);
        expect(mockUpdateItem).toHaveBeenCalled();
      });
    });
  });

  describe('useDeleteEquipmentExpense', () => {
    it('should use cache utilities for optimistic deletion', async () => {
      const wrapper = createWrapper();
      const mockGetCurrentItems = vi.mocked(equipmentExpenseCacheUtils.getCurrentItems);
      const mockGetEquipment = vi.mocked(equipmentExpenseCacheUtils.getEquipment);
      const { equipmentRankUtils } = await import('@/utils/equipment-cache-utils');
      const mockRemoveAndAdjust = vi.mocked(equipmentRankUtils.removeAndAdjustRanks);

      mockGetCurrentItems.mockReturnValue([mockEquipment]);
      mockGetEquipment.mockReturnValue(mockEquipment);

      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['equipment-costs'][':userId'][':id'].$delete).mockResolvedValue({
        json: () => Promise.resolve({ success: true })
      } as any);

      const { result } = renderHook(() => useDeleteEquipmentExpense(), { wrapper });

      result.current.mutate({
        param: { userId: 'user-123', id: '1' }
      });

      await waitFor(() => {
        expect(mockGetEquipment).toHaveBeenCalledWith(expect.anything(), 'user-123', 1);
        expect(mockRemoveAndAdjust).toHaveBeenCalledWith(expect.anything(), 'user-123', 1);
      });
    });
  });

  describe('useUpdateBatchEquipmentExpense', () => {
    it('should handle batch updates with cache utilities', async () => {
      const wrapper = createWrapper();
      const mockGetCurrentItems = vi.mocked(equipmentExpenseCacheUtils.getCurrentItems);
      const mockBatchUpdate = vi.mocked(equipmentExpenseCacheUtils.batchUpdateEquipment);
      const mockValidate = vi.mocked(equipmentExpenseCacheUtils.validateEquipment);

      mockGetCurrentItems.mockReturnValue([mockEquipment]);
      mockValidate.mockReturnValue([]);

      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['equipment-costs'].$put).mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: [{ ...mockEquipment, name: 'Updated Equipment' }]
        })
      } as any);

      const { result } = renderHook(() => useUpdateBatchEquipmentExpense(), { wrapper });

      result.current.mutate({
        json: {
          userId: 'user-123',
          updates: [
            { id: 1, data: { name: 'Updated Equipment' } }
          ]
        }
      });

      await waitFor(() => {
        expect(mockBatchUpdate).toHaveBeenCalled();
      });
    });

    it('should handle reorder operations', async () => {
      const wrapper = createWrapper();
      const mockGetCurrentItems = vi.mocked(equipmentExpenseCacheUtils.getCurrentItems);
      const mockReorderItems = vi.mocked(equipmentExpenseCacheUtils.reorderItems);
      const mockValidate = vi.mocked(equipmentExpenseCacheUtils.validateEquipment);

      mockGetCurrentItems.mockReturnValue([mockEquipment]);
      mockValidate.mockReturnValue([]);

      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['equipment-costs'].$put).mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: [{ ...mockEquipment, rank: 2 }]
        })
      } as any);

      const { result } = renderHook(() => useUpdateBatchEquipmentExpense(), { wrapper });

      // Simulate reorder operation (all updates have rank changes)
      result.current.mutate({
        json: {
          userId: 'user-123',
          updates: [
            { id: 1, data: { rank: 2 } }
          ]
        }
      });

      await waitFor(() => {
        expect(mockReorderItems).toHaveBeenCalled();
      });
    });
  });

  describe('useReorderEquipmentExpenses', () => {
    it('should provide simplified reorder interface', async () => {
      const wrapper = createWrapper();
      const mockGetCurrentItems = vi.mocked(equipmentExpenseCacheUtils.getCurrentItems);
      const mockValidate = vi.mocked(equipmentExpenseCacheUtils.validateEquipment);

      mockGetCurrentItems.mockReturnValue([mockEquipment]);
      mockValidate.mockReturnValue([]);

      const { client } = await import('@repo/design-system/lib/rpc');
      vi.mocked(client.api.expenses['equipment-costs'].$put).mockResolvedValue({
        json: () => Promise.resolve({
          success: true,
          data: [{ ...mockEquipment, rank: 1 }]
        })
      } as any);

      const { result } = renderHook(() => useReorderEquipmentExpenses(), { wrapper });

      result.current.reorderEquipment('user-123', [mockEquipment]);

      await waitFor(() => {
        expect(client.api.expenses['equipment-costs'].$put).toHaveBeenCalledWith({
          json: {
            userId: 'user-123',
            updates: [{ id: 1, data: { rank: 1 } }]
          }
        });
      });
    });
  });
});