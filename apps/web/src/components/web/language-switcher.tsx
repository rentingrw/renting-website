'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { type SupportedLocale, supportedLocales } from '@/i18n/routing';
import { setLocaleCookie } from '@/lib/locale';

function switchLocaleInPath(pathname: string, locale: SupportedLocale): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return `/${locale}`;
  }

  if (supportedLocales.includes(segments[0] as SupportedLocale)) {
    segments[0] = locale;
    return `/${segments.join('/')}`;
  }

  return `/${locale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

type LanguageSwitcherProps = {
  locale: SupportedLocale;
  dark?: boolean;
};

export function LanguageSwitcher({ locale, dark }: LanguageSwitcherProps) {
  const pathname = usePathname();
  return (
    <div
      className={`flex items-center gap-1 rounded-lg border p-1 ${
        dark ? 'border-zinc-700 bg-zinc-800/80' : 'bg-muted/50'
      }`}
    >
      {supportedLocales.map((candidate) => {
        const active = candidate === locale;
        const href = switchLocaleInPath(pathname ?? '', candidate);
        return (
          <Link
            key={candidate}
            href={href}
            onClick={() => setLocaleCookie(candidate)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium uppercase transition sm:px-3 ${
              dark
                ? active
                  ? 'bg-emerald-500 text-white'
                  : 'text-zinc-400 hover:bg-muted hover:text-foreground'
                : active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {candidate}
          </Link>
        );
      })}
    </div>
  );
}
