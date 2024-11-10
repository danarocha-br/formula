import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

type Currency = {
  code: string;
  symbol: string;
  label: string;
};

interface CurrencyState {
  currencies: Currency[];
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
}

const defaultCurrencies: Currency[] = [
  { code: "USD", symbol: "$", label: "United States Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "BRL", symbol: "R$", label: "Brazilian Real" },
];

export const useCurrencyStore = create<CurrencyState>()(
  devtools(
    persist(
      (set) => ({
        currencies: defaultCurrencies,
        selectedCurrency: defaultCurrencies[0],
        setSelectedCurrency: (currency: Currency) =>
          set(() => ({ selectedCurrency: currency })),
      }),
      { name: "@formula.currency" }
    )
  )
);
