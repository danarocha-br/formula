"use client";
import * as React from "react";
import { cva } from "class-variance-authority";

import { Icon } from "./icon";
import { cn } from "../../lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "primary" | "secondary";
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

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "primary", errors, type, suffix, ...props }, ref) => {
    const areErrorsEmpty = React.useMemo(
      () => Boolean(errors) && Object.keys(errors).length === 0,
      [errors]
    );

    return (
      <div className='relative'>
        <input
          type={type}
          className={cn(
            input({
              variant,
              hasError: Boolean(errors) && !areErrorsEmpty ? true : false,
            }),
            className
          )}
          ref={ref}
          {...props}
        />
        {suffix ? (
          <span className="text-card-foreground absolute right-3 top-2">{suffix}</span>
        ) : null}
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
Input.displayName = "Input";

export { Input };
