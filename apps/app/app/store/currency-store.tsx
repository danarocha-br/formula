import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

type Currency = {
  code: string;
  symbol: string;
  label: string;
  locale: string;
};

interface CurrencyState {
  currencies: Currency[];
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
}

const defaultCurrencies: Currency[] = [
  // Major Global Reserve Currencies
  { code: "USD", symbol: "$", label: "United States Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", label: "Euro", locale: "de-DE" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen", locale: "ja-JP" },
  { code: "GBP", symbol: "£", label: "British Pound", locale: "en-GB" },


  // Other Major Currencies
  { code: "CHF", symbol: "CHF", label: "Swiss Franc", locale: "de-CH" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar", locale: "en-CA" },

  // Important Asian Currencies
  { code: "CNY", symbol: "¥", label: "Chinese Yuan", locale: "zh-CN" },
  { code: "HKD", symbol: "HK$", label: "Hong Kong Dollar", locale: "zh-HK" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar", locale: "zh-SG" },
  { code: "KRW", symbol: "₩", label: "South Korean Won", locale: "ko-KR" },

  // Emerging Market Currencies
  { code: "INR", symbol: "₹", label: "Indian Rupee", locale: "hi-IN" },
  { code: "BRL", symbol: "R$", label: "Brazilian Real", locale: "pt-BR" },
  { code: "RUB", symbol: "₽", label: "Russian Ruble", locale: "ru-RU" },
  { code: "MXN", symbol: "$", label: "Mexican Peso", locale: "es-MX" },

  // Other Notable Currencies
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar", locale: "en-NZ" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona", locale: "sv-SE" },
  { code: "NOK", symbol: "kr", label: "Norwegian Krone", locale: "nb-NO" },
  { code: "ZAR", symbol: "R", label: "South African Rand", locale: "en-ZA" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham", locale: "ar-AE" },
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
