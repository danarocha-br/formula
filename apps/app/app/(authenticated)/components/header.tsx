"use client";

import { cn } from "@repo/design-system/lib/utils";
import { Navigation } from "@repo/design-system/components/ui/navigation";
import { usePathname, useRouter } from "next/navigation";
import { useCurrencyStore } from "@/app/store/currency-store";
import {
  Combobox,
  SelectOption,
} from "@repo/design-system/components/ui/combobox";
import { getTranslations } from "@/utils/translations";
import { UserButton } from "@clerk/nextjs";
import { DockNavigation } from "./dock";

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
  const { currencies, selectedCurrency, setSelectedCurrency } =
    useCurrencyStore();
  const t = getTranslations();

  const navigate = (href: string) => {
    router.push(href);
  };

  return (
    <header className="bg-subdued h-12 w-full flex gap-2 rounded-md items-center justify-between px-2">
      <Navigation as="nav" className='w-auto'>
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

      <DockNavigation />

      <div className="flex items-center gap-2">
        <div>
          <Combobox
            searchPlaceholder={t.common["search"]}
            options={currencies
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((currency) => ({
                label: currency.code,
                value: currency.code,
                slot: (
                  <b className="text-xs bg-neutral-900/15 w-8 h-8 flex items-center justify-center rounded-full">
                    {currency.symbol}
                  </b>
                ),
              }))}
            value={{
              label: selectedCurrency.code,
              value: selectedCurrency.code,
            }}
            onChange={(option: SelectOption | SelectOption[]) => {
              if (!Array.isArray(option)) {
                const currency = currencies.find(
                  (c) => c.code === option.value
                );
                if (currency) setSelectedCurrency(currency);
              }
            }}
            emptyMessage={t.common["not-found"]}
            triggerClassName="bg-transparent w-24 rounded-md pl-1 mr-6 text-foreground"
          />
        </div>

        <UserButton
          showName
          appearance={{
            elements: {
              rootBox: "flex items-center",
              userButtonBox: "items-center justify-center pr-2.5 ",
              userButtonTrigger: "rounded-full",
              userButtonOuterIdentifier: "truncate p-0",
            },
          }}
        />
      </div>
    </header>
  );
};
