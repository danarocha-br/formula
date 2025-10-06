import type { Locale } from "@/contexts/locale-context";
import { getTranslations } from "@/utils/translations";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactElement } from "react";

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
const description = translations.app.projectDescription;

export const metadata: Metadata = {
  title,
  description,
};

const ProjectsPage = async (): Promise<ReactElement> => {
  return <main className="pt-2">projects</main>;
};

export default ProjectsPage;
