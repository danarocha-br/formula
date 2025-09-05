import type { Locale } from '@/contexts/locale-context';
import { getTranslations } from '@/utils/translations';
import { auth, currentUser } from "@clerk/nextjs/server";
import { Icon } from "@repo/design-system/components/ui/icon";
import { showBetaFeature } from "@repo/feature-flags";
import { cookies } from 'next/headers';
import type { ReactElement, ReactNode } from "react";
import { Header } from "./components/header";
import { OnboardingProvider } from "./components/onboarding-provider";
import { PostHogIdentifier } from "./components/posthog-identifier";

type AppLayoutProperties = {
  readonly children: ReactNode;
};

const AppLayout = async ({
  children,
}: AppLayoutProperties): Promise<ReactElement> => {
  const user = await currentUser();
  const { redirectToSignIn } = await auth();
  const betaFeature = await showBetaFeature();

  // Get locale from cookies
  const cookieStore = cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value as Locale) || 'en';
  const t = getTranslations(locale);

  if (!user) {
    redirectToSignIn();
  }

  return (
    <OnboardingProvider>
      <div className="p-2">
        <Header
          items={[
            {
              href: "/",
              label: t.navigation["top-level"]["hourly-rate"],
              icon: <Icon label={t.navigation["top-level"]["hourly-rate"]} name="time" color="current" />,
            },
            {
              href: "/project",
              label: t.navigation["top-level"]["project-rate"],
              icon: <Icon label={t.navigation["top-level"]["project-rate"]} name="project" color="current" />,
            },
          ]}
        />
        {/* {betaFeature && (
          <div className="m-4 rounded-full bg-success p-1.5 text-center text-sm text-success-foreground">
            Beta feature now available
          </div>
        )} */}
        {children}
        <PostHogIdentifier />
      </div>
    </OnboardingProvider>
  );
};

export default AppLayout;
