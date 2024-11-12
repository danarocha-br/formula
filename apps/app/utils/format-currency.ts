import { Locale } from "@/app/types";

interface FormatCurrencyOptions {
  locale?: Locale;
  currency?: string;
  decimals?: number;
}

/**
 * Formats a number as currency based on locale preferences
 * @param amount - The amount to format
 * @param options - Formatting options including locale, currency code, and decimal places
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  options: FormatCurrencyOptions = {}
): string => {
  const { currency = "USD", decimals = 2 } = options;

  const locale = (() => {
    switch (currency) {
      // Major Global Reserve Currencies
      case "USD":
        return "en-US";
      case "EUR":
        return "de-DE";
      case "JPY":
        return "ja-JP";
      case "GBP":
        return "en-GB";

      // Other Major Currencies
      case "CHF":
        return "de-CH";
      case "AUD":
        return "en-AU";
      case "CAD":
        return "en-CA";

      // Important Asian Currencies
      case "CNY":
        return "zh-CN";
      case "HKD":
        return "zh-HK";
      case "SGD":
        return "en-SG";
      case "KRW":
        return "ko-KR";

      // Emerging Market Currencies
      case "INR":
        return "en-IN";
      case "BRL":
        return "pt-BR";
      case "RUB":
        return "ru-RU";
      case "MXN":
        return "es-MX";

      // Other Notable Currencies
      case "NZD":
        return "en-NZ";
      case "SEK":
        return "sv-SE";
      case "NOK":
        return "nb-NO";
      case "ZAR":
        return "en-ZA";
      case "AED":
        return "ar-AE";

      default:
        return "en-US";
    }
  })();

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch (error) {
    // Fallback to default US format if there's an error
    console.error("Currency formatting error:", error);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
};

/**
 * Helper function to format currency using the current locale from the store
 * @param amount - The amount to format
 * @param currency - Optional currency code
 * @returns Formatted currency string
 */
export const formatLocaleCurrency = (
  amount: number,
  currency?: string
): string => {
  // You would typically get the current locale from your currency store here
  // const currentLocale = getCurrentLocale(); // Implement this based on your store

  return formatCurrency(amount, {
    // locale: currentLocale,
    currency: currency,
  });
};
