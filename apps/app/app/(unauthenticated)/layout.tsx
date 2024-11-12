import { webUrl } from '@repo/design-system/lib/consts';
import { CommandIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

const AuthLayout = ({ children }: { children: ReactNode }) => (
  <div className=" bg-primary container relative grid h-dvh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
    <div className="relative hidden h-full flex-col bg-neutral-100 p-10 text-card-foreground lg:flex">
      <div className="relative z-20 flex items-center font-medium text-lg">
        <CommandIcon className="mr-2 h-6 w-6" />
        Formula
      </div>
      {/* <div className="absolute top-4 right-4">
        <ModeToggle />
      </div> */}
      <div className="relative z-20 mt-auto">
        <blockquote className="space-y-2">
          <p className="text-lg">
            &ldquo;This library has saved me countless hours of work and helped
            me deliver stunning designs to my clients faster than ever
            before.&rdquo;
          </p>
          <footer className="text-sm">Sofia Davis</footer>
        </blockquote>
      </div>
    </div>
    <div className="lg:p-8 text-card-foreground">
      <div className="mx-auto flex w-full max-w-[520px] flex-col justify-center space-y-6">
        {children}
        <p className="px-8 text-center text-card-foreground text-sm">
          By clicking continue, you agree to our{" "}
          <Link
            href={new URL("/legal/terms", webUrl).toString()}
            className="underline underline-offset-4 hover:text-card-foreground"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href={new URL("/legal/privacy", webUrl).toString()}
            className="underline underline-offset-4 hover:text-card-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  </div>
);

export default AuthLayout;
