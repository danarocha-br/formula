"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  TableSkeleton,
  BackgroundRefetchIndicator
} from "@repo/design-system/components/ui/query-loading-states";
import { cn } from "@repo/design-system/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  hasNewRows?: boolean;
  isLoading?: boolean;
  isRefetching?: boolean;
  error?: Error | null;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  hasNewRows = false,
  isLoading = false,
  isRefetching = false,
  error = null,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    enableRowSelection: true,
    getRowId: (row: any) => String(row.id),
    defaultColumn: {
      minSize: 50,
      size: 200,
    },
    state: {
      columnVisibility: {
        categoryLabel: false,
        categoryColor: false,
        // Hide additional columns on mobile for better UX
        purchaseDate: hasNewRows,
        usage: hasNewRows,
        lifeSpan: hasNewRows,
      },
    },
  });

  // Show loading skeleton if data is loading
  if (isLoading) {
    return (
      <div className="relative rounded-md border border-muted/15 overflow-hidden bg-card/20">
        <div className="overflow-x-auto">
          <Table className="table-fixed min-w-full">
            <TableHeader className="bg-muted/10 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "font-semibold text-card-foreground/80 bg-muted/5",
                        "border-r border-muted/15 last:border-r-0",
                        "px-3 py-3 text-left"
                      )}
                      style={{
                        width: header.getSize(),
                        minWidth: header.column.columnDef.minSize,
                        maxWidth: header.column.columnDef.maxSize,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                <TableSkeleton rows={5} columns={columns.length} />
              </TableCell>
            </TableRow>
          </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-md border border-muted/15 overflow-hidden bg-card/20">
      {/* Mobile-friendly horizontal scroll wrapper */}
      <div className="overflow-x-auto">
        <Table className="table-fixed min-w-full">
          <TableHeader className="bg-muted/10 sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="hover:bg-muted/20 transition-colors duration-200"
            >
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "font-semibold text-card-foreground/80 bg-muted/5",
                      "border-r border-muted/15 last:border-r-0",
                      "px-3 py-3 text-left",
                      "transition-colors duration-200",
                      "hover:bg-muted/15"
                    )}
                    style={{
                      width: header.getSize(),
                      minWidth: header.column.columnDef.minSize,
                      maxWidth: header.column.columnDef.maxSize,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, index) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(
                  "group transition-all duration-200 ease-in-out",
                  "hover:bg-card/40 hover:shadow-sm",
                  "focus-within:bg-card/50 focus-within:ring-1 focus-within:ring-primary/20",
                  // Zebra striping for better readability
                  index % 2 === 0 ? "bg-transparent" : "bg-muted/5",
                  // Add visual feedback for rows being deleted
                  (row.original as any)?.isDeleting && "opacity-50 pointer-events-none animate-pulse",
                  // Selected state styling
                  row.getIsSelected() && "bg-primary/10 border-primary/20"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-3 py-2",
                      "border-r border-muted/10 last:border-r-0",
                      "transition-colors duration-200",
                      "group-hover:border-muted/20"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="text-4xl opacity-20">📊</div>
                  <p className="text-sm">No equipment expenses found.</p>
                  <p className="text-xs text-muted-foreground/60">
                    Add your first equipment expense to get started.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        </Table>
      </div>

      {/* Background refetch indicator */}
      <BackgroundRefetchIndicator isRefetching={isRefetching} />
    </div>
  );
}