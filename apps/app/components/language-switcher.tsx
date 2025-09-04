'use client';

import { useLocale } from '@/contexts/locale-context';
import { Button } from '@repo/design-system/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/design-system/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const LANGUAGES = {
  en: {
    name: 'English',
    flag: '🇺🇸',
  },
  'pt-BR': {
    name: 'Português (BR)',
    flag: '🇧🇷',
  },
} as const;

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {LANGUAGES[locale].flag} {LANGUAGES[locale].name}
          </span>
          <span className="sm:hidden">{LANGUAGES[locale].flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(LANGUAGES).map(([code, language]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLocale(code as keyof typeof LANGUAGES)}
            className={locale === code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}