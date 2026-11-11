'use client';

import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import {
  Car,
  ChevronLeft,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  Menu,
  Plane,
  Search,
  Truck,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type SupportedLocale } from '@/i18n/routing';
import { LanguageSelector } from './language-selector';

type AppHeaderProps = {
  locale: SupportedLocale;
  variant?: 'default' | 'dark';
};

const BANNER_DISMISS_DAYS = 7;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type SiteBanner = { id: string; message: string; ctaText?: string | null; ctaUrl?: string | null };

function fallbackHref(pathname: string, locale: string) {
  const parts = pathname.split('/').filter(Boolean);
  const section = parts[1];
  const nested = parts.length > 2;
  if (section === 'cars' && nested) return `/${locale}/cars`;
  if (section === 'drivers' && nested) return `/${locale}/drivers`;
  if (section === 'taxi-drivers' && nested) return `/${locale}/taxi-drivers`;
  if (section === 'app' && nested) return `/${locale}/app`;
  return `/${locale}`;
}

export function AppHeader({ locale }: AppHeaderProps) {
  const t = useTranslations('web');
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const home = `/${locale}`;
  const isHome = pathname === home || pathname === `${home}/`;

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref(pathname, locale));
  }
  const [banner, setBanner] = useState<SiteBanner | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    async function loadBanner() {
      try {
        const res = await fetch(`${API_BASE_URL}/banners/active`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as SiteBanner | null;
        if (!data) return;
        const dismissKey = `rentingi_banner_dismissed_${data.id}`;
        const raw = localStorage.getItem(dismissKey);
        if (!raw || Date.now() > Number(raw)) {
          setBanner(data);
          setBannerVisible(true);
        }
      } catch {
        // ignore — no banner is fine
      }
    }
    loadBanner();
  }, []);

  function dismissBanner() {
    if (!banner) return;
    const dismissKey = `rentingi_banner_dismissed_${banner.id}`;
    const until = Date.now() + BANNER_DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(dismissKey, String(until));
    setBannerVisible(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-ink text-white">
      {bannerVisible && banner && (
        <div className="relative border-b border-white/10 bg-white/10 px-4 py-2 text-center text-white">
          <p className="text-xs font-bold sm:text-sm">
            {banner.message}{' '}
            {banner.ctaText && banner.ctaUrl && (
              <Link href={banner.ctaUrl} className="underline decoration-2 hover:text-white">
                {banner.ctaText}
              </Link>
            )}
          </p>
          <button
            type="button"
            onClick={dismissBanner}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div>
        <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-1">
            {isHome ? null : (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex shrink-0 items-center rounded-full p-1.5 text-white transition hover:bg-white/10"
                aria-label={t('nav.back')}
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="hidden pr-1 text-sm font-semibold sm:inline">{t('nav.back')}</span>
              </button>
            )}
            <Link
              href={home}
              className="truncate text-lg font-black tracking-tight text-white sm:text-xl"
            >
              Renting<span className="text-white">.rw</span>
            </Link>
          </div>

          <nav className="hidden items-center gap-3 lg:flex">
            <Link href={`/${locale}/cars`} className="text-sm font-bold text-white/80 transition-colors hover:text-white">
              {t('nav.cars')}
            </Link>
            <Link href={`/${locale}/drivers`} className="text-sm font-bold text-white/80 transition-colors hover:text-white">
              {t('nav.drivers')}
            </Link>
            <Link href={`/${locale}/taxi-drivers`} className="text-sm font-bold text-white/80 transition-colors hover:text-white">
              {t('nav.taxi')}
            </Link>
            <Link href={`/${locale}/airport`} className="text-sm font-bold text-white/80 transition-colors hover:text-white">
              {t('nav.airport')}
            </Link>

            <LanguageSelector locale={locale} variant="dark" />

            {isSignedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/search`}
                  aria-label="Search"
                  className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <Search className="h-4 w-4" />
                </Link>
                <UserButton
                  afterSignOutUrl={`/${locale}`}
                  appearance={{ elements: { avatarBox: 'h-9 w-9 ring-2 ring-white rounded-full' } }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm font-semibold text-white/85 transition hover:text-white"
                  >
                    {t('auth.signIn')}
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-ink transition hover:bg-white/90"
                  >
                    {t('auth.createAccount')}
                  </button>
                </SignUpButton>
              </div>
            )}
            <HeaderMenu locale={locale} isSignedIn={Boolean(isSignedIn)} />
          </nav>

          <div className="flex shrink-0 items-center gap-1 lg:hidden">
            <Link
              href={`/${locale}/search`}
              aria-label="Search"
              className="rounded-full p-1.5 text-white"
            >
              <Search className="h-4 w-4" />
            </Link>
            {isSignedIn && (
              <UserButton
                afterSignOutUrl={`/${locale}`}
                appearance={{ elements: { avatarBox: 'h-9 w-9 ring-2 ring-white rounded-full' } }}
              />
            )}
            <HeaderMenu locale={locale} isSignedIn={Boolean(isSignedIn)} />
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderMenu({ locale, isSignedIn }: { locale: SupportedLocale; isSignedIn: boolean }) {
  const t = useTranslations('web');
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', onPointerDown);
    }, 0);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const browse = [
    { href: `/${locale}/cars`, label: t('nav.cars'), icon: Car },
    { href: `/${locale}/drivers`, label: t('nav.drivers'), icon: UserRound },
    { href: `/${locale}/taxi-drivers`, label: t('nav.taxi'), icon: Truck },
    { href: `/${locale}/airport`, label: t('nav.airport'), icon: Plane },
  ];
  const supply = [
    { href: `/${locale}/list-your-car`, label: t('nav.becomeHoster'), icon: Home },
    { href: `/${locale}/drive-with-us`, label: t('nav.becomeDriver'), icon: Car },
    { href: `/${locale}/onboard/taxi`, label: t('nav.becomeTaxi'), icon: Zap },
  ];
  const account = isSignedIn
    ? [
        { href: `/${locale}/app`, label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: `/${locale}/app/favorites`, label: t('nav.favorites'), icon: Heart },
      ]
    : [];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="shrink-0 rounded-full border border-white/25 p-1.5 text-white transition hover:bg-white/10"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: coords.top, right: Math.max(8, coords.right) }}
              className="fixed z-[80] max-h-[min(70vh,32rem)] w-[min(18rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl border border-border bg-card p-2 text-foreground shadow-lg"
            >
              <div className="flex flex-col">
                {browse.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-brand-soft lg:hidden"
                  >
                    <Icon className="h-4 w-4 text-brand" />
                    {label}
                  </Link>
                ))}
                {supply.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-brand-soft"
                  >
                    <Icon className="h-4 w-4 text-brand" />
                    {label}
                  </Link>
                ))}
                {account.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-brand-soft"
                  >
                    <Icon className="h-4 w-4 text-brand" />
                    {label}
                  </Link>
                ))}
                <Link
                  href={`/${locale}/how-it-works`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-brand-soft"
                >
                  <HelpCircle className="h-4 w-4 text-brand" />
                  {t('nav.whyRenting')}
                </Link>
                <Link
                  href={`/${locale}/about`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-brand-soft lg:hidden"
                >
                  {t('nav.about')}
                </Link>
                <Link
                  href={`/${locale}/careers`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-brand-soft lg:hidden"
                >
                  {t('nav.careers')}
                </Link>
                <div className="px-1 py-1 lg:hidden">
                  <LanguageSelector locale={locale} />
                </div>
                {!isSignedIn ? (
                  <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2 lg:hidden">
                    <SignInButton mode="modal">
                      <button
                        type="button"
                        className="w-full rounded-full border border-border px-3 py-1.5 text-sm font-bold text-foreground hover:bg-muted"
                      >
                        {t('auth.signIn')}
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button
                        type="button"
                        className="w-full rounded-full bg-brand px-3 py-1.5 text-sm font-bold text-white hover:bg-brand-hover"
                      >
                        {t('auth.createAccount')}
                      </button>
                    </SignUpButton>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
