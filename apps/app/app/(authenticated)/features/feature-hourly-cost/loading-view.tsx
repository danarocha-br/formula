import { MasonryGrid } from "@repo/design-system/components/ui/masonry-grid";

import { ItemCard } from "@repo/design-system/components/ui/item-card";

export const EmptyView = () => {
  return (
    <div className="p-6 mb-10 relative">
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
  );
};
