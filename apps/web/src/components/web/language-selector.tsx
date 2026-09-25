'use client';

import { ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rentingi/ui';
import { type SupportedLocale, supportedLocales } from '@/i18n/routing';
import { setLocaleCookie } from '@/lib/locale';

const localeFlag: Record<SupportedLocale, string> = {
  en: '🇺🇸',
  rw: '🇷🇼',
  fr: '🇫🇷',
};

const localeLabel: Record<SupportedLocale, string> = {
  en: 'English',
  rw: 'Kinyarwanda',
  fr: 'Français',
};

function switchLocaleInPath(pathname: string, locale: SupportedLocale): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return `/${locale}`;
  if (supportedLocales.includes(segments[0] as SupportedLocale)) {
    segments[0] = locale;
    return `/${segments.join('/')}`;
  }
  return `/${locale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

type LanguageSelectorProps = {
  locale: SupportedLocale;
  onLocaleChange?: (locale: SupportedLocale) => void;
  /** Light canvas, or dark green chrome like the header/footer */
  variant?: 'light' | 'dark' | 'brand';
};

export function LanguageSelector({ locale, onLocaleChange, variant = 'light' }: LanguageSelectorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isDark = variant === 'dark' || variant === 'brand';

  function handleLocaleSelect(nextLocale: SupportedLocale) {
    if (nextLocale === locale) return;
    if (onLocaleChange) {
      onLocaleChange(nextLocale);
      return;
    }
    setLocaleCookie(nextLocale);
    router.replace(switchLocaleInPath(pathname ?? '', nextLocale));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
            isDark
              ? 'text-white hover:bg-white/10'
              : 'text-muted-foreground hover:bg-muted'
          }`}
          aria-label="Select language"
        >
          <span className="text-lg leading-none">{localeFlag[locale]}</span>
          <ChevronDown className={`h-4 w-4 ${isDark ? 'text-white/80' : 'text-muted-foreground'}`} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`min-w-[10rem] border border-border bg-card text-foreground`}
      >
        {supportedLocales.map((candidate) => (
          <DropdownMenuItem
            key={candidate}
            onClick={() => handleLocaleSelect(candidate)}
            className={`flex cursor-pointer items-center gap-2 ${
              candidate === locale
                ? 'bg-brand-soft text-brand'
                : 'focus:bg-brand-soft'
            }`}
          >
            <span className="text-lg">{localeFlag[candidate]}</span>
            <span>{localeLabel[candidate]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
