'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { useEffect, useState } from 'react';

export default function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppHeader locale={locale} />

      <section className="bg-background px-4 py-16 text-center text-foreground">
        <h1 className="text-4xl font-black">Terms of Service</h1>
        <p className="mt-2 text-sm font-medium text-foreground/70">Last updated: April 2025</p>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="space-y-8 text-sm font-medium leading-relaxed text-muted-foreground">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of the renting.rw platform operated
            by <strong className="text-foreground">CARIRWA LTD</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;). By creating an account or
            using our services, you agree to these Terms.
          </p>

          <div>
            <h2 className="mb-2 text-lg font-black text-foreground">1. The Platform</h2>
            <p>
              renting.rw is a marketplace that connects car owners and drivers (&quot;Hosts&quot;) with
              renters and passengers (&quot;Guests&quot;). CARIRWA LTD facilitates bookings but is not a
              party to the rental agreement between Hosts and Guests.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-black text-foreground">2. Eligibility</h2>
            <ul className="list-inside list-disc space-y-1">
              <li>You must be at least 18 years old to use the platform.</li>
              <li>You must hold a valid driver&apos;s license to rent or list a self-drive vehicle.</li>
              <li>You must provide accurate information during registration.</li>
              <li>One account per person. Duplicate accounts may be suspended.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-black text-foreground">3. Bookings</h2>
            <p>
              When a Guest sends a booking request, the renting.rw desk confirms Standard
              bookings after calling the provider. Extra Premium listings confirm immediately.
              After confirmation you receive the provider name and phone. There is no in-app chat.
              A confirmed booking constitutes a binding agreement between Guest and Host.
            </p>
            <p className="mt-2">
              Cancellations within 24 hours of trip start may result in partial refunds at the
              Host&apos;s discretion and may affect the cancelling party&apos;s trust score.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-black text-foreground">4. Host Obligations</h2>
            <ul className="list-inside list-disc space-y-1">
              <li>Cars must be roadworthy, legally registered, and insured.</li>
              <li>Listings must accurately represent the vehicle or service offered.</li>
              <li>Hosts keep availability accurate. Standard bookings are confirmed by the renting.rw desk after calling the host.</li>
              <li>Hosts must keep availability calendars accurate.</li>
              <li>Discrimination based on race, religion, gender, or nationality is prohibited.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-black text-foreground">5. Guest Obligations</h2>
            <ul className="list-inside list-disc space-y-1">
              <li>Guests must treat vehicles and drivers with respect.</li>
              <li>Guests are responsible for damages caused during the rental period.</li>
              <li>Guests must return vehicles in the same condition as received.</li>
              <li>Smoking, illegal activities, and unauthorized passengers are prohibited.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-black text-foreground">6. Payments and Fees</h2>
            <p>
              Payments are processed via iPay. renting.rw charges a service fee on each
              transaction. All fees are displayed before confirmation. The Company reserves the right
              to adjust fees with 30 days&apos; notice.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-black text-foreground">7. Prohibited Conduct</h2>
            <p>You may not use the platform to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Post false or misleading listings.</li>
              <li>Circumvent the platform to avoid fees.</li>
              <li>Harass, threaten, or defraud other users.</li>
              <li>Use the platform for any unlawful purpose.</li>
              <li>Create fake reviews or manipulate the trust score system.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-black text-foreground">8. Limitation of Liability</h2>
            <p>
              CARIRWA LTD is a marketplace facilitator and is not liable for accidents, damage,
              theft, or disputes arising from bookings. The Company&apos;s liability is limited to the
              amount of service fees collected on the relevant transaction.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-black text-foreground">9. Account Termination</h2>
            <p>
              The Company may suspend or terminate accounts for violations of these Terms, fraudulent
              activity, or behaviour harmful to the community. Users may delete their accounts at any
              time from the Settings page.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-black text-foreground">10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Republic of Rwanda. Disputes shall be
              resolved through mediation before any legal action.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-black text-foreground">11. Contact</h2>
            <p>
              CARIRWA LTD, Kigali, Rwanda
              <br />
              <a href="mailto:renting.rw@gmail.com" className="font-black text-brand hover:underline">
                renting.rw@gmail.com
              </a>{' '}
              ·{' '}
              <a href="tel:+250788781648" className="font-black text-brand hover:underline">
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
