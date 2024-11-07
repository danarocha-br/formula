import { FixedCostExpensesRepository } from "@repo/database";

import type { Metadata } from "next";
import { type ReactElement } from "react";
import { FeatureHourlyCost } from "./features/feature-hourly-cost";
import { auth, currentUser } from "@clerk/nextjs/server";

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

  const fixedCostExpensesRepository = new FixedCostExpensesRepository();
  const fixedCostExpenses = await fixedCostExpensesRepository.findByUserId(
    user.id
  );

  return (
    <main className="pt-2">
      <FeatureHourlyCost expenses={fixedCostExpenses ?? []} />
    </main>
  );
};

export default App;
