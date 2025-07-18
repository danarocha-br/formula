'use client';

import { ClerkProvider as ClerkProviderRaw } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import type { Theme } from '@clerk/types';
import { useTheme } from 'next-themes';
import Script from 'next/script';
import type { ComponentProps } from 'react';
import { tailwind } from '../lib/tailwind';

export const ClerkProvider = (
  props: ComponentProps<typeof ClerkProviderRaw>
) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const baseTheme = isDark ? dark : undefined;
  const variables: Theme['variables'] = {
    // Core
    fontFamily: tailwind.theme.fontFamily.sans.join(', '),
    fontFamilyButtons: tailwind.theme.fontFamily.sans.join(', '),
    fontSize: tailwind.theme.fontSize.sm[0],
    fontWeight: {
      bold: tailwind.theme.fontWeight.bold,
      normal: tailwind.theme.fontWeight.normal,
      medium: tailwind.theme.fontWeight.medium,
    },
    spacingUnit: tailwind.theme.spacing[4],
  };

  const elements: Theme['elements'] = {
    dividerLine: 'bg-border',
    socialButtonsIconButton: 'bg-card',
    navbarButton: 'text-foreground',
    organizationSwitcherTrigger__open: 'bg-background',
    organizationPreviewMainIdentifier: 'text-foreground',
    organizationSwitcherTriggerIcon: 'text-muted-foreground',
    organizationPreview__organizationSwitcherTrigger: 'gap-2',
    organizationPreviewAvatarContainer: 'shrink-0',
    formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    card: 'bg-card shadow-sm border',
    formFieldInput: 'border rounded-sm py-1.5 px-2.5',
    formFieldLabel: 'text-sm font-medium',
    footerActionLink: 'text-primary hover:text-primary/90',
  };

  // Add a global script to make Clerk Elements work
  return (
    <>
      <Script id="clerk-elements-polyfill">
        {`
          window.global = window;
          window.process = { env: {} };
          window.Buffer = undefined;
        `}
      </Script>
      <ClerkProviderRaw
        {...props}
        appearance={{ baseTheme, variables, elements }}
      >
        {props.children}
      </ClerkProviderRaw>
    </>
  );
};
