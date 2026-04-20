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
    <main className="flex min-h-screen flex-col">
      <AppHeader locale={locale} />

      <section className="bg-gradient-to-br from-teal-700 to-teal-900 px-4 py-16 text-center text-white">
        <h1 className="text-4xl font-extrabold">Privacy Policy</h1>
        <p className="mt-2 text-teal-200 text-sm">Last updated: April 2025</p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 leading-relaxed">
            This Privacy Policy describes how <strong>CARIRWA LTD</strong> (&quot;renting.rw&quot;, &quot;we&quot;,
            &quot;us&quot;, or &quot;our&quot;) collects, uses, and shares your personal information when you use
            our website and services at renting.rw.
          </p>

          <h2 className="mt-10 mb-3 text-xl font-bold text-gray-900">1. Information We Collect</h2>
          <p className="text-gray-600 leading-relaxed">We collect the following categories of information:</p>
          <ul className="mt-3 space-y-2 text-gray-600 text-sm list-disc list-inside">
            <li><strong>Account information:</strong> Name, email address, phone number, and profile photo.</li>
            <li><strong>Identity verification:</strong> National ID number, TIN number, and company name for KYC purposes.</li>
            <li><strong>Listing data:</strong> Vehicle details, photos, pricing, and location for car listings.</li>
            <li><strong>Booking data:</strong> Trip dates, pickup/drop-off locations, and booking history.</li>
            <li><strong>Payment data:</strong> Mobile money numbers (processed securely via Flutterwave — we do not store card details).</li>
            <li><strong>Usage data:</strong> Pages visited, search queries, device type, and browser information.</li>
          </ul>

          <h2 className="mt-10 mb-3 text-xl font-bold text-gray-900">2. How We Use Your Information</h2>
          <ul className="mt-3 space-y-2 text-gray-600 text-sm list-disc list-inside">
            <li>To operate the platform and facilitate bookings between renters, car owners, and drivers.</li>
            <li>To verify identity and prevent fraud through our KYC process.</li>
            <li>To calculate and display your trust score to other users.</li>
            <li>To send booking confirmations, notifications, and support communications.</li>
            <li>To improve our services through analytics and usage patterns.</li>
            <li>To comply with legal obligations under Rwandan law.</li>
          </ul>

          <h2 className="mt-10 mb-3 text-xl font-bold text-gray-900">3. Information Sharing</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            We do not sell your personal information. We may share your data with:
          </p>
          <ul className="mt-3 space-y-2 text-gray-600 text-sm list-disc list-inside">
            <li><strong>Other users:</strong> Your public profile, trust score, and reviews are visible to other users on the platform.</li>
            <li><strong>Payment processors:</strong> Flutterwave processes payments; their privacy policy applies.</li>
            <li><strong>Service providers:</strong> Hosting, email, and SMS services used to operate the platform.</li>
            <li><strong>Legal authorities:</strong> When required by Rwandan law or court order.</li>
          </ul>

          <h2 className="mt-10 mb-3 text-xl font-bold text-gray-900">4. Data Security</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            We implement industry-standard security measures including encrypted data transmission (HTTPS),
            secure credential storage, and access controls. However, no method of transmission over the
            internet is 100% secure.
          </p>

          <h2 className="mt-10 mb-3 text-xl font-bold text-gray-900">5. Your Rights</h2>
          <ul className="mt-3 space-y-2 text-gray-600 text-sm list-disc list-inside">
            <li>Access or download a copy of your personal data.</li>
            <li>Request correction of inaccurate information.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Opt out of non-essential communications.</li>
          </ul>
          <p className="mt-3 text-gray-600 text-sm">
            To exercise these rights, email us at{' '}
            <a href="mailto:renting.rw@gmail.com" className="text-teal-600 hover:underline">
              renting.rw@gmail.com
            </a>.
          </p>

          <h2 className="mt-10 mb-3 text-xl font-bold text-gray-900">6. Cookies</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            We use cookies for authentication, preferences, and analytics. You can control cookies via
            your browser settings, though disabling them may affect platform functionality.
          </p>

          <h2 className="mt-10 mb-3 text-xl font-bold text-gray-900">7. Children&apos;s Privacy</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            renting.rw is not intended for users under 18 years of age. We do not knowingly collect
            information from minors.
          </p>

          <h2 className="mt-10 mb-3 text-xl font-bold text-gray-900">8. Changes to This Policy</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            We may update this policy periodically. We will notify registered users of material changes
            via email. Continued use of the platform after changes constitutes acceptance.
          </p>

          <h2 className="mt-10 mb-3 text-xl font-bold text-gray-900">9. Contact Us</h2>
          <p className="text-gray-600 text-sm">
            CARIRWA LTD, Kigali, Rwanda
            <br />
            Email:{' '}
            <a href="mailto:renting.rw@gmail.com" className="text-teal-600 hover:underline">
              renting.rw@gmail.com
            </a>
            <br />
            Phone:{' '}
            <a href="tel:+250788781648" className="text-teal-600 hover:underline">
              0788 781 648
            </a>
          </p>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}
