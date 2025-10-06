import type { Locale } from "@/contexts/locale-context";
import { getTranslations } from "@/utils/translations";
import { auth, currentUser } from "@clerk/nextjs/server";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { prefetchQueries } from "@repo/design-system/lib/server-prefetch";
import { QueryProvider } from "@repo/design-system/providers/query-provider";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactElement } from "react";
import { getBillableExpenses } from "../features/feature-billable-cost/server/get-billable-expenses";
import { FeatureHourlyCost } from "../features/feature-hourly-cost";
import { getFixedExpenses } from "../features/feature-hourly-cost/server/get-fixed-expenses";
import { getEquipmentExpenses } from "../features/feature-variable-cost/server/get-equipment-expenses";

// Helper function to get locale-aware translations
function getLocaleAwareTranslations() {
  try {
    const cookieStore = cookies();
    const locale = (cookieStore.get('NEXT_LOCALE')?.value as Locale) || 'en';
    return getTranslations(locale);
  } catch {
    // Fallback to English if cookies are not available
    return getTranslations('en');
  }
}

const translations = getLocaleAwareTranslations();
const title = translations.app.title;
const description = translations.app.description;

export const metadata: Metadata = {
  title,
  description,
};

const App = async (): Promise<ReactElement> => {
  const user = await currentUser();
  const { redirectToSignIn } = await auth();

  if (!user) {
    redirectToSignIn();
    throw new Error(translations.auth.userNotAuthenticated);
  }

  // Prefetch all expense data on the server
  const dehydratedState = await prefetchQueries([
    {
      queryKey: reactQueryKeys.fixedExpenses.byUserId(
        user.id
      ) as unknown as unknown[],
      queryFn: () => getFixedExpenses(user.id),
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    {
      queryKey: reactQueryKeys.billableExpenses.byUserId(
        user.id
      ) as unknown as unknown[],
      queryFn: () => getBillableExpenses(user.id),
      staleTime: 3 * 60 * 1000, // 3 minutes
    },
    {
      queryKey: reactQueryKeys.equipmentExpenses.byUserId(
        user.id
      ) as unknown as unknown[],
      queryFn: () => getEquipmentExpenses(user.id),
      staleTime: 10 * 60 * 1000, // 10 minutes
    },
  ]);

  return (
    <QueryProvider dehydratedState={dehydratedState}>
      <main className="pt-2">
        <FeatureHourlyCost userId={user.id} />
      </main>
    </QueryProvider>
  );
};

export default App;
