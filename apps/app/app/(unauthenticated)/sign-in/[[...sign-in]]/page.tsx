import { createMetadata } from "@repo/design-system/lib/metadata";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import SignIn from "../../../features/feature-sign-in";

const title = "Welcome back";
const description = "Enter your details to sign in.";
// const SignIn = dynamic(() => import('@clerk/nextjs').then((mod) => mod.SignIn));

export const metadata: Metadata = createMetadata({ title, description });

const SignInPage = () => (
  <>
    <div className="flex flex-col space-y-2 text-center text-card-foreground">
      <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
      <p className="text-sm">{description}</p>
    </div>
    {/* <SignIn
      appearance={{
        elements: {
          header: "hidden",
        },
      }}
    /> */}
    <SignIn />
  </>
);

export default SignInPage;
