import { AppConfig, SupportedLocale } from '@/middleware';
import { NextRequest } from 'next/server';

type LocaleSource = "user" | "cookie" | "browser" | "geoip" | "default";

interface LocaleResult {
  locale: SupportedLocale;
  source: LocaleSource;
}

interface GeoStrategy {
  country: string;
  city?: string;
  timezone?: string;
}

// Using a service like MaxMind or Cloudflare
async function getLocaleFromGeoIP(ip: string): Promise<SupportedLocale> {
  const response = await fetch(`https://geo.api.example.com/${ip}`);
  const geo: GeoStrategy = await response.json();

  // Map country to locale
  const countryToLocale: Record<string, SupportedLocale> = {
    BR: "pt-BR",
    US: "en",
    // ... other mappings
  };

  return countryToLocale[geo.country] || AppConfig.defaultLocale;
}

function getBrowserLocale(req: NextRequest): SupportedLocale {
  const acceptLanguage = req.headers.get("Accept-Language");
  // Parse Accept-Language header (like we did in the middleware)
}

async function detectUserLocale(req: NextRequest): Promise<LocaleResult> {
  // 1. Check user's explicit selection from cookies
  const cookieLocale = req.cookies.get("userLocale")?.value;
  if (
    cookieLocale &&
    AppConfig.locales.includes(cookieLocale as SupportedLocale)
  ) {
    return { locale: cookieLocale as SupportedLocale, source: "cookie" };
  }

  // 2. Check Accept-Language header
  const browserLocale = getBrowserLocale(req);
  if (browserLocale) {
    return { locale: browserLocale, source: "browser" };
  }

  // 3. Fallback to GeoIP
  try {
    const ip = req.ip || req.headers.get("x-forwarded-for")?.split(",")[0];
    if (ip) {
      const geoLocale = await getLocaleFromGeoIP(ip);
      return { locale: geoLocale, source: "geoip" };
    }
  } catch (error) {
    console.error("GeoIP detection failed:", error);
  }

  // 4. Ultimate fallback
  return { locale: AppConfig.defaultLocale, source: "default" };
}
