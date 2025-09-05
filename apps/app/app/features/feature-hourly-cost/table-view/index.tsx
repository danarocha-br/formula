import type { ColumnDef } from "@tanstack/react-table";
import { cva } from "class-variance-authority";
import { useCallback, useMemo, useState, } from "react";
import { Controller, useForm } from "react-hook-form";

import { useCurrencyStore } from "@/app/store/currency-store";
import { useTranslations } from "@/hooks/use-translation";
import { formatCurrency } from "@/utils/format-currency";
import { DeleteIcon } from "@repo/design-system/components/ui/animated-icon/delete";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Combobox } from "@repo/design-system/components/ui/combobox";
import { Icon, type iconPath } from "@repo/design-system/components/ui/icon";
import { iconbutton } from "@repo/design-system/components/ui/icon-button";
import { Input } from "@repo/design-system/components/ui/input";
import { NumberInput } from "@repo/design-system/components/ui/number-input";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { cn } from "@repo/design-system/lib/utils";

import { FIXED_COST_CATEGORIES } from "@/app/constants";
import type { ExpenseItem } from "@/app/types";

import type { SelectOption } from "../add-expense-form";
import { useCreateFixedExpenses } from "../server/create-fixed-expenses";
import { useDeleteFixedExpenses } from "../server/delete-fixed-expenses";
import { useUpdateFixedExpense } from "../server/update-fixed-expense";
import { DataTable } from "./data-table";

type TableViewProps = {
  data: ExpenseItem[];
  userId: string;
  getCategoryColor: (id: string) => string;
  getCategoryLabel: (id: string) => string;
};

const inputStyles = cva([
  "text-md",
  "w-full",
  "rounded-none",
  "bg-transparent",

  "hover:bg-card",

  "focus:border-primary",
  "focus:bg-card",

  "read-only:bg-transparent",
  "read-only:hover:bg-transparent",
]);

export type Expense = {
  id: number;
  userId: string;
  rank: number;
  name: string;
  amountPerMonth: string;
  amountPerYear: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
};

type NewExpense = Omit<Expense, "id" | "userId" | "rank"> & {
  id: string;
  userId: string;
  rank: number;
};

type NewExpenseFormData = {
  name: string;
  category: string;
  amountPerMonth: string | number;
  amountPerYear: number;
};

type NewExpenseFields = "name" | "category" | "amountPerMonth";

const TableSkeleton = () => {
  return (
    <div className="w-full px-2">
      <Skeleton className="h-3 min-w-40 bg-muted/20" />
    </div>
  );
};

export const TableView = ({
  data,
  getCategoryColor,
  getCategoryLabel,
  userId,
}: TableViewProps) => {
  const { selectedCurrency } = useCurrencyStore();
  const { t } = useTranslations();
  const {
    control,
    formState: { isDirty },
    reset,
    setValue,
  } = useForm();
  const { mutate: updateFixedExpense, isPending } = useUpdateFixedExpense();
  const { mutate: createFixedExpense, isPending: isPendingCreate } =
    useCreateFixedExpenses();
  const { mutate: deleteExpense } = useDeleteFixedExpenses();

  const { toast } = useToast();

  const categoriesList = FIXED_COST_CATEGORIES.map((category) => ({
    label: category.label,
    value: category.value,
    slot: (
      <div
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-[4px] bg-opacity-60 p-1',
          category.color
        )}
      >
        <Icon
          name={category.icon as keyof typeof iconPath}
          label={category.label}
          color="body"
        />
      </div>
    ),
  }));

  const dataTable = useMemo(
    () =>
      data
        ? data.map((item) => ({
            id: item.id,
            userId: item.userId,
            rank: item.rank,
            name: item.name,
            amountPerMonth: formatCurrency(
              item.period === "monthly" ? item.amount : item.amount / 12,
              {
                currency: selectedCurrency.code,
                decimals: 2,
              }
            ),
            amountPerYear: formatCurrency(
              item.period === "yearly" ? item.amount : item.amount * 12,
              {
                currency: selectedCurrency.code,
                decimals: 2,
              }
            ),
            category: item.category,
            categoryLabel: getCategoryLabel(item.category),
            categoryColor: getCategoryColor(item.category),
          }))
        : [],
    [data, selectedCurrency]
  );

  const [newRowIds, setNewRowIds] = useState<string[]>([]);

  const createEmptyRow = useCallback(
    (tempId: string) => ({
      id: tempId,
      userId: userId,
      rank: dataTable.length + 1,
      name: "",
      amountPerMonth: "0",
      amountPerYear: "0",
      category: "",
      categoryLabel: "",
      categoryColor: "",
    }),
    [dataTable.length, userId]
  );

  const tableData = useMemo(() => {
    const newRows = newRowIds.map((id) => createEmptyRow(id));
    return [...dataTable, ...newRows];
  }, [dataTable, newRowIds, createEmptyRow]);

  const handleAddNewRow = useCallback(() => {
    const tempId = `new-${Date.now()}`;
    setNewRowIds((prev) => [...prev, tempId]);
  }, []);

  const handleNewRowBlur = useCallback(
    (tempId: string) => {
      const formData = control._getWatch();
      const newExpenseData = formData[
        `newExpense_${tempId}`
      ] as NewExpenseFormData;

      if (!newExpenseData) return;

      const isValid =
        newExpenseData.name?.trim().length > 0 &&
        newExpenseData.category?.trim().length > 0 &&
        typeof newExpenseData.amountPerMonth === "number" &&
        !isNaN(newExpenseData.amountPerMonth);

      if (isValid) {
        createFixedExpense(
          {
            json: {
              rank: dataTable.length + 1,
              name: newExpenseData.name.trim(),
              category: newExpenseData.category.trim(),
              amount: Number(newExpenseData.amountPerMonth),
              period: "monthly",
              userId: userId,
            },
          },
          {
            onSuccess: () => {
              setNewRowIds((prev) => prev.filter((id) => id !== tempId));
              setValue(`newExpense_${tempId}`, undefined);
            },
            onError: (error) => {
              toast({
                title: t("validation.error.create-failed"),
                variant: "destructive",
              });
            },
          }
        );
      }
    },
    [control, createFixedExpense, dataTable.length, setValue, userId]
  );

  const handleNewRowFieldChange = useCallback(
    (tempId: string, field: NewExpenseFields, value: string | number) => {
      // Only update form values for UI
      if (field === "name") {
        setValue(`newExpense_${tempId}.name`, String(value));
      } else if (field === "category") {
        setValue(`newExpense_${tempId}.category`, String(value));
      } else if (field === "amountPerMonth") {
        const numericValue =
          typeof value === "string"
            ? Number.parseFloat(value.replace(/[^0-9.-]/g, ""))
            : value;
        setValue(`newExpense_${tempId}.amountPerMonth`, numericValue);
        setValue(`newExpense_${tempId}.amountPerYear`, numericValue * 12);
      }
    },
    [setValue]
  );

  const columns: ColumnDef<Expense | NewExpense>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("forms.accessibility.selectAll")}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("forms.accessibility.selectRow")}
          className="ml-1.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      minSize: 30,
      size: 30,
    },
    {
      accessorKey: "category",
      header: t("expenses.form.category"),
      cell: ({ row }) => {
        if (row.original.id.toString().startsWith("new-")) {
          return (
            <Controller
              name={`newExpense_${row.original.id}.category`}
              control={control}
              defaultValue=""
              render={({ field }) => {
                const selectedCategory = categoriesList.find(
                  (cat) => cat.value === field.value
                );

                return (
                  <Combobox
                    {...field}
                    placeholder={t("expenses.form.category")}
                    searchPlaceholder={t("common.search")}
                    aria-label={t("common.accessibility.selectCategory")}
                    options={categoriesList}
                    value={selectedCategory}
                    onChange={(option: SelectOption | SelectOption[]) => {
                      if (!Array.isArray(option)) {
                        field.onChange(option.value);
                        handleNewRowFieldChange(
                          String(row.original.id),
                          "category",
                          option.value
                        );
                      }
                    }}
                    emptyMessage={t("common.not-found")}
                    triggerClassName={cn(
                      inputStyles(),
                      "[&_.combobox-label]:text-md"
                    )}
                  />
                );
              }}
            />
          );
        }

        const [isEditing, setIsEditing] = useState(false);

        const toggleEditing = useCallback(() => {
          setIsEditing((prev) => !prev);
        }, []);

        const defaultCategoryOption = useMemo(() => {
          const category = FIXED_COST_CATEGORIES.find(
            (cat) => cat.value === row.getValue("category")
          );
          return category
            ? {
                value: category.value,
                label: category.label,
                slot: (
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-[4px] p-1',
                      category.color
                    )}
                  >
                    <Icon
                      name={category.icon as keyof typeof iconPath}
                      label={category.label}
                      color="body"
                    />
                  </div>
                ),
              }
            : undefined;
        }, [row]);

        const handleCategoryChange = useCallback(
          (option: SelectOption) => {
            updateFixedExpense(
              {
                param: { id: String(row.original.id) },
                json: {
                  category: option.value,
                  userId: row.original.userId,
                },
              },
              {
                onSuccess: () => {
                  setIsEditing(false);
                  setValue(`expenses.${row.id}.category`, option);
                },
                onError: () => {
                  toast({
                    title: t("validation.error.update-failed"),
                    variant: "destructive",
                  });
                  reset({
                    [`expenses.${row.id}.category`]: row.original.category,
                  });
                },
              }
            );
          },
          [row.original, updateFixedExpense, toast, t, setValue, reset]
        );

        return (
          <div onDoubleClick={toggleEditing}>
            <Controller
              name={`expenses.${row.id}.category`}
              control={control}
              defaultValue={defaultCategoryOption}
              render={({ field }) => (
                <Combobox
                  {...field}
                  placeholder={t("expenses.form.category")}
                  searchPlaceholder={t("common.search")}
                  aria-label={t("common.accessibility.selectCategory")}
                  options={categoriesList}
                  value={field.value || undefined}
                  onChange={(option: SelectOption | SelectOption[]) => {
                    if (!Array.isArray(option)) {
                      handleCategoryChange(option);
                    }
                  }}
                  emptyMessage={t("common.not-found")}
                  triggerClassName={cn(
                    inputStyles(),
                    "[&_.combobox-label]:text-md"
                  )}
                />
              )}
            />
          </div>
        );
      },
      size: 300,
    },
    {
      accessorKey: "name",
      header: t("expenses.form.name"),
      cell: ({ row }) => {
        if (row.original.id.toString().startsWith("new-")) {
          return (
            <Controller
              name={`newExpense_${row.original.id}.name`}
              control={control}
              defaultValue=""
              render={({ field }) => (
                <Input
                  {...field}
                  className={inputStyles()}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    handleNewRowFieldChange(
                      String(row.original.id),
                      "name",
                      e.target.value
                    );
                  }}
                  onBlur={() => handleNewRowBlur(String(row.original.id))}
                />
              )}
            />
          );
        }

        const [isEditing, setIsEditing] = useState(false);

        const toggleEditing = useCallback(() => {
          setIsEditing((prev) => !prev);
        }, []);

        const handleBlur = useCallback(
          (field: any) => {
            if (field.value !== row.original.name) {
              updateFixedExpense(
                {
                  param: { id: String(row.original.id) },
                  json: {
                    name: field.value,
                    userId: row.original.userId,
                  },
                },
                {
                  onSuccess: () => setIsEditing(false),
                  onError: (error) => {
                    toast({
                      title: t("validation.error.update-failed"),
                      variant: "destructive",
                    });
                  },
                }
              );
            } else {
              setIsEditing(false);
            }
          },
          [row.original, updateFixedExpense, toast, t]
        );

        return (
          <div onDoubleClick={toggleEditing}>
            {isPending ? (
              <TableSkeleton />
            ) : (
              <Controller
                name={`expenses.${row.id}.name`}
                control={control}
                defaultValue={row.getValue("name")}
                render={({ field }) => (
                  <Input
                    {...field}
                    onBlur={() => handleBlur(field)}
                    readOnly={!isEditing}
                    className={inputStyles()}
                  />
                )}
              />
            )}
          </div>
        );
      },
      size: 300,
    },
    {
      accessorKey: "amountPerMonth",
      header: t("expenses.form.value") + " (" + t("common.period.per-month") + ")",
      cell: ({ row }) => {
        if (row.original.id.toString().startsWith("new-")) {
          return (
            <Controller
              name={`newExpense_${row.original.id}.amountPerMonth`}
              control={control}
              defaultValue={0}
              render={({ field }) => (
                <NumberInput
                  {...field}
                  type="tel"
                  className={inputStyles()}
                  currency={selectedCurrency.symbol + " "}
                  decimalScale={2}
                  allowNegative={false}
                  allowLeadingZeros
                  onValueChange={(values) => {
                    const { floatValue } = values;
                    field.onChange(floatValue ?? 0);
                    setValue(
                      `newExpense_${row.original.id}.amountPerYear`,
                      (floatValue ?? 0) * 12
                    );
                    handleNewRowFieldChange(
                      String(row.original.id),
                      "amountPerMonth",
                      floatValue ?? 0
                    );
                  }}
                  onBlur={() => handleNewRowBlur(String(row.original.id))}
                />
              )}
            />
          );
        }

        const [isEditing, setIsEditing] = useState(false);

        const toggleEditing = useCallback((e: React.MouseEvent) => {
          setIsEditing((prev) => !prev);
        }, []);

        const handleBlur = useCallback(
          (field: { value: string | number }) => {
            if (typeof field.value === "number") {
              const amountValue = field.value;
              if (
                isDirty &&
                !isNaN(amountValue) &&
                amountValue !==
                  Number.parseFloat(
                    row.original.amountPerMonth
                      .replace(/[^0-9.,]/g, "")
                      .replace(",", ".")
                  )
              ) {
                updateFixedExpense(
                  {
                    param: { id: String(row.original.id) },
                    json: {
                      amount: amountValue,
                      period: "monthly",
                      userId: row.original.userId,
                    },
                  },
                  {
                    onSuccess: (response, variables) => {
                      setIsEditing(false);
                      const monthlyAmount = variables.json.amount ?? 0;
                      const yearlyAmount = monthlyAmount * 12;
                      setValue(
                        `expenses.${row.id}.amountPerMonth`,
                        monthlyAmount
                      );
                      setValue(
                        `expenses.${row.id}.amountPerYear`,
                        yearlyAmount
                      );
                    },
                    onError: (error) => {
                      toast({
                        title: t("validation.error.update-failed"),
                        variant: "destructive",
                      });
                      reset({
                        [`expenses.${row.id}.amountPerMonth`]:
                          row.original.amountPerMonth,
                        [`expenses.${row.id}.amountPerYear`]:
                          row.original.amountPerYear,
                      });
                    },
                  }
                );
              } else {
                setIsEditing(false);
                reset({
                  [`expenses.${row.id}.amountPerMonth`]:
                    row.original.amountPerMonth,
                  [`expenses.${row.id}.amountPerYear`]:
                    row.original.amountPerYear,
                });
              }
              return;
            }

            const cleanedValue = String(field.value)
              .replace(/[^0-9.,]/g, "")
              .replace(",", ".");
            const amountValue = Number.parseFloat(cleanedValue);

            if (
              isDirty &&
              !isNaN(amountValue) &&
              amountValue !==
                Number.parseFloat(
                  row.original.amountPerMonth
                    .replace(/[^0-9.,]/g, "")
                    .replace(",", ".")
                )
            ) {
              updateFixedExpense(
                {
                  param: { id: String(row.original.id) },
                  json: {
                    amount: amountValue,
                    period: "monthly",
                    userId: row.original.userId,
                  },
                },
                {
                  onSuccess: (response, variables) => {
                    setIsEditing(false);
                    const monthlyAmount = variables.json.amount ?? 0;
                    const yearlyAmount = monthlyAmount * 12;
                    setValue(
                      `expenses.${row.id}.amountPerMonth`,
                      monthlyAmount
                    );
                    setValue(`expenses.${row.id}.amountPerYear`, yearlyAmount);
                  },
                  onError: (error) => {
                    toast({
                      title: t("validation.error.update-failed"),
                      variant: "destructive",
                    });
                    reset({
                      [`expenses.${row.id}.amountPerMonth`]:
                        row.original.amountPerMonth,
                      [`expenses.${row.id}.amountPerYear`]:
                        row.original.amountPerYear,
                    });
                  },
                }
              );
            } else {
              setIsEditing(false);
              reset({
                [`expenses.${row.id}.amountPerMonth`]:
                  row.original.amountPerMonth,
                [`expenses.${row.id}.amountPerYear`]:
                  row.original.amountPerYear,
              });
            }
          },
          [row.original, updateFixedExpense, toast, t, isDirty, reset, setValue]
        );

        return (
          <div className="relative" onDoubleClick={toggleEditing}>
            {isPending ? (
              <TableSkeleton />
            ) : (
              <Controller
                name={`expenses.${row.id}.amountPerMonth`}
                control={control}
                defaultValue={row.getValue("amountPerMonth")}
                render={({ field }) => (
                  <NumberInput
                    {...field}
                    type="tel"
                    onBlur={(e) => handleBlur(field)}
                    readOnly={!isEditing}
                    className={inputStyles()}
                    currency={selectedCurrency.symbol + " "}
                    decimalScale={2}
                    allowNegative={false}
                    allowLeadingZeros
                    onValueChange={(values) => {
                      const { floatValue, formattedValue } = values;
                      field.onChange(floatValue ?? 0);
                    }}
                    value={
                      isEditing ? field.value : row.getValue("amountPerMonth")
                    }
                  />
                )}
              />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "amountPerYear",
      header: t("expenses.form.value") + " (" + t("common.period.per-year") + ")",
      cell: ({ row }) => {
        const [isEditing, setIsEditing] = useState(false);

        const toggleEditing = useCallback(() => {
          setIsEditing((prev) => !prev);
        }, []);

        const handleBlur = useCallback(
          (field: { value: string | number }) => {
            if (typeof field.value === "number") {
              const amountValue = field.value;
              if (
                isDirty &&
                !isNaN(amountValue) &&
                amountValue !==
                  Number.parseFloat(
                    row.original.amountPerYear
                      .replace(/[^0-9.,]/g, "")
                      .replace(",", ".")
                  )
              ) {
                updateFixedExpense(
                  {
                    param: { id: String(row.original.id) },
                    json: {
                      amount: amountValue,
                      period: "yearly",
                      userId: row.original.userId,
                    },
                  },
                  {
                    onSuccess: (response, variables) => {
                      setIsEditing(false);
                      const yearlyAmount = variables.json.amount ?? 0;
                      const monthlyAmount = yearlyAmount / 12;
                      setValue(
                        `expenses.${row.id}.amountPerYear`,
                        yearlyAmount
                      );
                      setValue(
                        `expenses.${row.id}.amountPerMonth`,
                        monthlyAmount
                      );
                    },
                    onError: (error) => {
                      toast({
                        title: t("validation.error.update-failed"),
                        variant: "destructive",
                      });
                      reset({
                        [`expenses.${row.id}.amountPerYear`]:
                          row.original.amountPerYear,
                        [`expenses.${row.id}.amountPerMonth`]:
                          row.original.amountPerMonth,
                      });
                    },
                  }
                );
              } else {
                setIsEditing(false);
                reset({
                  [`expenses.${row.id}.amountPerYear`]:
                    row.original.amountPerYear,
                  [`expenses.${row.id}.amountPerMonth`]:
                    row.original.amountPerMonth,
                });
              }
              return;
            }

            const cleanedValue = String(field.value)
              .replace(/[^0-9.,]/g, "")
              .replace(",", ".");
            const amountValue = Number.parseFloat(cleanedValue);

            if (
              isDirty &&
              !isNaN(amountValue) &&
              amountValue !==
                Number.parseFloat(
                  row.original.amountPerYear
                    .replace(/[^0-9.,]/g, "")
                    .replace(",", ".")
                )
            ) {
              updateFixedExpense(
                {
                  param: { id: String(row.original.id) },
                  json: {
                    amount: amountValue,
                    period: "yearly",
                    userId: row.original.userId,
                  },
                },
                {
                  onSuccess: (response, variables) => {
                    setIsEditing(false);
                    const yearlyAmount = variables.json.amount ?? 0;
                    const monthlyAmount = yearlyAmount / 12;
                    setValue(`expenses.${row.id}.amountPerYear`, yearlyAmount);
                    setValue(
                      `expenses.${row.id}.amountPerMonth`,
                      monthlyAmount
                    );
                  },
                  onError: (error) => {
                    toast({
                      title: t("validation.error.update-failed"),
                      variant: "destructive",
                    });
                    reset({
                      [`expenses.${row.id}.amountPerYear`]:
                        row.original.amountPerYear,
                      [`expenses.${row.id}.amountPerMonth`]:
                        row.original.amountPerMonth,
                    });
                  },
                }
              );
            } else {
              setIsEditing(false);
              reset({
                [`expenses.${row.id}.amountPerYear`]:
                  row.original.amountPerYear,
                [`expenses.${row.id}.amountPerMonth`]:
                  row.original.amountPerMonth,
              });
            }
          },
          [row.original, updateFixedExpense, toast, t, isDirty, reset, setValue]
        );

        return (
          <div onDoubleClick={toggleEditing}>
            {isPending ? (
              <TableSkeleton />
            ) : (
              <Controller
                name={`expenses.${row.id}.amountPerYear`}
                control={control}
                defaultValue={row.getValue("amountPerYear")}
                render={({ field }) => (
                  <NumberInput
                    {...field}
                    type="tel"
                    onBlur={(e) => handleBlur(field)}
                    readOnly={!isEditing}
                    className={inputStyles()}
                    decimalScale={2}
                    allowNegative={false}
                    currency={selectedCurrency.symbol + " "}
                    onValueChange={(values) => {
                      const { floatValue, formattedValue } = values;
                      field.onChange(floatValue ?? 0);
                    }}
                    value={
                      isEditing ? field.value : row.getValue("amountPerYear")
                    }
                  />
                )}
              />
            )}
          </div>
        );
      },
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
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const [isHovered, setIsHovered] = useState(false);
        const expense = row.original;

        function handleDeleteRow() {
          if (row.original.id.toString().startsWith("new-")) {
            // Remove new row from UI
            setNewRowIds((prev) => prev.filter((id) => id !== row.original.id));
            // Clear form data
            setValue(`newExpense_${row.original.id}`, undefined);
          } else {
            // Delete existing expense
            deleteExpense(
              { param: { id: String(expense.id), userId: expense.userId } },
              {
                onError: () => {
                  toast({
                    title: t("validation.error.delete-failed"),
                    variant: "destructive",
                  });
                },
              }
            );
          }
        }

        return (
          <div className="flex justify-end px-2">
            <button
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={handleDeleteRow}
              aria-label={t("common.accessibility.deleteItem")}
              className={cn(
                iconbutton({ size: "sm" }),
                "opacity-60 hover:opacity-100"
              )}
            >
              <DeleteIcon animated={isHovered} className="scale-90" />
            </button>
          </div>
        );
      },
      maxSize: 50,
      size: 36,
    },
  ];

  return (
    <div className="pt-8">
      <DataTable columns={columns} data={tableData} />
      <button
        onClick={handleAddNewRow}
        aria-label={t("common.accessibility.addItem")}
        className={cn(
          'w-full border-muted-foreground/50 border-t-0 border-b py-2',
          'hover:bg-card/50 transition-colors',
          'flex items-center justify-center gap-2'
        )}
      >
        <Icon name="plus" label={t("common.accessibility.addItem")} color="primary" />
        <span className='text-card-foreground/60 text-sm'>{t("expenses.actions.add-expense")}</span>
      </button>
    </div>
  );
};
