import type { EquipmentExpenseItem } from "@/app/types";
import { formatCurrency } from "@/utils/format-currency";
import type { EquipmentExpense } from "./types";

/**
 * Currency formatting options interface
 */
interface CurrencyFormatOptions {
  currency: string;
  decimals?: number;
}

/**
 * Transforms equipment expense item to table display format
 * Calculates monthly and yearly costs based on equipment depreciation
 *
 * @param item - Equipment expense item from the database
 * @param getCategoryLabel - Function to get category display label
 * @param getCategoryColor - Function to get category color class
 * @param currencyOptions - Currency formatting options
 * @returns Transformed equipment expense for table display
 */
export const transformEquipmentForTable = (
  item: EquipmentExpenseItem,
  getCategoryLabel: (category: string) => string,
  getCategoryColor: (category: string) => string,
  currencyOptions: CurrencyFormatOptions
): EquipmentExpense => {
  // Calculate monthly cost: (total cost / lifespan in months)
  const monthlyAmount = item.lifeSpan > 0 ? item.amount / item.lifeSpan : 0;

  // Calculate yearly cost: monthly cost * 12
  const yearlyAmount = monthlyAmount * 12;

  return {
    id: item.id,
    userId: item.userId,
    rank: item.rank,
    name: item.name,
    amountPerMonth: formatCurrency(monthlyAmount, {
      currency: currencyOptions.currency,
      decimals: currencyOptions.decimals ?? 2,
    }),
    amountPerYear: formatCurrency(yearlyAmount, {
      currency: currencyOptions.currency,
      decimals: currencyOptions.decimals ?? 2,
    }),
    category: item.category,
    categoryLabel: getCategoryLabel(item.category),
    categoryColor: getCategoryColor(item.category),
    purchaseDate: item.purchaseDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    usage: item.usage,
    lifeSpan: item.lifeSpan,
  };
};

/**
 * Transforms array of equipment expense items to table format
 *
 * @param items - Array of equipment expense items
 * @param getCategoryLabel - Function to get category display label
 * @param getCategoryColor - Function to get category color class
 * @param currencyOptions - Currency formatting options
 * @returns Array of transformed equipment expenses for table display
 */
export const transformEquipmentArrayForTable = (
  items: EquipmentExpenseItem[],
  getCategoryLabel: (category: string) => string,
  getCategoryColor: (category: string) => string,
  currencyOptions: CurrencyFormatOptions
): EquipmentExpense[] => {
  return items.map(item =>
    transformEquipmentForTable(item, getCategoryLabel, getCategoryColor, currencyOptions)
  );
};

/**
 * Calculates monthly cost from equipment expense data
 *
 * @param amount - Total equipment cost
 * @param lifeSpan - Equipment lifespan in months
 * @returns Monthly depreciation cost
 */
export const calculateMonthlyCost = (amount: number, lifeSpan: number): number => {
  if (lifeSpan <= 0) return 0;
  return amount / lifeSpan;
};

/**
 * Calculates yearly cost from monthly cost
 *
 * @param monthlyAmount - Monthly cost amount
 * @returns Yearly cost amount
 */
export const calculateYearlyCost = (monthlyAmount: number): number => {
  return monthlyAmount * 12;
};

/**
 * Calculates total equipment cost from monthly amount and lifespan
 * Used when user enters monthly amount and we need to derive total cost
 *
 * @param monthlyAmount - Monthly depreciation amount
 * @param lifeSpan - Equipment lifespan in months
 * @returns Total equipment cost
 */
export const calculateTotalCostFromMonthly = (monthlyAmount: number, lifeSpan: number): number => {
  return monthlyAmount * lifeSpan;
};

/**
 * Validates equipment expense form data
 *
 * @param data - Form data to validate
 * @returns Validation result with errors
 */
export const validateEquipmentFormData = (data: {
  name?: string;
  category?: string;
  amountPerMonth?: string | number;
  lifeSpan?: number;
  usage?: number;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push("Name is required");
  }

  if (!data.category || data.category.trim().length === 0) {
    errors.push("Category is required");
  }

  const monthlyAmount = typeof data.amountPerMonth === 'string'
    ? parseFloat(data.amountPerMonth.replace(/[^0-9.-]/g, ''))
    : data.amountPerMonth;

  if (!monthlyAmount || isNaN(monthlyAmount) || monthlyAmount <= 0) {
    errors.push("Valid monthly amount is required");
  }

  if (!data.lifeSpan || data.lifeSpan <= 0) {
    errors.push("Valid lifespan is required");
  }

  if (data.usage !== undefined && (data.usage < 0 || data.usage > 100)) {
    errors.push("Usage must be between 0 and 100");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};