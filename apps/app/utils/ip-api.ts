import { NextRequest } from 'next/server';

type IpapiResponse = {
  country_code: string;
  country_name: string;
  languages: string;
  error?: boolean;
  reason?: string;
};

export const LANGUAGE_MAP: { [key: string]: string } = {
  BR: "pt-BR",
  PT: "pt-BR",
  AO: "pt-BR",
  MZ: "pt-BR",
  CV: "pt-BR",
  default: "en",
};

const ipCache = new Map<string, { country: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000;
let lastRequestTimestamp = 0;

export function getIPAddress(request: NextRequest): string {
  // Try getting IP from various headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    // Get the first IP if there are multiple in x-forwarded-for
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP.trim();
  }

  // If no IP found in headers, return a default
  return "127.0.0.1";
}

export async function getCountryFromIP(ip: string): Promise<string> {
  try {
    // Check cache
    const cachedResult = ipCache.get(ip);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      return cachedResult.country;
    }

    // Basic rate limiting
    const now = Date.now();
    if (now - lastRequestTimestamp < 1000) {
      return "default";
    }
    lastRequestTimestamp = now;

    // Skip API call for localhost
    if (ip === "127.0.0.1") {
      return "default";
    }

    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data: IpapiResponse = await response.json();
    if (data.error) throw new Error(data.reason || "API error");

    // Cache result
    ipCache.set(ip, {
      country: data.country_code,
      timestamp: Date.now(),
    });

    return data.country_code;
  } catch (error) {
    console.error("Error detecting country:", error);
    return "default";
  }
}

