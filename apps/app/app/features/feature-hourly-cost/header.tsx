import React from "react";
import {
  Combobox,
  SelectOption,
} from "@repo/design-system/components/ui/combobox";

import { useCurrencyStore } from "@/app/store/currency-store";
import { getTranslations } from "@/utils/translations";

type CurrencySwitchProps = {
  value: string;
  label: string;
  symbol: string;
};

export const Header = () => {
  const t = getTranslations();
  const { currencies, selectedCurrency, setSelectedCurrency } =
    useCurrencyStore();

  return (
    <div className="w-full flex items-center justify-end mb-2">
      <div>
        <Combobox
          searchPlaceholder={t.common["search"]}
          options={currencies.map((currency) => ({
            label: currency.code,
            value: currency.code,
            slot: (
              <b className="bg-neutral-900/15 w-7 h-7 flex items-center justify-center rounded-full">
                {currency.symbol}
              </b>
            ),
          }))}
          value={{
            label: selectedCurrency.label,
            value: selectedCurrency.code,
          }}
          onChange={(option: SelectOption | SelectOption[]) => {
            if (!Array.isArray(option)) {
              const currency = currencies.find((c) => c.code === option.value);
              if (currency) setSelectedCurrency(currency);
            }
          }}
          emptyMessage={t.common["not-found"]}
          triggerClassName="bg-transparent w-28 rounded-lg pl-1"
        />
      </div>
    </div>
  );
};
