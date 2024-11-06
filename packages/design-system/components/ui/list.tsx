import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const listItem = cva([
  "flex",
  "items-center",
  "justify-between",
  "border-b",
  "border-neutral-200",
  "gap-0",
  "px-2.5",
  "py-2",
]);

type ListProps = {
  className?: string;
  children: React.ReactNode;
};

type ListItemProps = {
  children: React.ReactNode;
  className?: string;
};
const Root = ({ className, children, ...props }: ListProps) => (
  <ul
    className={cn("border border-neutral-200 rounded-md", className)}
    {...props}
  >
    {children}
  </ul>
);
Root.displayName = "Root";

const Item = ({ className, children, ...props }: ListItemProps) => (
  <li className={cn(listItem(), className)} {...props}>
    {children}
  </li>
);
Item.displayName = "Item";

export const List = { Root: Root, Item: Item };
