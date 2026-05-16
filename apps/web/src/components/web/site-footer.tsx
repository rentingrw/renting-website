'use client';

import { Mail, Phone } from 'lucide-react';
import Link from 'next/link';

type SiteFooterProps = {
  locale: string;
};

export function SiteFooter({ locale }: SiteFooterProps) {
  return (
    <footer className="border-t-2 border-neutral-900 bg-neutral-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {/* About */}
          <div>
            <h3 className="mb-4 border-b-2 border-neutral-700 pb-2 text-xs font-black uppercase tracking-widest text-amber-400">
              About Us
            </h3>
            <ul className="space-y-3 text-sm text-neutral-400">
              {[
                { href: `/${locale}/about`, label: 'About renting.rw' },
                { href: `/${locale}/how-it-works`, label: 'How It Works' },
                { href: `/${locale}/faq`, label: 'FAQs' },
                { href: `/${locale}/safety`, label: 'Safety' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="font-medium transition hover:text-teal-400">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-4 border-b-2 border-neutral-700 pb-2 text-xs font-black uppercase tracking-widest text-amber-400">
              Platform
            </h3>
            <ul className="space-y-3 text-sm text-neutral-400">
              {[
                { href: `/${locale}/cars`, label: 'Browse Cars' },
                { href: `/${locale}/drivers`, label: 'Hire a Driver' },
                { href: `/${locale}/list-your-car`, label: 'List Your Car' },
                { href: `/${locale}/drive-with-us`, label: 'Drive With Us' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="font-medium transition hover:text-teal-400">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Partners */}
          <div>
            <h3 className="mb-4 border-b-2 border-neutral-700 pb-2 text-xs font-black uppercase tracking-widest text-amber-400">
              Partners
            </h3>
            <ul className="space-y-3 text-sm text-neutral-400">
              {[
                { href: `/${locale}/list-your-car`, label: 'Become a Car Partner' },
                { href: `/${locale}/drive-with-us`, label: 'Become a Driver Partner' },
                { href: `/${locale}/corporate`, label: 'Corporate Solutions' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="font-medium transition hover:text-teal-400">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h3 className="mb-4 border-b-2 border-neutral-700 pb-2 text-xs font-black uppercase tracking-widest text-amber-400">
              Contacts
            </h3>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-teal-400" />
                <a href="tel:+250788781648" className="font-medium transition hover:text-teal-400">
                  0788 781 648
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-teal-400" />
                <a href="mailto:renting.rw@gmail.com" className="font-medium transition hover:text-teal-400">
                  renting.rw@gmail.com
                </a>
              </li>
              <li className="mt-4">
                <p className="font-black text-white">Operation Hours</p>
                <p className="mt-1 text-xs text-neutral-500">Mon – Fri: 9am – 6pm</p>
                <p className="text-xs text-neutral-500">Saturday: 10am – 5pm</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t-2 border-neutral-700 pt-6 sm:flex-row">
          <p className="text-sm font-black text-teal-400">renting.rw</p>
          <p className="text-xs text-neutral-500">
            &copy; {new Date().getFullYear()} renting.rw &mdash; A product of{' '}
            <strong className="text-neutral-300">CARIRWA LTD</strong>. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-neutral-500">
            <Link href={`/${locale}/privacy`} className="font-medium hover:text-teal-400">Privacy</Link>
            <Link href={`/${locale}/terms`} className="font-medium hover:text-teal-400">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
