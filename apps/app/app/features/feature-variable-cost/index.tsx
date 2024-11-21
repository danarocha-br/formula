import React from "react";
import { parseCookies } from "nookies";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { EquipmentCard } from "@repo/design-system/components/ui/equipment-card";

import { cva } from "class-variance-authority";
import { cn } from "@repo/design-system/lib/utils";
import { useCurrencyStore } from "@/app/store/currency-store";
import { formatCurrency } from "@/utils/format-currency";

type VariableCostViewProps = {
  userId: string;
};

const card = cva([
  "text-card-foreground bg-card flex flex-col w-full h-full rounded-lg p-4",
]);

export const VariableCostView = ({ userId }: VariableCostViewProps) => {
  const cookies = parseCookies();
  const locale = cookies.NEXT_LOCALE || navigator.language || "en";

  const { selectedCurrency } = useCurrencyStore();
  return (
    <ScrollArea.Root className="h-[calc(100vh-7.7rem)] @container">
      <div className="p-2 w-full text-card-foreground grid gap-2 @[380px]:grid-cols-1 @[800px]:grid-cols-2 @[1200px]:grid-cols-3">
        <EquipmentCard
          data={{
            name: "Macbook Pro 14",
            category: "computer",
            categoryLabel: "Computer",
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
        />
      </div>
    </ScrollArea.Root>
  );
};
