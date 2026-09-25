'use client';

import { Clock, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

type SiteFooterProps = {
  locale: string;
};

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
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
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
                { href: `/${locale}/stays`, label: 'Stays' },
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
                <a href="tel:+250788781648" className="font-medium transition hover:text-white">
                  0788 781 648
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-white" />
                <a href="mailto:renting.rw@gmail.com" className="font-medium transition hover:text-white">
                  renting.rw@gmail.com
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
          <div className="flex gap-4 text-xs text-white/70">
            <Link href={`/${locale}/privacy`} className="font-medium hover:text-white">Privacy</Link>
            <Link href={`/${locale}/terms`} className="font-medium hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
