import * as React from "react"

import { cn } from "@repo/design-system/lib/utils"
import { cva } from 'class-variance-authority';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "primary" | "secondary";
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
        secondary: [
          "text-md",
          "bg-ring/60",
          "hover:bg-ring/80",
          "h-11",
        ],
      },
    },

    defaultVariants: {
      variant: "primary",
    },
  }
);

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant='primary', type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(input({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
)
Input.displayName = "Input"

export { Input }
