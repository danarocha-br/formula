import "@repo/design-system/styles/globals.css";
import { Toaster } from "@repo/design-system/components/ui/sonner";
import { TooltipProvider } from "@repo/design-system/components/ui/tooltip";
import { cn } from "@repo/design-system/lib/utils";
import { DesignSystemProvider } from "@repo/design-system/providers";
import { ClerkProvider } from "@repo/design-system/providers/clerk";
import { QueryProvider } from "@repo/design-system/providers/query-provider";
import { Analytics } from "@vercel/analytics/react";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";

import type { ReactNode } from "react";

const sans = localFont({
  src: "./fonts/Roobert.woff2",
  variable: "--font-sans",
  weight: "300 900",
});

// const sans = localFont({
//   src: "./fonts/Satoshi-Variable.woff2",
//   variable: "--font-sans",
//   weight: "300 900",
// });

type RootLayoutProperties = {
  readonly children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProperties) {
  return (
    <html
      lang={"en"}
      className={cn(
        sans.variable,
        GeistMono.variable,
        "touch-manipulation font-sans antialiased"
      )}
      suppressHydrationWarning
    >
      <body>
        <QueryProvider>
          <DesignSystemProvider>
            <ClerkProvider>
              <TooltipProvider>{children}</TooltipProvider>
              <Toaster />
              <Analytics />
            </ClerkProvider>
          </DesignSystemProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
