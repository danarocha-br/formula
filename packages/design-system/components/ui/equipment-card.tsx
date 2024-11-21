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
import { Progress } from "./progress";

type EquipmentCardProps = {
  data: {
    id: string | number;
    name: string;
    purchaseDate: string;
    lifeSpan: string;
    categoryIcon?: string;
    color?: string;
    className?: string;
    usage: number | string;
    usageLabel: string;
    totalCost?: string;
    totalLabel?: string;
    hourlyCost?: string;
    hourlyLabel?: string;
    usagePercent?: number;
    isEmpty?: boolean;
  };
  loading?: boolean;
  className?: string;
  actionEditLabel?: string;
  actionDeleteLabel?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  isEditMode?: boolean;
  editModeContent?: React.ReactNode;
};

const card = cva(
  [
    "flex",
    "flex-col",
    "justify-between",
    "rounded-md",
    "bg-card",
    "w-full",
    "h-full",
    "!min-h-96",

    "select-none",
    "transform-gpu",
    "transition-transform",
    "group/card",
    "relative",
    "duration-500",

    "hover:scale-[1.01]",
  ],
  {
    variants: {
      isEditMode: {
        true: ["min-h-60", "p-0"],
        false: ["min-h-60", "p-3"],
      },
    },
  }
);

export const EquipmentCard = ({
  data,
  loading = false,
  className,
  actionEditLabel = "Edit",
  actionDeleteLabel = "Delete",
  onEdit,
  onDelete,
  isEditMode = false,
  editModeContent,
  ...props
}: EquipmentCardProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isEditButtonHovered, setIsEditButtonHovered] = useState(false);
  const [isDeleteButtonHovered, setIsDeleteButtonHovered] = useState(false);

  const {
    name,
    purchaseDate,
    isEmpty = false,
    color,
    categoryIcon,
    lifeSpan,
    usage,
    usageLabel,
    usagePercent,
    totalCost,
    totalLabel,
    hourlyCost,
    hourlyLabel,
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
      className={cn(card({ isEditMode }), className)}
    >
      {!isEditMode ? (
        <>
          {!loading && (
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
                  onMouseEnter={() => setIsEditButtonHovered(true)}
                  onMouseLeave={() => setIsEditButtonHovered(false)}
                >
                  <EditIcon
                    size={20}
                    animated={isEditButtonHovered}
                    className="mt-1"
                  />{" "}
                  {actionEditLabel}
                </Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item
                  className="bg-froly-100/50  focus:bg-froly-100 rounded-b-md"
                  onSelect={onDelete}
                  onMouseEnter={() => setIsDeleteButtonHovered(true)}
                  onMouseLeave={() => setIsDeleteButtonHovered(false)}
                >
                  <DeleteIcon size={18} animated={isDeleteButtonHovered} />
                  {actionDeleteLabel}
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Menu>
          )}

          {!loading ? (
            !isEmpty && (
              <div className="flex gap-4 items-center">
                <span
                  className={cn(
                    "text-card-foreground flex items-center justify-center rounded-[12px] h-10 w-10 bg-opacity-50",
                    color
                  )}
                >
                  <Icon
                    // @ts-ignore
                    name={categoryIcon}
                    label="category icon"
                    size="lg"
                    color="current"
                    className="opacity-80"
                  />
                </span>

                <span className="font-normal text-lg truncate">{name}</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-[12px]" />
              <Skeleton className="h-4 w-2/3 rounded-[12px]" />
            </div>
          )}

          {!loading && !isEmpty && (
            <div className="w-full space-y-2 mb-2 px-1">
              <div className="flex justify-between w-full">
                <span className="flex flex-col">
                  <span className="text-muted text-sm">{usageLabel}</span>
                  <span className="text-card-foreground font-semibold text-lg">
                    {usage}
                  </span>
                </span>

                <span className="flex flex-col">
                  <span className="text-muted text-sm">{totalLabel}</span>
                  <span className="text-card-foreground font-semibold text-lg">
                    {totalCost}
                  </span>
                </span>

                <span className="flex flex-col">
                  <span className="text-muted text-sm">{hourlyLabel}</span>
                  <span className="text-card-foreground font-semibold text-lg">
                    {hourlyCost}
                  </span>
                </span>
              </div>
              <Progress value={usagePercent} />
              <span className="flex justify-between w-full pt-4">
                <span className="inline-flex gap-2">
                  <Icon name="calendar" label="date" />
                  {purchaseDate}
                </span>
                <span>{lifeSpan}</span>
              </span>
            </div>
          )}

          {loading && !isEmpty && (
            <div className='space-y-4 mb-3'>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-full rounded-[12px]" />
                <Skeleton className="h-4 w-full rounded-[12px]" />
                <Skeleton className="h-4 w-full rounded-[12px]" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-6 w-full rounded-[12px]" />
                <Skeleton className="h-6 w-full rounded-[12px]" />
                <Skeleton className="h-6 w-full rounded-[12px]" />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="h-[inherit]">{editModeContent}</div>
      )}
    </div>
  );
};
