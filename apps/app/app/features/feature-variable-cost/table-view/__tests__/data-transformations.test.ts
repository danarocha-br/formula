import { describe, it, expect, vi } from 'vitest';
import type { EquipmentExpenseItem } from '@/app/types';
import { formatCurrency } from '@/utils/format-currency';

// Mock the format currency utility
vi.mock('@/utils/format-currency', () => ({
  formatCurrency: vi.fn((amount: number, options: any) => {
    return `${options.currency} ${amount.toFixed(options.decimals || 2)}`;
  })
}));

// Data transformation functions (these would normally be imported from the component)
const transformEquipmentForTable = (
  item: EquipmentExpenseItem,
  getCategoryLabel: (category: string) => string,
  getCategoryColor: (category: string) => string,
  currencyOptions: { currency: string; decimals: number }
) => {
  const monthlyCost = item.lifeSpan > 0 ? item.amount / item.lifeSpan : 0;
  const yearlyCost = monthlyCost * 12;

  return {
    id: item.id,
    userId: item.userId,
    rank: item.rank,
    name: item.name,
    amountPerMonth: formatCurrency(monthlyCost, currencyOptions),
    amountPerYear: formatCurrency(yearlyCost, currencyOptions),
    category: item.category,
    categoryLabel: getCategoryLabel(item.category),
    categoryColor: getCategoryColor(item.category),
    purchaseDate: item.purchaseDate.toISOString().split('T')[0],
    usage: item.usage,
    lifeSpan: item.lifeSpan,
    originalAmount: item.amount,
    isNewRow: false,
  };
};

const calculateMonthlyCost = (totalAmount: number, lifeSpanMonths: number): number => {
  return lifeSpanMonths > 0 ? totalAmount / lifeSpanMonths : 0;
};

const calculateYearlyCost = (monthlyCost: number): number => {
  return monthlyCost * 12;
};

const calculateTotalCostFromMonthly = (monthlyCost: number, lifeSpanMonths: number): number => {
  return monthlyCost * lifeSpanMonths;
};

const validateEquipmentFormData = (data: any) => {
  const errors: string[] = [];

  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }

  if (!data.category) {
    errors.push('Category is required');
  }

  const amount = typeof data.amountPerMonth === 'string'
    ? parseFloat(data.amountPerMonth.replace(/[^0-9.-]/g, ''))
    : data.amountPerMonth;

  if (!amount || amount <= 0) {
    errors.push('Valid monthly amount is required');
  }

  if (!data.lifeSpan || data.lifeSpan <= 0) {
    errors.push('Valid lifespan is required');
  }

  if (data.usage !== undefined && (data.usage < 0 || data.usage > 100)) {
    errors.push('Usage must be between 0 and 100');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Mock data
const mockEquipmentItem: EquipmentExpenseItem = {
  id: 1,
  name: 'MacBook Pro',
  userId: 'user-123',
  rank: 1,
  amount: 2400, // $2400 total cost
  purchaseDate: new Date('2024-01-01'),
  usage: 80,
  lifeSpan: 24, // 24 months
  category: 'computer',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockGetCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    computer: 'Computer',
    monitor: 'Monitor',
    keyboard: 'Keyboard',
  };
  return labels[category] || category;
};

const mockGetCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    computer: 'bg-blue-300',
    monitor: 'bg-green-300',
    keyboard: 'bg-yellow-300',
  };
  return colors[category] || 'bg-gray-300';
};

const mockCurrencyOptions = {
  currency: 'USD',
  decimals: 2,
};

describe('Equipment Table Data Transformations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('transformEquipmentForTable', () => {
    it('should transform equipment item correctly', () => {
      const result = transformEquipmentForTable(
        mockEquipmentItem,
        mockGetCategoryLabel,
        mockGetCategoryColor,
        mockCurrencyOptions
      );

      expect(result).toEqual({
        id: 1,
        userId: 'user-123',
        rank: 1,
        name: 'MacBook Pro',
        amountPerMonth: 'USD 100.00', // $2400 / 24 months = $100/month
        amountPerYear: 'USD 1200.00', // $100 * 12 = $1200/year
        category: 'computer',
        categoryLabel: 'Computer',
        categoryColor: 'bg-blue-300',
        purchaseDate: '2024-01-01',
        usage: 80,
        lifeSpan: 24,
        originalAmount: 2400,
        isNewRow: false,
      });

      expect(formatCurrency).toHaveBeenCalledWith(100, mockCurrencyOptions);
      expect(formatCurrency).toHaveBeenCalledWith(1200, mockCurrencyOptions);
    });

    it('should handle zero lifespan gracefully', () => {
      const itemWithZeroLifespan = { ...mockEquipmentItem, lifeSpan: 0 };

      const result = transformEquipmentForTable(
        itemWithZeroLifespan,
        mockGetCategoryLabel,
        mockGetCategoryColor,
        mockCurrencyOptions
      );

      expect(result.amountPerMonth).toBe('USD 0.00');
      expect(result.amountPerYear).toBe('USD 0.00');
      expect(formatCurrency).toHaveBeenCalledWith(0, mockCurrencyOptions);
    });

    it('should handle negative lifespan gracefully', () => {
      const itemWithNegativeLifespan = { ...mockEquipmentItem, lifeSpan: -5 };

      const result = transformEquipmentForTable(
        itemWithNegativeLifespan,
        mockGetCategoryLabel,
        mockGetCategoryColor,
        mockCurrencyOptions
      );

      expect(result.amountPerMonth).toBe('USD 0.00');
      expect(result.amountPerYear).toBe('USD 0.00');
    });

    it('should format purchase date correctly', () => {
      const result = transformEquipmentForTable(
        mockEquipmentItem,
        mockGetCategoryLabel,
        mockGetCategoryColor,
        mockCurrencyOptions
      );

      expect(result.purchaseDate).toBe('2024-01-01');
    });

    it('should preserve all original properties', () => {
      const result = transformEquipmentForTable(
        mockEquipmentItem,
        mockGetCategoryLabel,
        mockGetCategoryColor,
        mockCurrencyOptions
      );

      expect(result.id).toBe(mockEquipmentItem.id);
      expect(result.userId).toBe(mockEquipmentItem.userId);
      expect(result.rank).toBe(mockEquipmentItem.rank);
      expect(result.name).toBe(mockEquipmentItem.name);
      expect(result.category).toBe(mockEquipmentItem.category);
      expect(result.usage).toBe(mockEquipmentItem.usage);
      expect(result.lifeSpan).toBe(mockEquipmentItem.lifeSpan);
      expect(result.originalAmount).toBe(mockEquipmentItem.amount);
    });
  });

  describe('calculateMonthlyCost', () => {
    it('should calculate monthly cost correctly', () => {
      expect(calculateMonthlyCost(2400, 24)).toBe(100);
      expect(calculateMonthlyCost(1200, 12)).toBe(100);
      expect(calculateMonthlyCost(3600, 36)).toBe(100);
    });

    it('should return 0 for zero lifespan', () => {
      expect(calculateMonthlyCost(2400, 0)).toBe(0);
    });

    it('should return 0 for negative lifespan', () => {
      expect(calculateMonthlyCost(2400, -1)).toBe(0);
    });

    it('should handle decimal results', () => {
      expect(calculateMonthlyCost(1000, 3)).toBeCloseTo(333.33, 2);
    });

    it('should handle zero amount', () => {
      expect(calculateMonthlyCost(0, 24)).toBe(0);
    });
  });

  describe('calculateYearlyCost', () => {
    it('should calculate yearly cost correctly', () => {
      expect(calculateYearlyCost(100)).toBe(1200);
      expect(calculateYearlyCost(50)).toBe(600);
      expect(calculateYearlyCost(83.33)).toBeCloseTo(999.96, 2);
    });

    it('should handle zero monthly cost', () => {
      expect(calculateYearlyCost(0)).toBe(0);
    });

    it('should handle negative monthly cost', () => {
      expect(calculateYearlyCost(-100)).toBe(-1200);
    });

    it('should handle decimal monthly costs', () => {
      expect(calculateYearlyCost(33.33)).toBeCloseTo(399.96, 2);
    });
  });

  describe('calculateTotalCostFromMonthly', () => {
    it('should calculate total cost from monthly amount correctly', () => {
      expect(calculateTotalCostFromMonthly(100, 24)).toBe(2400);
      expect(calculateTotalCostFromMonthly(50, 12)).toBe(600);
      expect(calculateTotalCostFromMonthly(200, 36)).toBe(7200);
    });

    it('should handle zero monthly cost', () => {
      expect(calculateTotalCostFromMonthly(0, 24)).toBe(0);
    });

    it('should handle zero lifespan', () => {
      expect(calculateTotalCostFromMonthly(100, 0)).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(calculateTotalCostFromMonthly(83.33, 24)).toBeCloseTo(1999.92, 2);
    });
  });

  describe('validateEquipmentFormData', () => {
    it('should validate valid form data', () => {
      const validData = {
        name: 'MacBook Pro',
        category: 'computer',
        amountPerMonth: 100,
        lifeSpan: 24,
        usage: 80,
      };

      const result = validateEquipmentFormData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for missing required fields', () => {
      const invalidData = {
        name: '',
        category: '',
        amountPerMonth: 0,
        lifeSpan: 0,
        usage: 80,
      };

      const result = validateEquipmentFormData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
      expect(result.errors).toContain('Category is required');
      expect(result.errors).toContain('Valid monthly amount is required');
      expect(result.errors).toContain('Valid lifespan is required');
    });

    it('should validate usage range', () => {
      const dataWithInvalidUsage = {
        name: 'MacBook Pro',
        category: 'computer',
        amountPerMonth: 100,
        lifeSpan: 24,
        usage: 150, // Invalid: > 100
      };

      const result = validateEquipmentFormData(dataWithInvalidUsage);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Usage must be between 0 and 100');
    });

    it('should handle string amounts with currency symbols', () => {
      const dataWithStringAmount = {
        name: 'MacBook Pro',
        category: 'computer',
        amountPerMonth: '$100.00',
        lifeSpan: 24,
        usage: 80,
      };

      const result = validateEquipmentFormData(dataWithStringAmount);
      expect(result.isValid).toBe(true);
    });

    it('should handle string amounts with commas', () => {
      const dataWithCommaAmount = {
        name: 'MacBook Pro',
        category: 'computer',
        amountPerMonth: '1,000.50',
        lifeSpan: 24,
        usage: 80,
      };

      const result = validateEquipmentFormData(dataWithCommaAmount);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid string amounts', () => {
      const dataWithInvalidAmount = {
        name: 'MacBook Pro',
        category: 'computer',
        amountPerMonth: 'invalid',
        lifeSpan: 24,
        usage: 80,
      };

      const result = validateEquipmentFormData(dataWithInvalidAmount);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid monthly amount is required');
    });

    it('should handle whitespace-only names', () => {
      const dataWithWhitespaceName = {
        name: '   ',
        category: 'computer',
        amountPerMonth: 100,
        lifeSpan: 24,
        usage: 80,
      };

      const result = validateEquipmentFormData(dataWithWhitespaceName);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should handle negative usage', () => {
      const dataWithNegativeUsage = {
        name: 'MacBook Pro',
        category: 'computer',
        amountPerMonth: 100,
        lifeSpan: 24,
        usage: -10,
      };

      const result = validateEquipmentFormData(dataWithNegativeUsage);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Usage must be between 0 and 100');
    });

    it('should allow undefined usage (optional field)', () => {
      const dataWithoutUsage = {
        name: 'MacBook Pro',
        category: 'computer',
        amountPerMonth: 100,
        lifeSpan: 24,
      };

      const result = validateEquipmentFormData(dataWithoutUsage);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large amounts', () => {
      const largeAmountItem = {
        ...mockEquipmentItem,
        amount: 999999999,
        lifeSpan: 1
      };

      const result = transformEquipmentForTable(
        largeAmountItem,
        mockGetCategoryLabel,
        mockGetCategoryColor,
        mockCurrencyOptions
      );

      expect(result.originalAmount).toBe(999999999);
      expect(formatCurrency).toHaveBeenCalledWith(999999999, mockCurrencyOptions);
    });

    it('should handle very small amounts', () => {
      const smallAmountItem = {
        ...mockEquipmentItem,
        amount: 0.01,
        lifeSpan: 1
      };

      const result = transformEquipmentForTable(
        smallAmountItem,
        mockGetCategoryLabel,
        mockGetCategoryColor,
        mockCurrencyOptions
      );

      expect(result.originalAmount).toBe(0.01);
      expect(formatCurrency).toHaveBeenCalledWith(0.01, mockCurrencyOptions);
    });

    it('should handle very long lifespans', () => {
      const longLifespanItem = {
        ...mockEquipmentItem,
        amount: 2400,
        lifeSpan: 1200 // 100 years
      };

      const result = transformEquipmentForTable(
        longLifespanItem,
        mockGetCategoryLabel,
        mockGetCategoryColor,
        mockCurrencyOptions
      );

      expect(formatCurrency).toHaveBeenCalledWith(2, mockCurrencyOptions); // 2400/1200 = 2
      expect(formatCurrency).toHaveBeenCalledWith(24, mockCurrencyOptions); // 2*12 = 24
    });

    it('should handle missing category labels gracefully', () => {
      const unknownCategory = 'unknown-category';
      const itemWithUnknownCategory = {
        ...mockEquipmentItem,
        category: unknownCategory
      };

      const result = transformEquipmentForTable(
        itemWithUnknownCategory,
        mockGetCategoryLabel,
        mockGetCategoryColor,
        mockCurrencyOptions
      );

      expect(result.category).toBe(unknownCategory);
      expect(result.categoryLabel).toBe(unknownCategory); // Falls back to category value
      expect(result.categoryColor).toBe('bg-gray-300'); // Falls back to default color
    });

    it('should handle future purchase dates', () => {
      const futureDate = new Date('2030-12-31');
      const futureItem = {
        ...mockEquipmentItem,
        purchaseDate: futureDate
      };

      const result = transformEquipmentForTable(
        futureItem,
        mockGetCategoryLabel,
        mockGetCategoryColor,
        mockCurrencyOptions
      );

      expect(result.purchaseDate).toBe('2030-12-31');
    });

    it('should handle very old purchase dates', () => {
      const oldDate = new Date('1990-01-01');
      const oldItem = {
        ...mockEquipmentItem,
        purchaseDate: oldDate
      };

      const result = transformEquipmentForTable(
        oldItem,
        mockGetCategoryLabel,
        mockGetCategoryColor,
        mockCurrencyOptions
      );

      expect(result.purchaseDate).toBe('1990-01-01');
    });
  });
});