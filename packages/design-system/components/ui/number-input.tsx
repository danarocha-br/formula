"use client";
import * as React from "react";
import { cva } from "class-variance-authority";
import { NumericFormat, NumericFormatProps } from "react-number-format";

import { Icon } from "./icon";
import { cn } from "@repo/design-system/lib/utils";

export interface NumberInputProps extends NumericFormatProps {
  variant?: "primary" | "secondary";
  currency?: string;
  suffix?: string;
  errors?: any;
}

const input = cva(
  [
    "flex",
    "w-full",
    "rounded-sm",
    "px-3",
    "py-2",
    "leading-none",
    "bg-ring/60",
    "hover:bg-ring/80",

    "text-card-foreground",
    "outline-none",

    "ring-offset-0",
    "file:border-0",
    "file:bg-transparent",
    "file:text-sm",
    "file:font-medium",
    "file:text-card-foreground",
    "placeholder:text-muted",
    "focus-visible:outline-none",
    "focus-visible:border-ring",
    "disabled:cursor-not-allowed",
    "disabled:opacity-50",
    "transition-all",
  ],
  {
    variants: {
      variant: {
        primary: [
          "text-lg",
          "h-9",
          "bg-input",
          "border-2",
          "border-ring",
          "hover:bg-ring",
          "hover:border-ring",
        ],
        secondary: ["text-md", "bg-ring/60", "hover:bg-ring/80", "h-11"],
      },

      hasError: {
        true: ["border border-destructive"],
        false: ["border-none"],
      },
    },

    defaultVariants: {
      variant: "primary",
      hasError: false,
    },
  }
);

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      variant = "primary",
      errors,
      type,
      currency,
      suffix,
      ...props
    },
    ref
  ) => {
    const areErrorsEmpty = React.useMemo(
      () => Boolean(errors) && Object.keys(errors).length === 0,
      [errors]
    );

    return (
      <div>
        <div className="relative w-full flex justify-between  rounded-sm transition-colors">
          <NumericFormat
            getInputRef={ref}
            className={cn(input(), className)}
            name={props.name}
            id={props.id}
            disabled={props.disabled}
            min={props.min}
            max={props.max}
            thousandSeparator={currency === "$" ? "," : "."}
            decimalSeparator={currency === "$" ? "." : ","}
            prefix={currency ? currency : undefined}
            allowLeadingZeros
            aria-disabled={props.disabled}
            {...props}
          />
          {!!suffix && (
            <span className="whitespace-nowrap lowercase text-right absolute right-3 top-2 text-sm select-none">
              {suffix}
            </span>
          )}
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
NumberInput.displayName = "NumberInput";

export { NumberInput };
