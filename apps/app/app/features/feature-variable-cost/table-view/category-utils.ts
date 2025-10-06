import React from "react";
import { EQUIPMENT_COST_CATEGORIES } from "@/app/constants/equipment-cost-categories";
import { Icon, type iconPath } from "@repo/design-system/components/ui/icon";
import { cn } from "@repo/design-system/lib/utils";
import type { EquipmentCategoryOption } from "./types";

/**
 * Gets the display label for an equipment category
 *
 * @param categoryValue - The category value (e.g., "computer", "monitor")
 * @returns The display label for the category
 */
export const getCategoryLabel = (categoryValue: string): string => {
  const category = EQUIPMENT_COST_CATEGORIES.find(cat => cat.value === categoryValue);
  return category?.label || categoryValue;
};

/**
 * Gets the color class for an equipment category
 *
 * @param categoryValue - The category value (e.g., "computer", "monitor")
 * @returns The CSS color class for the category
 */
export const getCategoryColor = (categoryValue: string): string => {
  const category = EQUIPMENT_COST_CATEGORIES.find(cat => cat.value === categoryValue);
  return category?.color || "bg-gray-300";
};

/**
 * Gets the icon name for an equipment category
 *
 * @param categoryValue - The category value (e.g., "computer", "monitor")
 * @returns The icon name for the category
 */
export const getCategoryIcon = (categoryValue: string): keyof typeof iconPath => {
  const category = EQUIPMENT_COST_CATEGORIES.find(cat => cat.value === categoryValue);
  return (category?.icon as keyof typeof iconPath) || "other";
};

/**
 * Creates equipment category options for dropdown components
 * Includes visual representation with icon and color
 *
 * @returns Array of category options with visual slots
 */
export const createEquipmentCategoryOptions = (): EquipmentCategoryOption[] => {
  return EQUIPMENT_COST_CATEGORIES.map((category) => ({
    label: category.label,
    value: category.value,
    slot: React.createElement(
      'div',
      {
        className: cn(
          'flex h-7 w-7 items-center justify-center rounded-[4px] bg-opacity-60 p-1',
          category.color
        )
      },
      React.createElement(Icon, {
        name: category.icon as keyof typeof iconPath,
        label: category.label,
        color: "body"
      })
    ),
  }));
};

/**
 * Creates a single category option for a specific category value
 * Used for default values in form controls
 *
 * @param categoryValue - The category value to create option for
 * @returns Category option with visual slot, or undefined if not found
 */
export const createCategoryOption = (categoryValue: string): EquipmentCategoryOption | undefined => {
  const category = EQUIPMENT_COST_CATEGORIES.find(cat => cat.value === categoryValue);

  if (!category) return undefined;

  return {
    label: category.label,
    value: category.value,
    slot: React.createElement(
      'div',
      {
        className: cn(
          'flex h-6 w-6 items-center justify-center rounded-[4px] p-1',
          category.color
        )
      },
      React.createElement(Icon, {
        name: category.icon as keyof typeof iconPath,
        label: category.label,
        color: "body"
      })
    ),
  };
};

/**
 * Gets all available equipment category values
 *
 * @returns Array of category values
 */
export const getEquipmentCategoryValues = (): string[] => {
  return EQUIPMENT_COST_CATEGORIES.map(category => category.value);
};

/**
 * Validates if a category value is valid
 *
 * @param categoryValue - The category value to validate
 * @returns True if the category is valid, false otherwise
 */
export const isValidEquipmentCategory = (categoryValue: string): boolean => {
  return EQUIPMENT_COST_CATEGORIES.some(category => category.value === categoryValue);
};