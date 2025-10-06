import SignIn from "@/app/features/feature-sign-in";
import type { Locale } from "@/contexts/locale-context";
import { getTranslations } from "@/utils/translations";
import { createMetadata } from "@repo/design-system/lib/metadata";
import type { Metadata } from "next";
import { cookies } from "next/headers";

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
const title = translations.auth.welcomeBack;
const description = translations.auth.signInDescription;

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
