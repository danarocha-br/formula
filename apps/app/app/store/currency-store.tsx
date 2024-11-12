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
  // Major Global Reserve Currencies
  { code: "USD", symbol: "$", label: "United States Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "GBP", symbol: "£", label: "British Pound" },

  // Other Major Currencies
  { code: "CHF", symbol: "CHF", label: "Swiss Franc" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },

  // Important Asian Currencies
  { code: "CNY", symbol: "¥", label: "Chinese Yuan" },
  { code: "HKD", symbol: "HK$", label: "Hong Kong Dollar" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "KRW", symbol: "₩", label: "South Korean Won" },

  // Emerging Market Currencies
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "BRL", symbol: "R$", label: "Brazilian Real" },
  { code: "RUB", symbol: "₽", label: "Russian Ruble" },
  { code: "MXN", symbol: "$", label: "Mexican Peso" },

  // Other Notable Currencies
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona" },
  { code: "NOK", symbol: "kr", label: "Norwegian Krone" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
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
