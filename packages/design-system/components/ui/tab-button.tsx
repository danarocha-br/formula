"use client";

import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const tabButton = cva(
  [
    "text-card-foreground",
    "flex",
    "items-center",
    "gap-2",
    "h-full",
    "pl-4",
    "pr-6",
    "text-sm",
    "rounded-t-[18px]",
    "transition-colors",

    "hover:bg-white/30",
    "focus-visible:outline-none",
    "focus-visible:bg-white/30",
  ],
  {
    variants: {
      isActive: {
        true: ["bg-white/50"],
        false: ["bg-purple-200"],
      },
    },

    defaultVariants: {
      isActive: false,
    },
  }
);

interface TabButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

const TabButton = React.forwardRef<HTMLButtonElement, TabButtonProps>(
  ({ className, isActive = false, children, ...props }, ref) => (
    <button ref={ref} {...props} className={cn(tabButton({ isActive }))}>
      {children}
    </button>
  )
);

export { TabButton };
