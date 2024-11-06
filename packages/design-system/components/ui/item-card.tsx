"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Icon, iconPath } from "./icon";
import { Skeleton } from "./skeleton";
import { cn } from '../../lib/utils';
import { cva } from 'class-variance-authority';

type ItemCardProps = {
  data: {
    id: string;
    label: string;
    value: number;
    currency?: string;
    period: string;
    category?: keyof typeof iconPath;
    className?: string;
    loading?: boolean;
    isEmpty?: boolean;
  };
  className?: string;
};

const card = cva([
  "flex",
  "flex-col",
  "justify-between",
  "rounded-md",
  "bg-card",
  "w-full",
  "h-full",
  "p-3",
  "min-h-40",
  "select-none",
  "transform-gpu",
]);

export const ItemCard = ({ data, className, ...props }: ItemCardProps) => {
  const {
    id,
    label,
    value,
    currency = "$",
    period,
    category,
    loading = false,
    isEmpty = false,
  } = data;
  const {
    setNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: "card",
      data,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
    // "--translate-x": transform ? `${transform.x}px` : "0",
    // "--translate-y": transform ? `${transform.y}px` : "0",
  } as React.CSSProperties;

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "w-full h-full rounded-md bg-neutral-800/20 border border-neutral-800/[0.22] transform-gpu",
          className
        )}
      >
        <div className="flex flex-col h-full" />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      {...props}
      style={style}
      className={cn(card(), className)}
    >
      {!loading ? (
        !isEmpty &&
        !!category && (
          <span className="text-text-color-body flex items-center justify-center bg-froly-100 rounded-[12px] h-10 w-10">
            <Icon
              name={category}
              label="category icon"
              size="lg"
              color="current"
              className="opacity-70"
            />
          </span>
        )
      ) : (
        <Skeleton className="h-10 w-10 rounded-[12px]" />
      )}

      {!isEmpty && (
        <div className="flex flex-col">
          {!loading ? (
            <span className="text-text-color-caption truncate">{label}</span>
          ) : (
            <Skeleton className="h-5 w-1/2" />
          )}
          {!loading ? (
            <p className="text-text-color-body font-medium @[200px]:text-lg @[380px]:text-2xl @[600px]:text-3xl">
              <span>{currency}</span>
              <span className="mx-1">{value}</span>
              <span className="text-text-color-caption text-md truncate">
                / {period}
              </span>
            </p>
          ) : (
            <Skeleton className="h-5 w-full mt-2" />
          )}
        </div>
      )}
    </div>
  );
};
