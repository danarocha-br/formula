"use client";

import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { EquipmentCard } from "@repo/design-system/components/ui/equipment-card";
import { useCallback, useMemo, useState } from "react";
import { AddCard } from "../add-equipment-expense-card";

import { useCurrencyStore } from "@/app/store/currency-store";
import { useViewPreferenceStore } from "@/app/store/view-preference-store";
import type { EquipmentExpenseItem } from "@/app/types";
import { useTranslations } from "@/hooks/use-translation";
import { useStableEquipment } from "@/hooks/use-stable-equipment";
import { formatCurrency } from "@/utils/format-currency";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { MasonryGrid } from "@repo/design-system/components/ui/masonry-grid";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { LoadingView } from "../../feature-hourly-cost/loading-view";
import { EmptyView } from "../empty-view";
import { useDeleteEquipmentExpense } from "../server/delete-equipment-expense";
import { useReorderEquipmentExpenses } from "../server/update-batch-equipment-expense";
import { equipmentDragDropUtils } from "@/utils/equipment-cache-utils";
import { useQueryClient } from "@tanstack/react-query";
import { EditEquipmentExpenseForm } from "../edit-equipment-expense-form";

type GridViewProps = {
  userId: string;
};

export const GridView = ({ userId }: GridViewProps) => {
  const queryClient = useQueryClient();
  const { equipment, isLoading: isLoadingExpenses } = useStableEquipment({
    userId,
  });
  const { mutate: deleteExpense } = useDeleteEquipmentExpense();
  const { reorderEquipment } = useReorderEquipmentExpenses();

  const { t } = useTranslations();
  const { toast } = useToast();
  const { selectedCurrency } = useCurrencyStore();
  const { viewPreference } = useViewPreferenceStore();

  const [activeCard, setActiveCard] = useState<EquipmentExpenseItem | null>(
    null
  );
  const [editingEquipment, setEditingEquipment] =
    useState<EquipmentExpenseItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  // Memoize card IDs to prevent unnecessary re-renders
  const cardsId = useMemo(() => equipment.map((item) => item.id), [equipment]);

  // Memoize delete handler to prevent unnecessary re-renders
  const handleDelete = useCallback(
    (id: number) => {
      deleteExpense(
        { param: { id: id.toString(), userId } },
        {
          onError: (error) => {
            console.error("Failed to delete equipment expense:", error);
            toast({
              title: t(
                "validation.error.delete-failed",
                "Failed to delete equipment expense"
              ),
              variant: "destructive",
            });
          },
        }
      );
    },
    [deleteExpense, userId, t, toast]
  );

  // Memoize edit handler to prevent unnecessary re-renders
  const handleEdit = useCallback((equipmentItem: EquipmentExpenseItem) => {
    setEditingEquipment(equipmentItem);
  }, []);

  // Memoize edit cancel handler
  const handleEditCancel = useCallback(() => {
    setEditingEquipment(null);
  }, []);

  // Memoize edit success handler
  const handleEditSuccess = useCallback(() => {
    setEditingEquipment(null);
  }, []);

  // Optimized drag start handler using cache utilities
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;

      if (active.data.current?.type === "card") {
        const draggedItem = equipmentDragDropUtils.handleDragStart(
          queryClient,
          userId,
          active.id as number
        );
        setActiveCard(draggedItem || null);
      }
    },
    [queryClient, userId]
  );

  // Optimized drag end handler using cache utilities
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Clear active card state
      setActiveCard(null);

      if (!over || active.id === over.id) {
        return;
      }

      const activeIndex = equipment.findIndex(
        (expense) => expense.id === active.id
      );
      const overIndex = equipment.findIndex(
        (expense) => expense.id === over.id
      );

      // Validate indices
      if (activeIndex === -1 || overIndex === -1) {
        console.warn("Invalid drag operation: item not found", {
          activeId: active.id,
          overId: over.id,
        });
        return;
      }

      try {
        // Use cache utilities for optimistic drag reorder
        const previousItems = equipmentDragDropUtils.optimisticDragReorder(
          queryClient,
          userId,
          activeIndex,
          overIndex
        );

        // Create reordered array with updated ranks for server update
        const reorderedEquipment = [...equipment];
        const [draggedItem] = reorderedEquipment.splice(activeIndex, 1);
        reorderedEquipment.splice(overIndex, 0, draggedItem);

        // Update ranks to match new positions
        const equipmentWithUpdatedRanks = reorderedEquipment.map(
          (item, index) => ({
            ...item,
            rank: index + 1,
          })
        );

        // Use the reorder mutation to update server and cache
        reorderEquipment(userId, equipmentWithUpdatedRanks);
      } catch (error) {
        console.error("Drag and drop operation failed:", error);
        toast({
          title: t(
            "validation.error.reorder-failed",
            "Failed to reorder equipment"
          ),
          variant: "destructive",
        });
      }
    },
    [equipment, queryClient, userId, reorderEquipment, t, toast]
  );

  // Memoize equipment card data to prevent unnecessary re-renders
  const equipmentCardData = useMemo(
    () =>
      equipment.map((expense) => ({
        key: expense.id,
        id: expense.id,
        expense,
        isEditing: editingEquipment?.id === expense.id,
        data: {
          name: expense.name,
          categoryIcon: expense.category,
          color: expense.category,
          purchaseDate:
            expense.purchaseDate instanceof Date
              ? expense.purchaseDate.toISOString()
              : expense.purchaseDate,
          id: expense.id,
          lifeSpan: `${t("forms.equipment.lifespan", "Lifespan")}: ${expense.lifeSpan} ${t("common.period.months", "months")}`,
          isEmpty: false,
          usage: `${expense.usage} h/month`,
          usageLabel: t("forms.equipment.usageLabel", "Usage"),
          usagePercent: expense.usage,
          totalCost: formatCurrency(expense.amount, {
            currency: selectedCurrency.code,
          }),
          totalLabel: t("forms.equipment.totalCost", "Total cost"),
          hourlyLabel: t("forms.equipment.hourlyCost", "Hourly cost"),
          hourlyCost: formatCurrency(
            expense.amount / expense.lifeSpan / expense.usage,
            {
              currency: selectedCurrency.code,
            }
          ),
        },
      })),
    [equipment, t, selectedCurrency.code, editingEquipment?.id]
  );

  return (
    <ScrollArea.Root className="h-[calc(100vh-7.7rem)]">
      {isLoadingExpenses ? (
        <LoadingView />
      ) : (
        <section className="container relative">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="w-full">
              <SortableContext items={cardsId}>
                {equipment &&
                viewPreference === "grid" &&
                equipment.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {equipmentCardData.map((cardData) => (
                      <div
                        key={cardData.key}
                        className="relative h-[320px] min-h-[300px]"
                        style={{ width: "100%" }}
                      >
                        <EquipmentCard
                          data={cardData.data}
                          loading={isLoadingExpenses}
                          onEdit={() => handleEdit(cardData.expense)}
                          onDelete={() => handleDelete(cardData.id)}
                          isEditMode={cardData.isEditing}
                          editModeContent={
                            cardData.isEditing ? (
                              <EditEquipmentExpenseForm
                                equipment={cardData.expense}
                                onCancel={handleEditCancel}
                                onSuccess={handleEditSuccess}
                              />
                            ) : undefined
                          }
                          className="h-full w-full"
                        />
                      </div>
                    ))}
                    <div
                      className="relative h-[320px] min-h-[300px]"
                      style={{ width: "100%" }}
                    >
                      <AddCard
                        userId={userId}
                        rankIndex={equipment.length + 1}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                ) : (
                  <EmptyView userId={userId} />
                )}
              </SortableContext>
            </div>
          </DndContext>
        </section>
      )}
    </ScrollArea.Root>
  );
};
