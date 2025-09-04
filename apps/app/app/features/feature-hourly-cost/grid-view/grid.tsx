import { MasonryGrid } from "@repo/design-system/components/ui/masonry-grid";
import { useMemo } from "react";

import { useCurrencyStore } from "@/app/store/currency-store";
import type { ExpenseItem } from "@/app/types";
import { ItemCard } from "@repo/design-system/components/ui/item-card";
import { cn } from "@repo/design-system/lib/utils";
import { AddCard } from "../add-expense-card";
import { EditExpenseForm } from "../edit-expense-form";
import { EmptyView } from "./empty-view";

type GridViewProps = {
  data: ExpenseItem[];
  getCategoryColor: (id: string) => string;
  getCategoryLabel: (id: string) => string;
  getCategoryIcon: (id: string) => string;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onEditClose: () => void;
  onAddBetween?: (index: number) => void;
  loading?: boolean;
  editingId: number | null;
  userId: string;
};

export const Grid = ({
  data,
  getCategoryColor,
  getCategoryLabel,
  getCategoryIcon,
  loading = false,
  onEdit,
  onDelete,
  onEditClose,
  editingId,
  userId,
}: GridViewProps) => {
  const { t } = useTranslations();
  const { selectedCurrency } = useCurrencyStore();
  // const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxValue = useMemo(
    () => Math.max(...data.map((item) => item.amount)),
    [data]
  );
  return data && data.length === 0 ? (
    <EmptyView userId={userId} />
  ) : (
    <MasonryGrid>
      {data.map((expense, index) => {
        const isLarge = expense.amount > maxValue * 0.4;

        return (
          <div
            key={expense.id + expense.rank}
            className={cn(
              'relative h-[320px] min-h-[300px]',
              '/ isLarge"co320pxn-min-2"300px'
            )}
            style={{
              width: "100%",
            }}
          >
            <ItemCard
              data={{
                ...expense,
                currency: selectedCurrency.symbol + " ",
                period:
                  expense.period === "monthly"
                    ? t("common.period.monthly")
                    : t("common.period.yearly"),
                color: getCategoryColor(expense.category),
                categoryLabel: getCategoryLabel(expense.category),
                categoryIcon: getCategoryIcon(expense.category),
              }}
              loading={loading}
              className='h-full w-full'
              actionDeleteLabel={t("common.delete")}
              actionEditLabel={t("common.edit")}
              onDelete={() => onDelete(expense.id)}
              onEdit={() => onEdit(expense.id)}
              isEditMode={editingId === expense.id}
              editModeContent={
                <EditExpenseForm
                  onClose={onEditClose}
                  userId={userId}
                  expenseId={expense.id}
                  rankIndex={expense.rank ?? 0}
                  defaultValues={{
                    name: expense.name,
                    category: {
                      value: expense.category,
                      label: getCategoryLabel(expense.category),
                    },
                    amount: expense.amount,
                    period: expense.period,
                  }}
                />
              }
            />
          </div>
        );
      })}

      <AddCard
        className="h-[320px]"
        userId={userId}
        rankIndex={data.length + 1}
      />
    </MasonryGrid>
  );
};
