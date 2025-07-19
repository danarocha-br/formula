import type { Metadata } from "next";
import { type ReactElement } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { QueryProvider } from "@repo/design-system/providers/query-provider";
import { prefetchQueries } from "@repo/design-system/lib/server-prefetch";
import { reactQueryKeys } from "@repo/database/cache-keys/react-query-keys";
import { FeatureHourlyCost } from "../features/feature-hourly-cost";
import { getFixedExpenses } from "../features/feature-hourly-cost/server/get-fixed-expenses";
import { getBillableExpenses } from "../features/feature-billable-cost/server/get-billable-expenses";
import { getEquipmentExpenses } from "../features/feature-variable-cost/server/get-equipment-expenses";

const title = "Formula by Compasso";
const description = "Manage your expenses";

export const metadata: Metadata = {
  title,
  description,
};

const App = async (): Promise<ReactElement> => {
  const user = await currentUser();
  const { redirectToSignIn } = await auth();

  if (!user) {
    redirectToSignIn();
    throw new Error("User is not authenticated.");
  }

  // Prefetch all expense data on the server
  const dehydratedState = await prefetchQueries([
    {
      queryKey: reactQueryKeys.fixedExpenses.byUserId(user.id),
      queryFn: () => getFixedExpenses(user.id),
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    {
      queryKey: reactQueryKeys.billableExpenses.byUserId(user.id),
      queryFn: () => getBillableExpenses(user.id),
      staleTime: 3 * 60 * 1000, // 3 minutes
    },
    {
      queryKey: reactQueryKeys.equipmentExpenses.byUserId(user.id),
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
