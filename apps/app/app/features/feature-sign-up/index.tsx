"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
          card: "w-full sm:w-96",
          headerTitle: "font-semibold text-2xl tracking-tight",
          headerSubtitle: "text-sm",
          socialButtonsBlockButton: "flex items-center justify-center gap-x-3 rounded-sm border px-2.5 py-1.5 font-medium shadow-sm",
          formFieldInput: "w-full rounded-sm border px-2.5 py-1.5",
          formFieldLabel: "font-medium text-sm",
          footerActionLink: "text-primary hover:text-primary/90",
          socialButtonsIconButton: "size-4",
          socialButtonsProviderIcon__google: "size-4",
          socialButtonsProviderIcon__github: "size-4",
        },
        layout: {
          socialButtonsPlacement: "top",
          socialButtonsVariant: "blockButton",
          termsPageUrl: "https://clerk.com/terms",
          privacyPageUrl: "https://clerk.com/privacy",
        },
      }}
      signInUrl="/sign-in"
    />
  );
}