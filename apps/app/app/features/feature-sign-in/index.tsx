"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { Button } from '@repo/design-system/components/ui/button';

export default function SignInPage() {
  return (
    <SignIn.Root>
      <SignIn.Step
        name="start"
        className="bg-card w-full rounded-xl py-10 px-6 shadow-sm border space-y-6"
      >
        <div className="grid grid-cols-3 gap-x-4">
          <Clerk.Connection
            name="google"
            className="flex items-center gap-x-3 justify-center font-medium border shadow-sm py-1.5 px-2.5 rounded-sm"
          >
            <Clerk.Icon className="size-4" />
            Google
          </Clerk.Connection>
          <Clerk.Connection
            name="facebook"
            className="flex items-center gap-x-3 justify-center font-medium border shadow-sm py-1.5 px-2.5 rounded-sm"
          >
            <Clerk.Icon className="size-4" />
            Facebook
          </Clerk.Connection>
          <Clerk.Connection
            name="github"
            className="flex items-center gap-x-3 justify-center font-medium border shadow-sm py-1.5 px-2.5 rounded-sm"
          >
            <Clerk.Icon className="size-4" />
            GitHub
          </Clerk.Connection>
        </div>
        <Clerk.Field name="identifier" className="space-y-2">
          <Clerk.Label className="text-sm font-medium">Email</Clerk.Label>
          <Clerk.Input className="w-full border rounded-sm py-1.5 px-2.5" />
          <Clerk.FieldError className="block text-red-500 text-sm" />
        </Clerk.Field>
        <SignIn.Action
          submit
          // className="bg-primary w-full text-primary-foreground font-medium rounded-sm py-1.5 px-2.5"
          asChild
        >
          <Button>Continue</Button>
        </SignIn.Action>
      </SignIn.Step>
    </SignIn.Root>
  );
}
