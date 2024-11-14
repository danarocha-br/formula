import { ExpenseItem } from "@/app/types";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { formatCurrency } from "@/utils/format-currency";
import { useCurrencyStore } from "@/app/store/currency-store";

type TableViewProps = {
  data: ExpenseItem[];
  getCategoryColor: (id: string) => string;
  getCategoryLabel: (id: string) => string;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onEditClose: () => void;
  loading?: boolean;
  editingId: number | null;
  userId: string;
};

export const TableView = ({
  data,
  getCategoryColor,
  getCategoryLabel,
  loading = false,
  onEdit,
  onDelete,
  onEditClose,
  editingId,
  userId,
}: TableViewProps) => {
  const { selectedCurrency } = useCurrencyStore();
  const dataTable = data
    ? data.map((item) => ({
        id: item.id,
        rank: item.rank,
        name: item.name,
        amountPerMonth:
          item.period === "monthly"
            ? formatCurrency(item.amount, {
                currency: selectedCurrency.code,
              })
            : formatCurrency(item.amount / 12, {
                currency: selectedCurrency.code,
              }),
        amountPerYear:
          item.period === "yearly"
            ? formatCurrency(item.amount, {
                currency: selectedCurrency.code,
              })
            : formatCurrency(item.amount * 12, {
                currency: selectedCurrency.code,
              }),
        category: item.category,
        categoryLabel: getCategoryLabel(item.category),
        categoryColor: getCategoryColor(item.category),
      }))
    : [];
  return (
    <div className="pt-8">
      <DataTable columns={columns} data={dataTable} />
    </div>
  );
};
