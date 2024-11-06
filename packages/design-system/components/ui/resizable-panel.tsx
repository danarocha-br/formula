"use client";

import { cva } from 'class-variance-authority';
import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "../../lib/utils";

const handle = cva([
  "group/handle",
  "relative",
  "flex",
  "w-1",
  "items-center",
  "justify-center",
  "bg-background-color-default",
  "hover:bg-surface-color-background-default",
  "after:absolute",
  "after:inset-y-0",
  "after:left-1/2",
  "after:w-1",
  "after:-translate-x-1/2",
  "focus-visible:outline-none",
  "focus-visible:bg-surface-color-background-default",
  "data-[panel-group-direction=vertical]:h-px",
  "data-[panel-group-direction=vertical]:w-full",
  "data-[panel-group-direction=vertical]:after:left-0",
  "data-[panel-group-direction=vertical]:after:h-1",
  "data-[panel-group-direction=vertical]:after:w-full",
  "data-[panel-group-direction=vertical]:after:-translate-y-1/2",
  "data-[panel-group-direction=vertical]:after:translate-x-0",
  "[&[data-panel-group-direction=vertical]>div]:rotate-90",
  "transition-all",
]);

const handleButton = cva([
  "z-10",
  "flex",
  "h-8",
  "w-6",
  "items-center",
  "justify-center",
  "rounded-sm",
  "border-2",
  "border-background-color-default",
  "bg-surface-color-background-default",
  "opacity-0",
  "group-hover/handle:opacity-100",
  "transition-opacity",
]);

type ResizablePanelGroupProps = React.ComponentProps<
  typeof ResizablePrimitive.PanelGroup
> & {
  defaultLayout?: number[];
};
type ResizableHandleProps = React.ComponentProps<
  typeof ResizablePrimitive.PanelResizeHandle
> & {
  withHandle?: boolean;
};
type ResizablePanelProps = React.ComponentProps<
  typeof ResizablePrimitive.Panel
>;

const ResizablePanelGroup = (props: ResizablePanelGroupProps) => {
  const { className, ...rest } = props;

  return (
    <ResizablePrimitive.PanelGroup
      className={cn(
        "flex h-full w-full gap-[2px] data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...rest}
    />
  );
};

const ResizableHandle = (props: ResizableHandleProps) => {
  const { withHandle, className, ...rest } = props;
  return (
    <ResizablePrimitive.PanelResizeHandle
      className={handle({ className })}
      {...rest}
    >
      {withHandle && (
        <div className={handleButton()}>
          <GripVertical className="h-4 w-4" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
};

const ResizablePanel = (props: ResizablePanelProps) => {
  const { className, ...rest } = props;
  return <ResizablePrimitive.Panel className={cn("", className)} {...rest} />;
};

export const Resizable = {
  Group: ResizablePanelGroup,
  Panel: ResizablePanel,
  Handle: ResizableHandle,
} as const;
