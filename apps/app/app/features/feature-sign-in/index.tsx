"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
          card: "w-full space-y-6 rounded-xl border bg-card px-6 py-10 shadow-sm",
          headerTitle: "hidden",
          headerSubtitle: "hidden",
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
        },
      }}
      signUpUrl="/sign-up"
    />
  );
}