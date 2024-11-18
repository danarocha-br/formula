import React from "react";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";

type VariableCostViewProps = {
  userId: string;
};

export const VariableCostView = ({ userId }: VariableCostViewProps) => {
  return (
    <ScrollArea.Root className="h-[calc(100vh-7.7rem)]">
      <div className="w-full text-card-foreground @container">test</div>
    </ScrollArea.Root>
  );
};
