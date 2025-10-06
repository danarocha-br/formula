/**
 * Example usage of equipment table view utilities
 * This file demonstrates how to use the data transformation and category utilities
 */

import React from 'react';
import type { EquipmentExpenseItem } from '@/app/types';
import { useCurrencyStore } from '@/app/store/currency-store';
import {
  transformEquipmentArrayForTable,
  getCategoryLabel,
  getCategoryColor,
  createEquipmentCategoryOptions,
  createCategoryOption,
} from './utils';

// Example component showing how to use the utilities
export const EquipmentTableExample: React.FC = () => {
  const { selectedCurrency } = useCurrencyStore();

  // Example equipment data
  const mockEquipmentData: EquipmentExpenseItem[] = [
    {
      id: 1,
      name: 'MacBook Pro',
      userId: 'user-123',
      rank: 1,
      amount: 2400,
      purchaseDate: new Date('2024-01-01'),
      usage: 80,
      lifeSpan: 24,
      category: 'computer',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Dell Monitor',
      userId: 'user-123',
      rank: 2,
      amount: 600,
      purchaseDate: new Date('2024-02-01'),
      usage: 90,
      lifeSpan: 36,
      category: 'monitor',
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z',
    },
  ];

  // Transform data for table display
  const tableData = transformEquipmentArrayForTable(
    mockEquipmentData,
    getCategoryLabel,
    getCategoryColor,
    {
      currency: selectedCurrency.code,
      decimals: 2,
    }
  );

  // Get category options for dropdowns
  const categoryOptions = createEquipmentCategoryOptions();

  // Get specific category option
  const computerCategoryOption = createCategoryOption('computer');

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Equipment Table Data Example</h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Transformed Table Data:</h3>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(tableData, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Category Options:</h3>
        <div className="grid grid-cols-2 gap-2">
          {categoryOptions.map((option) => (
            <div key={option.value} className="flex items-center gap-2 p-2 border rounded">
              {option.slot}
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Specific Category Option (Computer):</h3>
        {computerCategoryOption && (
          <div className="flex items-center gap-2 p-2 border rounded w-fit">
            {computerCategoryOption.slot}
            <span>{computerCategoryOption.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Example of how to use utilities in a form context
export const useEquipmentFormHelpers = () => {
  const { selectedCurrency } = useCurrencyStore();

  const transformForTable = (items: EquipmentExpenseItem[]) => {
    return transformEquipmentArrayForTable(
      items,
      getCategoryLabel,
      getCategoryColor,
      {
        currency: selectedCurrency.code,
        decimals: 2,
      }
    );
  };

  const getCategoryOptions = () => createEquipmentCategoryOptions();

  const getCategoryOptionByValue = (value: string) => createCategoryOption(value);

  return {
    transformForTable,
    getCategoryOptions,
    getCategoryOptionByValue,
    getCategoryLabel,
    getCategoryColor,
  };
};