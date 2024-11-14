"use client";
import React from "react";
import { NumericFormat } from "react-number-format";

import { Icon, iconPath } from "./icon";
import { cva } from "class-variance-authority";
import { Label } from "./label";
import { Slider } from "./slider";
import { Skeleton } from "./skeleton";

const container = cva(
  ["flex", "items-center", "gap-4", "w-full", "rounded-md", "bg-input"],
  {
    variants: {
      removePaddings: {
        true: ["p-0"],
        false: ["py-2", "px-2"],
      },

      hasError: {
        true: ["border border-destructive rounded-sm"],
      },
    },

    defaultVariants: {
      removePaddings: false,
      hasError: false,
    },
  }
);

const inputNumeric = cva([
  "font-sans",
  "text-lg",
  "font-medium",
  "text-card-foreground",
  "bg-transparent",
  "rounded-sm",
  "px-2",
  "pt-1",
  "pb-3",
  "outline-none",
]);

export interface SliderCardProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "type"
  > {
  label?: string;
  currency?: string;
  category?: keyof typeof iconPath;
  icon?: keyof typeof iconPath;
  value?: number;
  type?: "tel" | "text";
  suffix?: string;
  onChange?: (value: number) => void;
  removePaddings?: boolean;
  loading?: boolean;
  errors?: any;
}

const SliderCard = React.forwardRef<HTMLInputElement, SliderCardProps>(
  (
    {
      className,
      label,
      category,
      suffix,
      currency,
      value = 0,
      onChange,
      removePaddings = false,
      errors,
      loading = false,
      ...props
    },
    ref
  ) => {
    const baseMax = Number(props.max) || 1000;
    const sliderValue = Math.min((value / baseMax) * 100, 100);

    const areErrorsEmpty = React.useMemo(
      () => Boolean(errors) && Object.keys(errors).length === 0,
      [errors]
    );

    return (
      <div
        className={container({
          removePaddings,
          className,
          hasError: Boolean(errors) && !areErrorsEmpty ? true : false,
        })}
      >
        <div className="flex flex-col gap-1 w-full relative">
          {!!label && (
            <div className="flex gap-2 items-center">
              {!!category && (
                <Icon
                  name={category}
                  label={label}
                  size="sm"
                  color="current"
                  className="opacity-70"
                />
              )}
              <Label id={props.name} className="text-sm whitespace-nowrap">
                {label}
              </Label>
            </div>
          )}

          <div className="relative w-full flex justify-between bg-ring/60 hover:bg-ring/80 rounded-sm transition-colors">
            <NumericFormat
              getInputRef={ref}
              value={value}
              onValueChange={(values) => {
                const newValue = Math.min(
                  Math.max(0, Number(values.value)),
                  Number(props.max) || baseMax
                );
                onChange?.(newValue);
              }}
              placeholder="0"
              className={inputNumeric()}
              name={props.name}
              id={props.id}
              disabled={props.disabled || loading}
              min={props.min}
              max={props.max}
              thousandSeparator={currency === "$" ? "," : "."}
              decimalSeparator={currency === "$" ? "." : ","}
              prefix={currency ? currency : undefined}
              aria-disabled={loading}
            />
            {!!suffix && (
              <span className="whitespace-nowrap lowercase text-right absolute right-3 top-2 text-sm select-none">
                {!loading ? (
                  suffix
                ) : (
                  <Skeleton className="w-12 h-5 bg-neutral-300" />
                )}
              </span>
            )}
          </div>
          <Slider
            className="absolute bottom-0"
            value={[sliderValue]}
            onValueChange={(newValue: number[]) => {
              //@ts-ignore
              const calculatedValue = Math.round((newValue[0] / 100) * baseMax);
              onChange?.(calculatedValue);
            }}
            min={0}
            max={100}
            disabled={loading || props.disabled}
          />
        </div>

        {Boolean(errors) && !areErrorsEmpty ? (
          <div className="mt-1 inline-flex text-xs text-destructive">
            <Icon
              className="select-icon--error mr-1"
              label="error"
              name="alert"
              size="xs"
              color="danger"
            />
            {errors.message}
          </div>
        ) : null}
      </div>
    );
  }
);
SliderCard.displayName = "SliderCard";

export { SliderCard };
