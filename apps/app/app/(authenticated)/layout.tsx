import type { ReactElement, ReactNode } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Icon } from "@repo/design-system/components/ui/icon";
import { showBetaFeature } from "@repo/feature-flags";
import { PostHogIdentifier } from "./components/posthog-identifier";
import { Header } from "./components/header";

type AppLayoutProperties = {
  readonly children: ReactNode;
};

const AppLayout = async ({
  children,
}: AppLayoutProperties): Promise<ReactElement> => {
  const user = await currentUser();
  const { redirectToSignIn } = await auth();
  const betaFeature = await showBetaFeature();

  if (!user) {
    redirectToSignIn();
  }

  return (
    <div className="p-2">
      <Header
        items={[
          {
            href: "/",
            label: "Hourly rate",
            icon: <Icon label="hourly cost" name="time" color="current" />,
          },
          {
            href: "/project",
            label: "Project rate",
            icon: <Icon label="project cost" name="project" color="current" />,
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
  );
};

export default AppLayout;
