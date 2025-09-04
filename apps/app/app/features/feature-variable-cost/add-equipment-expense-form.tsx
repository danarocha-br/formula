import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/design-system/components/ui/button";
import { Combobox } from "@repo/design-system/components/ui/combobox";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import { Icon, type iconPath } from "@repo/design-system/components/ui/icon";
import { Input } from "@repo/design-system/components/ui/input";
import { SliderCard } from "@repo/design-system/components/ui/slider-card";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { cva } from "class-variance-authority";
import type React from "react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { EQUIPMENT_COST_CATEGORIES } from "@/app/constants";
import { useCurrencyStore } from "@/app/store/currency-store";
import { Label } from "@repo/design-system/components/ui/label";
import { NumberInput } from "@repo/design-system/components/ui/number-input";
import { cn } from "@repo/design-system/lib/utils";
import { parseCookies } from "nookies";
import { useCreateEquipmentExpense } from "./server/create-equipment-expense";

interface NewExpenseForm {
  name: string | undefined;
  category: ComboboxOption | undefined;
  amount: number;
  purchaseDate: Date;
  usage: number;
  lifeSpan: number;
}

export interface ComboboxOption {
  label: string;
  value: string;
  slot?: React.ReactNode;
}

export interface SelectOption {
  label: string;
  value: string;
  slot?: React.ReactNode;
}
interface AddExpenseFormProps {
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  userId: string;
  rankIndex: number;
  defaultValues?: NewExpenseForm;
}

export const closeButton = cva([
  "absolute",
  "top-2",
  "right-2",
  "flex",
  "items-center",
  "justify-center",
  "rounded-full",
  "h-8",
  "w-8",
  "bg-neutral-50",
  "hover:bg-neutral-100",
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-ring",
  "focus-visible:ring-offset-2",
]);

export const AddEquipmentExpenseForm = ({
  setIsActive,
  userId,
  rankIndex,
  defaultValues = {
    name: "",
    category: undefined,
    amount: 0,
    purchaseDate: new Date(),
    usage: 0,
    lifeSpan: 0,
  },
}: AddExpenseFormProps) => {
  const { toast } = useToast();
  const cookies = parseCookies();
  const userLocale = cookies.NEXT_LOCALE || navigator.language || "en";

  const categoriesList = useMemo(
    () =>
      EQUIPMENT_COST_CATEGORIES.map((category) => ({
        label: category.label,
        value: category.value,
        slot: (
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-[4px] p-1',
              'ategoh-6 ry.color w-6 p-1'
            )}
          >
            <Icon
              name={category.icon as keyof typeof iconPath}
              label={category.label}
              color="body"
            />
          </div>
        ),
      })).sort((a, b) => a.label.localeCompare(b.label)),
    [EQUIPMENT_COST_CATEGORIES]
  );
  const { selectedCurrency } = useCurrencyStore();

  const expenseSchema = z.object({
    category: z.object(
      {
        label: z.string(),
        value: z.string(),
        slot: z.any().optional(),
      },
      {
        required_error: "This field is required",
        invalid_type_error: "Invalid type",
      }
    ),
    amount: z.number({
      required_error: "This field is required",
    }),
    usage: z.number({
      required_error: "This field is required",
    }),
    purchaseDate: z.date({
      required_error: "This field is required",
    }),
    name: z
      .string({
        required_error: "This field is required",
      })
      .min(1, {
        message: "This field is required",
      }),
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewExpenseForm>({
    defaultValues,
    resolver: zodResolver(expenseSchema),
    mode: "onBlur",
  });

  const { mutate: createFixedExpense } = useCreateEquipmentExpense();
  async function onSubmit(data: NewExpenseForm) {
    if (!data.category || !data.name) return;
    reset(defaultValues);
    setIsActive(false);

    createFixedExpense(
      {
        json: {
          userId,
          name: data.name,
          amount: data.amount,
          category: data.category.value,
          rank: rankIndex,
          purchaseDate: new Date(),
          usage: 20,
          lifeSpan: 20,
        },
      },
      {
        onError: () => {
          toast({
            title: "Failed to create expense",
            variant: "destructive",
          });
        },
      }
    );
  }
  return (
    <form
      className='flex h-full flex-col justify-between p-3'
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex w-full justify-between">
        <div onClick={(e) => e.stopPropagation()}>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Combobox
                placeholder="Select category"
                searchPlaceholder="Search"
                options={categoriesList}
                value={field.value || undefined}
                onChange={(option: SelectOption | SelectOption[]) => {
                  if (!Array.isArray(option)) {
                    field.onChange(option);
                  }
                }}
                emptyMessage="No items found"
                errors={
                  errors?.category?.message
                    ? { message: errors.category.message }
                    : undefined
                }
              />
            )}
          />
        </div>
        <button
          type="button"
          className={closeButton()}
          onClick={() => {
            setIsActive(false);
          }}
        >
          <Icon name="close" className='h-4 w-4' label="close" color="body" />
        </button>
      </div>
      <div className='flex h-full flex-col justify-between p-3'>
        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>Nome do equipamento</Label>
                <Input
                  variant="secondary"
                  placeholder="Enter name"
                  className="w-full"
                  id="name"
                  {...field}
                  errors={
                    errors?.name?.message
                      ? { message: errors.name.message }
                      : undefined
                  }
                />
              </div>
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>Custo do equipamento</Label>
                <SliderCard
                  currency={selectedCurrency.symbol + " "}
                  min={1}
                  max={5000}
                  value={field.value}
                  onChange={field.onChange}
                  removePaddings
                  errors={
                    errors?.amount?.message
                      ? { message: errors.amount.message }
                      : undefined
                  }
                />
              </div>
            )}
          />

          <div className='flex w-full justify-between gap-2'>
            <Controller
              control={control}
              name="purchaseDate"
              render={({ field }) => (
                <div className='w-full space-y-2'>
                  <Label>Data de compra</Label>
                  <DatePicker
                    {...field}
                    format={
                      userLocale === "pt-BR"
                        ? [["days", "months", "years"], []]
                        : [["months", "days", "years"], []]
                    }
                    errors={
                      errors?.purchaseDate?.message
                        ? { message: errors.purchaseDate.message }
                        : undefined
                    }
                  />
                </div>
              )}
            />
            <Controller
              control={control}
              name="lifeSpan"
              render={({ field }) => (
                <div className='h-full w-full space-y-2'>
                  <Label>Tempo de vida útil</Label>
                  <NumberInput
                    variant="secondary"
                    className='h-full bg-ring/60'
                    suffix="years"
                    {...field}
                    errors={
                      errors?.lifeSpan?.message
                        ? { message: errors.lifeSpan.message }
                        : undefined
                    }
                  />
                </div>
              )}
            />
          </div>

          <div className="mt-4">
            <Button type="submit" className="whitespace-nowrap">
              <i>
                <Icon name="plus" label="add" color="on-dark" />
              </i>
              Add Expense
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
