
import {
  Combobox,
  type SelectOption,
} from "@repo/design-system/components/ui/combobox";

import { useCurrencyStore } from "@/app/store/currency-store";
import { useTranslations } from "@/hooks/use-translation";

type CurrencySwitchProps = {
  value: string;
  label: string;
  symbol: string;
};

export const Header = () => {
  const { t } = useTranslations();
  const { currencies, selectedCurrency, setSelectedCurrency } =
    useCurrencyStore();

  return (
    <div className='mb-2 flex w-full items-center justify-end'>
      <div>
        <Combobox
          searchPlaceholder={t("common.search")}
          options={currencies.map((currency) => ({
            label: currency.code,
            value: currency.code,
            slot: (
              <b className='flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900/15'>
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
          emptyMessage={t("common.not-found")}
          triggerClassName="bg-transparent w-28 rounded-lg pl-1"
        />
      </div>
    </div>
  );
};
