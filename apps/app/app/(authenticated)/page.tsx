import type { Metadata } from "next";
import { type ReactElement } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { FeatureHourlyCost } from "../features/feature-hourly-cost";

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

  return (
    <main className="pt-2">
      <FeatureHourlyCost userId={user.id} />
    </main>
  );
};

export default App;
