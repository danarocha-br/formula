"use client";

import { useLocale } from "@/contexts/locale-context";
import { Dropdown } from "@repo/design-system/components/ui/dropdown-menu";
import { Icon } from '@repo/design-system/components/ui/icon';
import { cn } from '@repo/design-system/lib/utils';
import { Globe } from "lucide-react";

const LANGUAGES = {
  en: {
    name: "English",
    flag: "🇺🇸",
  },
  "pt-BR": {
    name: "Português (BR)",
    flag: "🇧🇷",
  },
} as const;

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <Dropdown.Menu>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-2 py-2 rounded-full group-hover:bg-ring/10 text-sm hover:bg-ring/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-900"
        >
          <Globe className="size-4" />
          <span className="hidden sm:inline">{LANGUAGES[locale].flag === '🇧🇷' ? 'PT' : 'EN'}</span>
          {/* <span className="sm:hidden">{LANGUAGES[locale].flag}</span> */}
          <Icon
            name="down"
            label="open menu"
            size="xs"
            color="current"
            className="ml-auto shrink-0"
          />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Content align="end">
        {Object.entries(LANGUAGES).map(([code, language]) => (
          <Dropdown.Item
            key={code}
            onClick={() => setLocale(code as keyof typeof LANGUAGES)}
            className={cn(

              locale === code ? "bg-accent text-accent-foreground font-medium" : "")}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown.Menu>
  );
}
