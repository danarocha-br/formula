import { MasonryGrid } from "@repo/design-system/components/ui/masonry-grid";

import { AddCard } from "./add-expense-card";

export const EmptyView = () => {
  return (
    <div className="p-6 mb-10 relative">
      <MasonryGrid>
        {Array.from({ length: 9 }).map((_, columnIndex: number) => (
          <AddCard
            key={columnIndex}
            highlight={columnIndex === 0}
            onClick={() => {}}
          />
        ))}

      </MasonryGrid>
    </div>
  );
};
