'use client';

import React from 'react';
import { parseCookies } from 'nookies';
import { EquipmentCard } from '@repo/design-system/components/ui/equipment-card';

import { useCurrencyStore } from '@/app/store/currency-store';
import { formatCurrency } from '@/utils/format-currency';
import { EquipmentExpenseItem } from '@/app/types';

type GridViewProps = {
  expenses: EquipmentExpenseItem[];
  setExpenses: React.Dispatch<React.SetStateAction<EquipmentExpenseItem[]>>;
  userId: string;
  loading?: boolean;
};

export const GridView = ({ expenses, setExpenses, userId, loading }: GridViewProps) => {
  const cookies = parseCookies();
  const locale = cookies.NEXT_LOCALE || navigator.language || "en";

  const { selectedCurrency } = useCurrencyStore();

  return (
    <div className="p-2 w-full text-card-foreground grid gap-2 @[380px]:grid-cols-1 @[800px]:grid-cols-2 @[1200px]:grid-cols-3">
      <EquipmentCard
        data={{
          name: "Macbook Pro 14",
          categoryIcon: "computer",
          color: "bg-froly-200",
          purchaseDate: new Date().toLocaleDateString(locale),
          id: 1,
          lifeSpan: "Lifespan: 32 months",
          isEmpty: false,
          usage: "32 h/month",
          usageLabel: "Usage",
          usagePercent: 32,
          totalCost: formatCurrency(1000, {
            currency: selectedCurrency.code,
          }),
          totalLabel: "Total cost",
          hourlyLabel: "Hourly cost",
          hourlyCost: formatCurrency(1000, {
            currency: selectedCurrency.code,
          }),
        }}
        loading={loading}
      />
    </div>
  );
};

