import React from "react";
import { parseCookies } from "nookies";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { EquipmentCard } from "@repo/design-system/components/ui/equipment-card";

import { cva } from "class-variance-authority";
import { cn } from "@repo/design-system/lib/utils";
import { useCurrencyStore } from "@/app/store/currency-store";
import { formatCurrency } from "@/utils/format-currency";
import { GridView } from './grid-view';

type VariableCostViewProps = {
  userId: string;
};

const card = cva([
  "text-card-foreground bg-card flex flex-col w-full h-full rounded-lg p-4",
]);

export const VariableCostView = ({ userId }: VariableCostViewProps) => {

  return (
    <ScrollArea.Root className="h-[calc(100vh-7.7rem)] @container">
      <GridView expenses={[]} setExpenses={() => {}} userId={userId} loading={false} />
    </ScrollArea.Root>
  );
};
