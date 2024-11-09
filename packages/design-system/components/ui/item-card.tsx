"use client";
import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Icon } from "./icon";
import { Skeleton } from "./skeleton";
import { cn } from "../../lib/utils";
import { cva } from "class-variance-authority";
import { IconButton } from "./icon-button";
import { Dropdown } from "./dropdown-menu";
import { DeleteIcon } from "./animated-icon/delete";
import { EditIcon } from "./animated-icon/edit";

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
  actionEditLabel?: string;
  actionDeleteLabel?: string;
  onEdit?: () => void;
  onDelete?: () => void;
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
  "transition-all",
  "group/card",
  "relative",
  "duration-300",

  // "hover:shadow-lg",
  "hover:scale-[1.01]",
]);

export const ItemCard = ({
  data,
  loading = false,
  className,
  actionEditLabel = "Edit",
  actionDeleteLabel = "Delete",
  onEdit,
  onDelete,
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
    color,
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
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      {...props}
      style={style}
      className={cn(card(), className)}
    >
      <Dropdown.Menu>
        <Dropdown.Trigger
          asChild
          className="opacity-0 group-hover/card:opacity-100 group-hover/card:transition-all data-[state=open]:opacity-100"
        >
          <IconButton
            label="Menu"
            icon="options"
            className="absolute top-2 right-2 "
          />
        </Dropdown.Trigger>

        <Dropdown.Content align="end">
          <Dropdown.Item
            className="rounded-t-md hover:bg-neutral-200"
            onSelect={onEdit}
          >
            <EditIcon width={20} className="mt-1" /> {actionEditLabel}
          </Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item
            className="bg-froly-100/50 hover:bg-neutral-200 rounded-b-md"
            onSelect={onDelete}
          >
            <DeleteIcon />
            {actionDeleteLabel}
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Menu>

      {!loading ? (
        !isEmpty &&
        !!category && (
          <span
            className={cn(
              "text-card-foreground flex items-center justify-center rounded-[12px] h-10 w-10 bg-opacity-50",
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
    </div>
  );
};
