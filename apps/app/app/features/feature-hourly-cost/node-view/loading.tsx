import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import React from "react";

export const LoadingNodeView: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 w-full bg-background min-h-screen rounded-lg px-4 lg:px-10 py-10 lg:py-20">
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className="space-y-2 col-span-2 bg-card/10 rounded-md p-3 w-full h-32"
        >
          <Skeleton className="w-1/3 h-4" />
          <Skeleton className="w-full h-4" />
        </div>
      ))}
    </div>
  );
};
