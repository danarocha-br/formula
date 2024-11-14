"use client";

import { Badge } from '@repo/design-system/components/ui/badge';
import { Icon } from "@repo/design-system/components/ui/icon";
import { cn } from "@repo/design-system/lib/utils";
import { ColumnDef } from "@tanstack/react-table";

export type Expense = {
  id: number;
  rank: number;
  name: string;
  amountPerMonth: string;
  amountPerYear: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
};

export const columns: ColumnDef<Expense>[] = [
  {
    accessorKey: "rank",
    header: "Rank",
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      return (
        <div className="flex gap-3 items-center">
          {/* <span
            className={cn(
              "text-card-foreground flex items-center justify-center rounded-[12px] h-8 w-8 bg-opacity-50",
              row.getValue("categoryColor")
            )}
          >
            <Icon
              // @ts-ignore
              name={row.getValue("category")}
              label="category icon"
              size="lg"
              color="current"
              className="opacity-80"
            />
          </span> */}

          <Badge className={cn("capitalize bg-opacity-50 text-sm text-card-foreground hover:bg-transparent", row.getValue("categoryColor"), `hover:${row.getValue("categoryColor")}`)}>
            {row.getValue("categoryLabel")}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "amountPerMonth",
    header: "Monthly amount",
  },
  {
    accessorKey: "amountPerYear",
    header: "Yearly amount",
  },

  {
    accessorKey: "categoryLabel",
    header: "",
    enableHiding: true,
  },
  {
    accessorKey: "categoryColor",
    header: "",
    enableHiding: true,
  },
];
