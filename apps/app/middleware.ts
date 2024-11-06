import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

export const AppConfig = {
  locales: ["en", "pt-BR",] as const,
  defaultLocale: "en" as const,
} as const;

export type SupportedLocale = (typeof AppConfig.locales)[number];

function getPreferredLocale(req: NextRequest): SupportedLocale {
  try {
    // Check for cookie first
    const cookieLocale = req.cookies.get('@FORMULA-LOCALE')?.value;
    if (cookieLocale && AppConfig.locales.includes(cookieLocale as SupportedLocale)) {
      return cookieLocale as SupportedLocale;
    }

    const acceptLanguage = req.headers.get('Accept-Language');

    if (!acceptLanguage) return AppConfig.defaultLocale;

    const preferredLocales = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim());

    // Check for exact matches first
    for (const locale of preferredLocales) {
      if (AppConfig.locales.includes(locale as SupportedLocale)) {
        return locale as SupportedLocale;
      }
    }

    // Fall back to checking language part only
    for (const locale of preferredLocales) {
      const lang = locale.split('-')[0];
      const match = AppConfig.locales.find(supported => supported.startsWith(lang));
      if (match) return match;
    }

    return AppConfig.defaultLocale;
  } catch (error) {
    // If anything fails, return default locale
    console.error('Error in getPreferredLocale:', error);
    return AppConfig.defaultLocale;
  }
}

export default clerkMiddleware((auth, req: NextRequest) => {
  try {
    // For testing: Force pt-BR locale
    const response = NextResponse.next();
    response.cookies.set('@FORMULA-LOCALE', 'pt-BR');

    const userLocale = getPreferredLocale(req);
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-locale', userLocale);

    return NextResponse.next({
      headers: requestHeaders,
    });
  } catch (error) {
    console.error('Error in middleware:', error);
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
