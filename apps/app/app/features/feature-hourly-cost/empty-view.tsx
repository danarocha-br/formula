import { MasonryGrid } from "@repo/design-system/components/ui/masonry-grid";

import { AddCard } from "./add-expense-card";

export const EmptyView = ({ userId }: { userId: string }) => {
  return (
    <div className="p-6 relative h-dvh">
      <MasonryGrid>
        {Array.from({ length: 9 }).map((_, columnIndex: number) => (
          <AddCard
            key={columnIndex}
            highlight={columnIndex === 0}
            userId={userId}
            rankIndex={0}
          />
        ))}
      </MasonryGrid>
    </div>
  );
};
