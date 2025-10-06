import '@repo/design-system/styles/globals.css';
import { type Locale, LocaleProvider } from '@/contexts/locale-context';
import { Toaster } from '@repo/design-system/components/ui/sonner';
import { TooltipProvider } from '@repo/design-system/components/ui/tooltip';
import { cn } from '@repo/design-system/lib/utils';
import { DesignSystemProvider } from '@repo/design-system/providers';
import { ClerkProvider } from '@repo/design-system/providers/clerk';
import { Analytics } from '@vercel/analytics/react';
import { GeistMono } from 'geist/font/mono';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';
import { QueryProviderWrapper } from './components/query-provider-wrapper';

import type { ReactNode } from 'react';

const sans = localFont({
  src: './fonts/Roobert.woff2',
  variable: '--font-sans',
  weight: '300 900',
});

// const sans = localFont({
//   src: "./fonts/Satoshi-Variable.woff2",
//   variable: "--font-sans",
//   weight: "300 900",
// });

type RootLayoutProperties = {
  readonly children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProperties) {
  // Get locale from cookies
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  const initialLocale = (
    localeCookie?.value === 'pt-BR' ? 'pt-BR' : 'en'
  ) as Locale;

  return (
    <html
      lang={initialLocale}
      className={cn(
        sans.variable,
        GeistMono.variable,
        'touch-manipulation font-sans antialiased'
      )}
      suppressHydrationWarning
    >
      <body>
        <QueryProviderWrapper>
          <DesignSystemProvider>
            <ClerkProvider>
              <LocaleProvider initialLocale={initialLocale}>
                <TooltipProvider>{children}</TooltipProvider>
                <Toaster />
                <Analytics />
              </LocaleProvider>
            </ClerkProvider>
          </DesignSystemProvider>
        </QueryProviderWrapper>
      </body>
    </html>
  );
}
