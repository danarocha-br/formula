"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

export const item = cva(
  [
    "[&_button]:rounded-[10px]",
    "[&_button]:bg-transparent",
    "[&_button]:inline-flex",
    "[&_button]:items-center",
    "[&_button]:justify-center",
    "[&_button]:gap-2",
    "[&_button]:pr-3",
    "[&_button]:pl-2",
    "[&_button]:h-8",
    "[&_button]:text-sm",
    "[&_button]:transition",
    "[&_button]:tracking-wide",

    "[&_button]:focus-visible:outline-none",
    "[&_button]:focus-visible:ring-2",
    "[&_button]:focus-visible:ring-offset-2",
    "[&_button]:focus-visible:ring-ring",
  ],
  {
    variants: {
      isActive: {
        true: [
          "[&_button]:text-foreground",
          "[&_button]:opacity-100",
          "[&_svg]:fill-primary",
        ],
        false: [
          "[&_button]:text-foreground",
          "[&_button]:opacity-50",
          "[&_button]:hover:opacity-100",
          "[&_button]:hover:bg-background",
          "[&_button]:hover:[&_svg]:fill-primary",
        ],
      },
    },

    defaultVariants: {
      isActive: false,
    },
  }
);

export type RootContextType = {
  setActive: (index: number, size: number, position: number) => void;
  activeItem: { index: number; size: number; position: number };
  isReady: boolean;
  setMounted: React.Dispatch<React.SetStateAction<boolean>>;
  isMounted: boolean;
  isFluid: boolean;
  isVertical: boolean;
  duration: number;
};

export type RootProps = {
  duration?: number;
  vertical?: boolean;
  fluid?: boolean;
  children:
    | React.ReactNode
    | ((props: {
        ready: boolean;
        position: string;
        duration: string;
        size: string;
      }) => React.ReactNode);
  className?: string;
  as?: React.ElementType;
};

const RootContext = createContext<RootContextType | null>(null);
const ListContext = createContext<ListContextType | null>(null);

type ListContextType = {
  peers: Element[];
};

export function Root({
  duration = 500,
  vertical = false,
  fluid = false,
  as: Component = "div",
  children,
  className,
  ...props
}: RootProps) {
  const [isReady, setReady] = useState(false);
  const [isMounted, setMounted] = useState(false);
  const [activeItem, setActiveItem] = useState({
    index: -1,
    size: 0,
    position: 0,
  });

  function setActive(index: number, size: number, position: number) {
    setActiveItem({
      index,
      size,
      position,
    });
    setReady(true);
  }

  const context = {
    setActive,
    activeItem,
    isReady,
    setMounted,
    isMounted,
    isFluid: fluid,
    isVertical: vertical,
    duration,
  };

  return (
    <RootContext.Provider value={context}>
      <Component className={cn("relative", className)} {...props}>
        {typeof children === "function"
          ? children({
              ready: isReady,
              position: `${activeItem.position}px`,
              duration: `${duration}ms`,
              size: `${activeItem.size}px`,
            })
          : children}
      </Component>
    </RootContext.Provider>
  );
}

export type NavProps = {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
};

export function Nav({
  as: Component = "div",
  children,
  className,
  ...props
}: NavProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const [childElements, setChildElements] = useState<Element[]>([]);

  useEffect(() => {
    if (container.current) {
      const updateChildren = () => {
        setChildElements(Array.from(container.current?.children || []));
      };

      // Initial update
      updateChildren();

      // Create observer to watch for changes
      const observer = new MutationObserver(updateChildren);

      observer.observe(container.current, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  }, []);

  const context: ListContextType = { peers: childElements };

  return (
    <ListContext.Provider value={context}>
      <Component ref={container} className={className} {...props}>
        {children}
      </Component>
    </ListContext.Provider>
  );
}

export type ItemProps = {
  onActivated?: () => void;
  active?: boolean;
  as?: React.ElementType;
  children:
    | React.ReactNode
    | ((props: {
        setActive: (event: React.MouseEvent | undefined) => void;
        isActive: boolean;
      }) => React.ReactNode);
  className?: string;
};

export function Item({
  onActivated = () => {},
  active = false,
  as: Component = "div",
  children,
  className,
  ...props
}: ItemProps) {
  const rootContext = useContext(RootContext);
  const listContext = useContext(ListContext);
  const container = useRef<HTMLDivElement | null>(null);
  const [itemIndex, setItemIndex] = useState<number>(-1);

  // Calculate index after the ref is set
  useEffect(() => {
    if (container.current && listContext?.peers) {
      const idx = listContext.peers.indexOf(container.current);
      setItemIndex(idx);
    }
  }, [listContext?.peers]);

  const isActive = useMemo(() => {
    return itemIndex === rootContext?.activeItem.index;
  }, [rootContext?.activeItem.index, itemIndex]);

  const handleSetActive = (event?: React.MouseEvent) => {
    if (!rootContext || itemIndex === -1) return;

    if (event) {
      event.preventDefault();
    }

    rootContext.setActive(
      itemIndex,
      container.current?.getBoundingClientRect().width ?? 0,
      container.current?.offsetLeft ?? 0
    );

    if (event) {
      setTimeout(() => onActivated(), rootContext.duration);
    }
  };

  // Set active state on mount if item should be active
  useEffect(() => {
    if (active && !isActive) {
      handleSetActive();
    }
  }, [active, isActive]);

  return (
    <Component
      ref={container}
      className={item({ isActive, className })}
      {...props}
    >
      {typeof children === "function"
        ? children({
            setActive: handleSetActive,
            isActive,
          })
        : children}
    </Component>
  );
}

export const Navigation = Object.assign(Root, { Nav, Item });
