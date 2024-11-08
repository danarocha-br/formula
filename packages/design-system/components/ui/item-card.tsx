"use client";
import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Icon } from "./icon";
import { Skeleton } from "./skeleton";
import { cn } from "../../lib/utils";
import { cva } from "class-variance-authority";

type ItemCardProps = {
  data: {
    id: string | number;
    name: string;
    amount: number;
    currency?: string;
    period?: string | null;
    category?: string | undefined;
    color?: string;
    className?: string;
    isEmpty?: boolean;
  };
  loading?: boolean;
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

export const ItemCard = ({
  data,
  loading = false,
  className,

  ...props
}: ItemCardProps) => {
  const [isMounted, setIsMounted] = useState(false);

  const {
    id,
    name,
    amount,
    currency = "$",
    period,
    category,
    isEmpty = false,
    color = "bg-froly-100",
  } = data;
  const {
    setNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: data.id,
    data: {
      type: "card",
      data,
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const style: React.CSSProperties = isMounted
    ? {
        transition: transition || undefined,
        transform: transform ? CSS.Transform.toString(transform) : undefined,
      }
    : {};

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

  if (!isMounted) {
    return;
  }

  return (
    <button
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
          <span
            className={cn(
              "text-card-foreground flex items-center justify-center rounded-[12px] h-10 w-10",
              color
            )}
          >
            <Icon
              // @ts-ignore
              name={category}
              label="category icon"
              size="lg"
              color="current"
              className="opacity-80"
            />
          </span>
        )
      ) : (
        <Skeleton className="h-10 w-10 rounded-[12px]" />
      )}

      {!isEmpty && (
        <div className="flex flex-col items-start w-full">
          {!loading ? (
            <span className="text-muted font-normal truncate">{name}</span>
          ) : (
            <Skeleton className="h-6 w-1/2" />
          )}
          {!loading ? (
            <p className="text-card-foreground font-medium @[200px]:text-lg @[380px]:text-2xl @[600px]:text-3xl">
              <span>{currency}</span>
              <span className="mx-1">{amount}</span>
              <span className="text-muted text-md truncate">/ {period}</span>
            </p>
          ) : (
            <Skeleton className="h-6 w-full mt-2" />
          )}
        </div>
      )}
    </button>
  );
};
