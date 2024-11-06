"use client";

import { cn } from "@repo/design-system/lib/utils";
import { Navigation } from "@repo/design-system/components/ui/navigation";
import { usePathname, useRouter } from "next/navigation";

type HeaderProps = {
  items: {
    href: string;
    label: string;
    icon?: React.ReactNode;
  }[];
};

export const Header = ({ items }: HeaderProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const navigate = (href: string) => {
    router.push(href);
  };

  return (
    <header className="bg-subdued h-12 w-full flex gap-2 rounded-md items-center justify-between px-2">
      <Navigation as="nav">
        {({ ready, size, position, duration }) => (
          <div className="relative">
            <div
              style={
                {
                  ["--size" as string]: size,
                  ["--position" as string]: position,
                  ["--duration" as string]: duration,
                } as React.CSSProperties
              }
              className={cn(
                { hidden: !ready },
                "absolute inset-y-0 left-0 h-full w-[--size] translate-x-[--position] rounded-[10px] bg-background transition-[width,transform] duration-[--duration]"
              )}
            />

            <Navigation.Nav
              as="ul"
              className="relative flex items-center gap-2"
            >
              {items.map((item, index) => {
                const isActive = item.href === pathname;
                return (
                  <Navigation.Item
                    key={item.href + index}
                    as="li"
                    active={isActive}
                    onActivated={() => navigate(item.href)}
                  >
                    {({ setActive }) => (
                      <button onClick={setActive}>
                        {item.icon && item.icon}
                        <span>{item.label}</span>
                      </button>
                    )}
                  </Navigation.Item>
                );
              })}
            </Navigation.Nav>
          </div>
        )}
      </Navigation>
    </header>
  );
};
