'use client';

import type { ReactNode } from 'react';

import {
  SITE_ADMIN_URL,
  SITE_EMAIL,
  SITE_INSTAGRAM_URL,
  SITE_TIKTOK_URL,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_TEL,
  SITE_WHATSAPP_URL,
} from '@/lib/site-contact';
import { ArrowRight, Clock, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

type SiteFooterProps = {
  locale: string;
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.33.16 11.89c0 2.1.55 4.14 1.59 5.95L0 24l6.3-1.65a11.9 11.9 0 0 0 5.76 1.47h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.16-3.45-8.44zM12.07 21.8h-.01a9.88 9.88 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.64-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.04-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.6 5.82h2.37l-.01 3.34a4.77 4.77 0 0 1 3.83 3.62v2.52a8.29 8.29 0 0 1-3.82-1.19v7.12a6.76 6.76 0 1 1-6.77-6.77c.38 0 .75.03 1.11.09v2.58a4.2 4.2 0 0 0-1.11-.16 4.18 4.18 0 1 0 4.18 4.18V2h2.4a6.73 6.73 0 0 0 2.81 3.82Z" />
    </svg>
  );
}

const RWANDA_CITIES = [
  'Kigali',
  'Musanze',
  'Rubavu',
  'Rusizi',
  'Karongi',
  'Huye',
  'Muhanga',
  'Nyagatare',
  'Rwamagana',
  'Kayonza',
];

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-white/75 transition hover:text-white">
      {children}
    </Link>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
      <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-sun">{title}</h3>
      <ul className="space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

export function SiteFooter({ locale }: SiteFooterProps) {
  const t = useTranslations('web');
  const f = useTranslations('web.footer');

  return (
    <footer className="relative isolate overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="aurora-blob -left-32 -top-24 h-80 w-80 bg-[#2f8f5b]" style={{ opacity: 0.35 }} />
        <div className="aurora-blob -right-24 top-1/3 h-72 w-72 bg-[#d4a017]" style={{ opacity: 0.2 }} />
        <div className="hero-grid absolute inset-0 opacity-60" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pt-16">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-3xl font-black tracking-tight sm:text-4xl">
              Renting<span className="text-sun">.rw</span>
            </p>
            <p className="mt-2 text-base text-white/65">{f('tagline')}</p>
          </div>
          <Link
            href={`/${locale}/search`}
            className="group inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-ink transition hover:bg-sun"
          >
            {f('searchCta')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <FooterColumn title={f('about')}>
            <li>
              <FooterLink href={`/${locale}/about`}>{t('nav.about')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/how-it-works`}>{t('nav.whyRenting')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/faq`}>{f('faq')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/safety`}>{f('safety')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/careers`}>{t('nav.careers')}</FooterLink>
            </li>
          </FooterColumn>

          <FooterColumn title={f('platform')}>
            <li>
              <FooterLink href={`/${locale}/cars`}>{t('nav.cars')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/drivers`}>{t('nav.drivers')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/taxi-drivers`}>{t('nav.taxi')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/airport`}>{t('nav.airport')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/list-your-car`}>{t('nav.becomeHoster')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/drive-with-us`}>{t('nav.becomeDriver')}</FooterLink>
            </li>
          </FooterColumn>

          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
            <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-sun">{f('locations')}</h3>
            <div className="flex flex-wrap gap-1.5">
              {RWANDA_CITIES.map((city) => (
                <Link
                  key={city}
                  href={`/${locale}/search?location=${encodeURIComponent(city)}`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:border-sun hover:bg-white/10 hover:text-white"
                >
                  <MapPin className="h-3 w-3 text-hill" aria-hidden />
                  {city}
                </Link>
              ))}
            </div>
          </div>

          <FooterColumn title={f('partners')}>
            <li>
              <FooterLink href={`/${locale}/list-your-car`}>{t('nav.becomeHoster')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/drive-with-us`}>{t('nav.becomeDriver')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/onboard/taxi`}>{t('nav.becomeTaxi')}</FooterLink>
            </li>
            <li>
              <FooterLink href={`/${locale}/corporate`}>{f('corporate')}</FooterLink>
            </li>
          </FooterColumn>

          <FooterColumn title={f('contact')}>
            <li>
              <a
                href={SITE_PHONE_TEL}
                className="flex items-center gap-2.5 font-medium text-white/75 transition hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sun">
                  <Phone className="h-3.5 w-3.5" />
                </span>
                {SITE_PHONE_DISPLAY}
              </a>
            </li>
            <li>
              <a
                href={SITE_WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 font-medium text-white/75 transition hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sun">
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                </span>
                WhatsApp
              </a>
            </li>
            <li>
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="flex min-w-0 items-center gap-2.5 break-words font-medium text-white/75 transition hover:text-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sun">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                {SITE_EMAIL}
              </a>
            </li>
            <li>
              <a
                href={SITE_INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 font-medium text-white/75 transition hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sun">
                  <Instagram className="h-3.5 w-3.5" />
                </span>
                Instagram
              </a>
            </li>
            <li>
              <a
                href={SITE_TIKTOK_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 font-medium text-white/75 transition hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sun">
                  <TikTokIcon className="h-3.5 w-3.5" />
                </span>
                TikTok
              </a>
            </li>
            <li className="flex items-center gap-2 pt-1 text-white">
              <Clock className="h-4 w-4 text-sun" aria-hidden />
              <span className="font-bold">{f('support247')}</span>
            </li>
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/55">
            &copy; {new Date().getFullYear()} Renting.rw · {f('rights')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={SITE_INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="rounded-full border border-white/15 p-2 text-white/70 transition hover:border-sun hover:text-sun"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={SITE_TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="rounded-full border border-white/15 p-2 text-white/70 transition hover:border-sun hover:text-sun"
            >
              <TikTokIcon className="h-4 w-4" />
            </a>
            <a
              href={SITE_WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="rounded-full border border-white/15 p-2 text-white/70 transition hover:border-sun hover:text-sun"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </a>
            <a
              href={`mailto:${SITE_EMAIL}`}
              aria-label={SITE_EMAIL}
              className="rounded-full border border-white/15 p-2 text-white/70 transition hover:border-sun hover:text-sun"
            >
              <Mail className="h-4 w-4" />
            </a>
            <Link href={`/${locale}/privacy`} className="px-2 text-xs font-semibold text-white/60 hover:text-white">
              {f('privacy')}
            </Link>
            <Link href={`/${locale}/terms`} className="px-2 text-xs font-semibold text-white/60 hover:text-white">
              {f('terms')}
            </Link>
            <a
              href={SITE_ADMIN_URL}
              target="_blank"
              rel="noreferrer"
              className="px-2 text-xs font-semibold text-white/60 hover:text-white"
            >
              {f('admin')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
