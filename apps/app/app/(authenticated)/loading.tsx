import { MasonryGrid } from "@repo/design-system/components/ui/masonry-grid";

import { ItemCard } from "@repo/design-system/components/ui/item-card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";

export default function LoadingView() {
  return (
    <div className="flex gap-2 w-full relative rounded-lg min-h-[calc(100vh-4.2rem)]">
      <div className="p-6 bg-purple-300 w-2/3 rounded-lg">
        <MasonryGrid>
          {Array.from({ length: 9 }).map((_, columnIndex: number) => (
            <ItemCard
              key={columnIndex}
              loading
              data={{ id: columnIndex, name: "", amount: 0, category: "" }}
            />
          ))}
        </MasonryGrid>
      </div>

      <div className="p-6 flex flex-col gap-6 bg-neutral-50 w-1/3 rounded-lg">
        <div className="flex flex-col gap-2">
          <Skeleton className="w-full h-12" />
          <Skeleton className="w-2/3 h-4" />
          <Skeleton className="w-1/3 h-4" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ItemCard
            loading
            data={{ id: 1, name: "", amount: 0, category: "" }}
          />
          <ItemCard
            loading
            data={{ id: 2, name: "", amount: 0, category: "" }}
          />
          <ItemCard
            loading
            data={{ id: 3, name: "", amount: 0, category: "" }}
          />
          <ItemCard
            loading
            data={{ id: 4, name: "", amount: 0, category: "" }}
          />
        </div>
      </div>
    </div>
  );
}
