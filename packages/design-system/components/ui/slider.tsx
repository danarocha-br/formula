"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const thumb = cva([
  "block rounded-[1px]",
  "absolute",
  "bottom-[-4px]",
  "left-[-6px]",
  "h-2",
  "w-3",
  "rounded-full",
  "bg-purple-300",
  "ring-offset-white",
  "transition-all",

  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-purple-200/50",
  "focus-visible:ring-offset-2",

  "disabled:pointer-events-none",
  "disabled:opacity-50",

  "hover:cursor-grab",
  "hover:scale-125",
  "hover:w-3",
  "hover:ring-2",
  "hover:ring-purple-200/50",
  "hover:ring-offset-2",

  "active:scale-125",
  "active:w-3",
]);
const track = cva([
  "relative",
  "h-2",
  "w-full",
  "grow",
  "overflow-hidden",
  "rounded-b-[7px]",
  "bg-neutral-200/30",
  "hover:bg-neutral-200/60",
  "transition-colors",
]);

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className={track()}>
      <SliderPrimitive.Range className="absolute h-full bg-purple-200/50" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={thumb()} />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
