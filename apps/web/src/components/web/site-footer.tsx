'use client';

import {
  SITE_ADMIN_URL,
  SITE_EMAIL,
  SITE_INSTAGRAM_URL,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_TEL,
  SITE_WHATSAPP_URL,
} from '@/lib/site-contact';
import { Clock, Instagram, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

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

export function SiteFooter({ locale }: SiteFooterProps) {
  return (
    <footer className="border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <h3 className="mb-4 border-b border-white/25 pb-2 text-xs font-black uppercase tracking-widest text-white">
              About
            </h3>
            <ul className="space-y-3 text-sm text-white/80">
              {[
                { href: `/${locale}/about`, label: 'About' },
                { href: `/${locale}/how-it-works`, label: 'How it works' },
                { href: `/${locale}/faq`, label: 'FAQ' },
                { href: `/${locale}/safety`, label: 'Safety' },
                { href: `/${locale}/careers`, label: 'Careers' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="font-medium transition hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 border-b border-white/25 pb-2 text-xs font-black uppercase tracking-widest text-white">
              Platform
            </h3>
            <ul className="space-y-3 text-sm text-white/80">
              {[
                { href: `/${locale}/cars`, label: 'Cars' },
                { href: `/${locale}/drivers`, label: 'Drivers' },
                { href: `/${locale}/taxi-drivers`, label: 'Taxi' },
                { href: `/${locale}/airport`, label: 'Airport' },
                { href: `/${locale}/list-your-car`, label: 'List a car' },
                { href: `/${locale}/drive-with-us`, label: 'Drive' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="font-medium transition hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 border-b border-white/25 pb-2 text-xs font-black uppercase tracking-widest text-white">
              Locations
            </h3>
            <ul className="space-y-3 text-sm text-white/80">
              {RWANDA_CITIES.map((city) => (
                <li key={city}>
                  <Link
                    href={`/${locale}/search?location=${encodeURIComponent(city)}`}
                    className="font-medium transition hover:text-white"
                  >
                    {city}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 border-b border-white/25 pb-2 text-xs font-black uppercase tracking-widest text-white">
              Partners
            </h3>
            <ul className="space-y-3 text-sm text-white/80">
              {[
                { href: `/${locale}/list-your-car`, label: 'List a car' },
                { href: `/${locale}/drive-with-us`, label: 'Drive' },
                { href: `/${locale}/onboard/taxi`, label: 'Taxi' },
                { href: `/${locale}/corporate`, label: 'Corporate' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="font-medium transition hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 border-b border-white/25 pb-2 text-xs font-black uppercase tracking-widest text-white">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-white" />
                <a href={SITE_PHONE_TEL} className="font-medium transition hover:text-white">
                  {SITE_PHONE_DISPLAY}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <WhatsAppIcon className="h-4 w-4 shrink-0 text-white" />
                <a
                  href={SITE_WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium transition hover:text-white"
                >
                  WhatsApp
                </a>
              </li>
              <li className="flex min-w-0 items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-white" />
                <a href={`mailto:${SITE_EMAIL}`} className="min-w-0 break-words font-medium transition hover:text-white">
                  {SITE_EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="h-4 w-4 shrink-0 text-white" />
                <a
                  href={SITE_INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium transition hover:text-white"
                >
                  Instagram
                </a>
              </li>
              <li className="mt-4 flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-white" />
                <p className="font-semibold text-white">24/7</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/25 pt-6 sm:flex-row">
          <p className="text-sm font-black text-white">Renting.rw</p>
          <p className="text-xs text-white/70">
            &copy; {new Date().getFullYear()} Renting.rw · CARIRWA LTD
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/70">
            <a
              href={SITE_INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="text-white/80 transition hover:text-white"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={SITE_WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="text-white/80 transition hover:text-white"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </a>
            <a href={`mailto:${SITE_EMAIL}`} aria-label={SITE_EMAIL} className="text-white/80 transition hover:text-white">
              <Mail className="h-4 w-4" />
            </a>
            <Link href={`/${locale}/privacy`} className="font-medium hover:text-white">Privacy</Link>
            <Link href={`/${locale}/terms`} className="font-medium hover:text-white">Terms</Link>
            <a
              href={SITE_ADMIN_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:text-white"
            >
              Admin
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
