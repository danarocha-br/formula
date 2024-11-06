"use client";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ItemCard } from "@repo/design-system/components/ui/item-card";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { Resizable } from "@repo/design-system/components/ui/resizable-panel";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";
import dynamic from "next/dynamic";

import { ExpenseItem } from "@/types";
import { Icon } from "@repo/design-system/components/ui/icon";
import { EmptyView } from "./empty-view";
import { MasonryGrid } from "@repo/design-system/components/ui/masonry-grid";

type Props = {
  expenses: ExpenseItem[];
};

const DragOverlayWrapper = dynamic(
  () =>
    Promise.resolve(({ activeCard }: { activeCard: ExpenseItem | null }) =>
      createPortal(
        <DragOverlay>
          {activeCard && (
            <div
              style={{
                transform: "scale(1.05)",
                cursor: "grabbing",
              }}
            >
              <ItemCard data={activeCard} />
            </div>
          )}
        </DragOverlay>,
        document.body
      )
    ),
  { ssr: false }
);

export const FeatureHourlyCost = ({ expenses: initialExpenses }: Props) => {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [activeCard, setActiveCard] = useState<ExpenseItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const maxValue = Math.max(...expenses.map((item) => item.value));

  const cardsId = useMemo(() => expenses.map((item) => item.id), [expenses]);

  const totalValue = useMemo(
    () => expenses.reduce((sum, item) => sum + item.value, 0),
    [expenses]
  );

  function onDragStart(event: DragStartEvent) {
    const { active } = event;

    if (active.data.current?.type === "card") {
      setActiveCard(active.data.current.data);
      return;
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;
    if (active.id === over.id) return;

    setExpenses((expenses) => {
      const activeIndex = expenses.findIndex(
        (expense) => expense.id === active.id
      );
      const overIndex = expenses.findIndex((expense) => expense.id === over.id);

      return arrayMove(expenses, activeIndex, overIndex);
    });
  }

  return (
    <Resizable.Group direction="horizontal">
      <Resizable.Panel defaultSize={60} className="hidden md:block">
        <ScrollArea.Root className="w-full h-[calc(100vh-70px)] rounded-b-lg">
          <div className="bg-purple-300 text-card-foreground rounded-lg @container">
            <EmptyView />

            {/* <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="bg-purple-300 text-card-foreground rounded-lg @container">
              <section className="h-full relative">
                <div className="p-2 w-full">
                  <SortableContext items={cardsId}>
                    <MasonryGrid>
                      {expenses.map((expense) => {
                        const isLarge = expense.value > maxValue * 0.4;

                        return (
                          <div
                            key={expense.id}
                            className="relative"
                            style={{
                              height: isLarge ? "300px" : "200px",
                              width: "100%",
                            }}
                          >
                            <ItemCard
                              data={expense}
                              className="w-full h-full"
                              // style={{
                              //   position: "absolute",
                              //   inset: 0,
                              // }}
                            />
                          </div>
                        );
                      })}
                    </MasonryGrid>
                  </SortableContext>
                </div>

                <div className="sticky mt-auto bottom-0 flex items-center justify-between w-full rounded-br-md rounded-tl-md col-span-full bg-purple-200 h-14 opacity-95">
                  <div className="h-full flex">
                    <button className="text-card-foreground flex items-center gap-2 bg-purple-100 h-full pl-4 pr-6 text-sm rounded-t-lg">
                      <Icon
                        name="work"
                        size="sm"
                        label="fixed costs"
                        color="current"
                      />
                      Fixed costs
                    </button>
                    <button className="text-card-foreground flex items-center gap-2 bg-purple-200 h-full pl-4 pr-6 text-sm rounded-t-lg">
                      <Icon
                        name="work"
                        size="sm"
                        label="fixed costs"
                        color="current"
                      />
                      Variable costs
                    </button>
                    <button className="text-card-foreground flex items-center gap-2 bg-purple-200 h-full pl-4 pr-6 text-sm rounded-t-lg">
                      <Icon
                        name="work"
                        size="sm"
                        label="fixed costs"
                        color="current"
                      />
                      Equipment costs
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <DragOverlayWrapper activeCard={activeCard} />
          </DndContext> */}

            <div className="sticky bottom-0 flex items-center justify-between w-full rounded-br-md rounded-tl-md col-span-full bg-purple-200 h-14 opacity-95">
              <div className="h-full flex">
                <button className="text-card-foreground flex items-center gap-2 bg-purple-100 h-full pl-4 pr-6 text-sm rounded-t-lg">
                  <Icon
                    name="work"
                    size="sm"
                    label="fixed costs"
                    color="current"
                  />
                  Fixed costs
                </button>
                <button className="text-card-foreground flex items-center gap-2 bg-purple-200 h-full pl-4 pr-6 text-sm rounded-t-lg">
                  <Icon
                    name="work"
                    size="sm"
                    label="fixed costs"
                    color="current"
                  />
                  Variable costs
                </button>
                <button className="text-card-foreground flex items-center gap-2 bg-purple-200 h-full pl-4 pr-6 text-sm rounded-t-lg">
                  <Icon
                    name="work"
                    size="sm"
                    label="fixed costs"
                    color="current"
                  />
                  Equipment costs
                </button>
              </div>
            </div>
          </div>
        </ScrollArea.Root>
      </Resizable.Panel>

      <Resizable.Handle withHandle />

      <Resizable.Panel defaultSize={40}>
        <section className="bg-neutral-100 text-card-foreground rounded-lg relative flex flex-col justify-between @container">
          <ScrollArea.Root className="w-full h-[calc(100vh-70px)] rounded-b-lg">
            {/* <BillableCosts /> */}

            <div className="sticky bottom-0 mt-auto flex items-center justify-between w-full rounded-b-md h-14 px-5 py-4 bg-purple-200 opacity-95">
              <p>Your total expenses are </p>
              <span className="text-2xl font-semibold">
                ${totalValue.toFixed(2)}
              </span>
            </div>
          </ScrollArea.Root>
        </section>
      </Resizable.Panel>
    </Resizable.Group>
  );
};
