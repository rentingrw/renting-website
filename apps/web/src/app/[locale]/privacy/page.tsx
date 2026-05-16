'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { useEffect, useState } from 'react';

export default function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f0e8]">
      <AppHeader locale={locale} />

      <section className="border-b-2 border-neutral-900 bg-teal-600 px-4 py-16 text-center text-white">
        <h1 className="text-4xl font-black">Privacy Policy</h1>
        <p className="mt-2 text-sm font-medium text-teal-100">Last updated: April 2025</p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="space-y-8 text-sm font-medium leading-relaxed text-neutral-600">
          <p>
            This Privacy Policy describes how <strong className="text-neutral-900">CARIRWA LTD</strong> (&quot;renting.rw&quot;, &quot;we&quot;,
            &quot;us&quot;, or &quot;our&quot;) collects, uses, and shares your personal information when you use
            our website and services at renting.rw.
          </p>

          <div>
            <h2 className="mb-3 text-xl font-black text-neutral-900">1. Information We Collect</h2>
            <p>We collect the following categories of information:</p>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li><strong className="text-neutral-900">Account information:</strong> Name, email address, phone number, and profile photo.</li>
              <li><strong className="text-neutral-900">Identity verification:</strong> National ID number, TIN number, and company name for KYC purposes.</li>
              <li><strong className="text-neutral-900">Listing data:</strong> Vehicle details, photos, pricing, and location for car listings.</li>
              <li><strong className="text-neutral-900">Booking data:</strong> Trip dates, pickup/drop-off locations, and booking history.</li>
              <li><strong className="text-neutral-900">Payment data:</strong> Mobile money numbers (processed securely via Flutterwave — we do not store card details).</li>
              <li><strong className="text-neutral-900">Usage data:</strong> Pages visited, search queries, device type, and browser information.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-black text-neutral-900">2. How We Use Your Information</h2>
            <ul className="list-inside list-disc space-y-2">
              <li>To operate the platform and facilitate bookings between renters, car owners, and drivers.</li>
              <li>To verify identity and prevent fraud through our KYC process.</li>
              <li>To calculate and display your trust score to other users.</li>
              <li>To send booking confirmations, notifications, and support communications.</li>
              <li>To improve our services through analytics and usage patterns.</li>
              <li>To comply with legal obligations under Rwandan law.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-black text-neutral-900">3. Information Sharing</h2>
            <p>We do not sell your personal information. We may share your data with:</p>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li><strong className="text-neutral-900">Other users:</strong> Your public profile, trust score, and reviews are visible to other users on the platform.</li>
              <li><strong className="text-neutral-900">Payment processors:</strong> Flutterwave processes payments; their privacy policy applies.</li>
              <li><strong className="text-neutral-900">Service providers:</strong> Hosting, email, and SMS services used to operate the platform.</li>
              <li><strong className="text-neutral-900">Legal authorities:</strong> When required by Rwandan law or court order.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-black text-neutral-900">4. Data Security</h2>
            <p>
              We implement industry-standard security measures including encrypted data transmission (HTTPS),
              secure credential storage, and access controls. However, no method of transmission over the
              internet is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-black text-neutral-900">5. Your Rights</h2>
            <ul className="list-inside list-disc space-y-2">
              <li>Access or download a copy of your personal data.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Opt out of non-essential communications.</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, email us at{' '}
              <a href="mailto:renting.rw@gmail.com" className="font-black text-teal-700 hover:underline">
                renting.rw@gmail.com
              </a>.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-black text-neutral-900">6. Cookies</h2>
            <p>
              We use cookies for authentication, preferences, and analytics. You can control cookies via
              your browser settings, though disabling them may affect platform functionality.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-black text-neutral-900">7. Children&apos;s Privacy</h2>
            <p>
              renting.rw is not intended for users under 18 years of age. We do not knowingly collect
              information from minors.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-black text-neutral-900">8. Changes to This Policy</h2>
            <p>
              We may update this policy periodically. We will notify registered users of material changes
              via email. Continued use of the platform after changes constitutes acceptance.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-black text-neutral-900">9. Contact Us</h2>
            <p>
              CARIRWA LTD, Kigali, Rwanda
              <br />
              Email:{' '}
              <a href="mailto:renting.rw@gmail.com" className="font-black text-teal-700 hover:underline">
                renting.rw@gmail.com
              </a>
              <br />
              Phone:{' '}
              <a href="tel:+250788781648" className="font-black text-teal-700 hover:underline">
                0788 781 648
              </a>
            </p>
          </div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
