'use client';

import { Mail, Phone } from 'lucide-react';
import Link from 'next/link';

type SiteFooterProps = {
  locale: string;
};

export function SiteFooter({ locale }: SiteFooterProps) {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div>
            <h3 className="mb-4 border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-wider text-gray-900">
              About Us
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <Link href={`/${locale}/about`} className="transition hover:text-teal-600">
                  About renting.rw
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/how-it-works`} className="transition hover:text-teal-600">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/faq`} className="transition hover:text-teal-600">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/safety`} className="transition hover:text-teal-600">
                  Safety
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-4 border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-wider text-gray-900">
              Platform
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <Link href={`/${locale}/cars`} className="transition hover:text-teal-600">
                  Browse Cars
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/drivers`} className="transition hover:text-teal-600">
                  Hire a Driver
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/list-your-car`} className="transition hover:text-teal-600">
                  List Your Car
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/drive-with-us`} className="transition hover:text-teal-600">
                  Drive With Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Partners */}
          <div>
            <h3 className="mb-4 border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-wider text-gray-900">
              Partners
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <Link href={`/${locale}/list-your-car`} className="transition hover:text-teal-600">
                  Become a Car Partner
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/drive-with-us`} className="transition hover:text-teal-600">
                  Become a Driver Partner
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/corporate`} className="transition hover:text-teal-600">
                  Corporate Solutions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h3 className="mb-4 border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-wider text-gray-900">
              Contacts
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-teal-600" />
                <a href="tel:+250788781648" className="transition hover:text-teal-600">
                  0788 781 648
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-teal-600" />
                <a href="mailto:renting.rw@gmail.com" className="transition hover:text-teal-600">
                  renting.rw@gmail.com
                </a>
              </li>
              <li className="mt-4">
                <p className="font-semibold text-gray-700">Operation Hours</p>
                <p className="mt-1 text-xs text-gray-500">Mon – Fri: 9am – 6pm</p>
                <p className="text-xs text-gray-500">Saturday: 10am – 5pm</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-6 sm:flex-row">
          <p className="text-sm font-bold text-teal-700">renting.rw</p>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} renting.rw &mdash; A product of{' '}
            <strong className="text-gray-600">CARIRWA LTD</strong>. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href={`/${locale}/privacy`} className="hover:text-teal-600">
              Privacy
            </Link>
            <Link href={`/${locale}/terms`} className="hover:text-teal-600">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
