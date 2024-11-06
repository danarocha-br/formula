"use client";
import * as React from "react";

import { cn } from "@repo/design-system/lib/utils";
import { cva } from "class-variance-authority";
import { Icon } from "./icon";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "primary" | "secondary";
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
  ({ className, variant = "primary", errors, type, ...props }, ref) => {
    const areErrorsEmpty = React.useMemo(
      () => Boolean(errors) && Object.keys(errors).length === 0,
      [errors]
    );

    return (
      <div>
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
