"use client";

import { useCurrencyStore } from "@/app/store/currency-store";
import { usePanelToggleStore } from "@/app/store/panel-toggle-store";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "@/hooks/use-translation";
import { UserButton } from "@clerk/nextjs";
import {
  Combobox,
  type SelectOption,
} from "@repo/design-system/components/ui/combobox";
import { IconButton } from "@repo/design-system/components/ui/icon-button";
import { Navigation } from "@repo/design-system/components/ui/navigation";
import { cn } from "@repo/design-system/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
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
  const { isBillablePanelVisible, toggleBillablePanel } = usePanelToggleStore();
  const { t } = useTranslations();

  const navigate = (href: string) => {
    router.push(href);
  };

  return (
    <header className="flex h-12 w-full items-center justify-between gap-2 rounded-md bg-subdued px-2">
      <Navigation
        as="div"
        className="flex w-auto items-center justify-between bg-subdued"
      >
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
              <li>
                <IconButton
                  label="Open settings"
                  icon="panel-left"
                  className="bg-transparent hover:bg-neutral-600"
                />
              </li>

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
                      <button
                        type="button"
                        onClick={setActive}
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-900"
                      >
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
          <LanguageSwitcher />
        </div>

        <div>
          <Combobox
            searchPlaceholder={t("common.search")}
            options={currencies
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((currency) => ({
                label: currency.code,
                value: currency.code,
                slot: (
                  <b className="flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-neutral-900 text-xs ">
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
                if (currency) {
                  setSelectedCurrency(currency);
                }
              }
            }}
            emptyMessage={t("common.not-found")}
            triggerClassName="bg-transparent group-hover:bg-ring/10 w-24 rounded-md pl-1 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-900 focus-visible:bg-transparent"
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

        <IconButton
          label={isBillablePanelVisible ? "Hide billable panel" : "Show billable panel"}
          icon="panel-right"
          className={cn(
            "bg-transparent hover:bg-neutral-600 transition-all duration-200 ease-in-out",
            "hover:scale-105 active:scale-95 focus:ring-2 focus:ring-purple-400/50",
            isBillablePanelVisible ? "text-purple-300" : "text-neutral-400"
          )}
          onClick={toggleBillablePanel}
        />
      </div>
    </header>
  );
};
