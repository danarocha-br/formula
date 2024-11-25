import { AddCard } from './add-equipment-expense-card';

export const EmptyView = ({ userId }: { userId: string }) => {
  return (
    <div className="p-6 relative min-h-dvh">
      <section className="w-full text-card-foreground grid gap-2 @[380px]:grid-cols-1 @[800px]:grid-cols-2 @[1200px]:grid-cols-3">
        {Array.from({ length: 6 }).map((_, columnIndex: number) => (
          <AddCard
            key={columnIndex}
            highlight={columnIndex === 0}
            userId={userId}
            rankIndex={1}
          />
        ))}
      </section>
    </div>
  );
};
