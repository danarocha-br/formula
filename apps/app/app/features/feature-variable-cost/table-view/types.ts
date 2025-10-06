import type { EquipmentExpenseItem, EquipmentCategory } from "@/app/types";

/**
 * Equipment expense data model for table display
 * Represents a single row in the equipment cost table
 */
export type EquipmentExpense = {
  id: number | string;
  userId: string;
  rank: number;
  name: string;
  amountPerMonth: string;
  amountPerYear: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
  purchaseDate: string;
  usage: number;
  lifeSpan: number;
  originalAmount: number;
  isNewRow?: boolean;
};

/**
 * New equipment expense data model for creating new rows
 * Uses string ID for temporary rows before server creation
 */
export type NewEquipmentExpense = Omit<EquipmentExpense, "id" | "userId" | "rank"> & {
  id: string;
  userId: string;
  rank: number;
};

/**
 * Form data structure for new equipment expenses
 * Used for form validation and submission
 */
export type NewEquipmentFormData = {
  name: string;
  category: string;
  amountPerMonth: string | number;
  amountPerYear: number;
  purchaseDate: string;
  usage: number;
  lifeSpan: number;
};

/**
 * Form field types for new equipment expenses
 * Used for type-safe form field handling
 */
export type NewEquipmentFields =
  | "name"
  | "category"
  | "amountPerMonth"
  | "purchaseDate"
  | "usage"
  | "lifeSpan";

/**
 * Equipment category option for dropdowns
 * Includes visual representation slot
 */
export type EquipmentCategoryOption = {
  label: string;
  value: string;
  slot: React.ReactNode;
};