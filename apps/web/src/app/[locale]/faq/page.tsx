'use client';

import { AppHeader } from '@/components/web/app-header';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

const FAQS = [
  {
    category: 'Booking',
    items: [
      {
        q: 'How do I make a booking?',
        a: 'Search for a car or driver, choose your dates and pickup location, then send a booking request. The owner has 1 hour to confirm or decline.',
      },
      {
        q: 'How long does it take to get confirmed?',
        a: 'Owners and drivers are required to respond within 1 hour of receiving a request. If there is no response, the request expires automatically.',
      },
      {
        q: 'Can I cancel a booking?',
        a: "Yes. You can cancel from your dashboard. Cancellations within 24 hours of the trip start may affect your trust score. Review the cancellation policy on each listing before booking.",
      },
      {
        q: 'What if the owner cancels on me?',
        a: "If an owner cancels your confirmed booking, you will receive a full refund and the owner's trust score is affected. Contact support if you need help finding an alternative.",
      },
    ],
  },
  {
    category: 'Payments',
    items: [
      {
        q: 'When do I pay?',
        a: 'Payment is collected at confirmation. We support mobile money (MTN MoMo, Airtel Money) and card payments via Flutterwave.',
      },
      {
        q: 'Is my payment secure?',
        a: 'Yes. All payments are processed through Flutterwave, a PCI-DSS compliant payment processor. renting.rw never stores your card details.',
      },
      {
        q: 'Are there hidden fees?',
        a: 'No. The price displayed on a listing is the daily rate. Additional charges (fuel, countryside rates, etc.) are always disclosed on the listing page before you book.',
      },
    ],
  },
  {
    category: 'For Car Owners',
    items: [
      {
        q: 'How do I list my car?',
        a: 'Sign up, complete your profile, then go to Dashboard → My Cars → New Listing. Add photos, set your daily rate, and choose your availability.',
      },
      {
        q: 'Is there a fee to list?',
        a: 'There is a free tier that allows you to list one car. Paid subscriptions unlock more listings and priority placement.',
      },
      {
        q: 'How do I get paid?',
        a: 'Payouts are sent via mobile money to the number on your verified profile. Processing happens within 24–48 hours after a booking is marked complete.',
      },
      {
        q: 'What if a renter damages my car?',
        a: 'renting.rw encourages owners to require a security deposit. In case of disputes, contact support and we will mediate using booking evidence and photos.',
      },
    ],
  },
  {
    category: 'Trust & Safety',
    items: [
      {
        q: 'How does the Trust Score work?',
        a: 'Your trust score is calculated from your ID verification status, number of completed bookings, and average review rating. A higher score means more trust from the community.',
      },
      {
        q: "Are drivers background-checked?",
        a: "Drivers on renting.rw are required to submit their driver's license and national ID. Verified badges are only shown on profiles that have passed our review.",
      },
      {
        q: 'What if I have a problem during a trip?',
        a: 'Use the in-app chat to communicate with your host or driver. For urgent issues, contact support at renting.rw@gmail.com or call 0788 781 648.',
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b-2 border-neutral-900 last:border-b-0 ${open ? 'bg-teal-50' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-0 py-4 text-left"
      >
        <span className="pr-4 font-black text-neutral-900">{q}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-teal-600" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-neutral-400" />
        )}
      </button>
      {open && <p className="pb-4 text-sm font-medium leading-relaxed text-neutral-600">{a}</p>}
    </div>
  );
}

export default function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f0e8]">
      <AppHeader locale={locale} />

      {/* Hero */}
      <section className="border-b-2 border-neutral-900 bg-teal-600 px-4 py-20 text-center text-white">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-teal-100">Got Questions?</p>
        <h1 className="text-4xl font-black sm:text-5xl">Frequently Asked Questions</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-teal-50">
          Everything you need to know about booking, payments, and listing on renting.rw.
        </p>
      </section>

      {/* FAQ content */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        {FAQS.map((section) => (
          <div key={section.category} className="mb-10">
            <h2 className="mb-1 inline-block rounded border-2 border-neutral-900 bg-neutral-900 px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
              {section.category}
            </h2>
            <div className="mt-3 rounded-md border-2 border-neutral-900 bg-white px-5 shadow-brutal">
              {section.items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Still need help */}
      <section className="border-t-2 border-neutral-900 bg-white px-4 py-12 text-center sm:px-6">
        <h2 className="mb-2 text-xl font-black text-neutral-900">Still have questions?</h2>
        <p className="mb-6 font-medium text-neutral-600">
          Our support team is available Mon–Sat and happy to help.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="tel:+250788781648"
            className="rounded border-2 border-teal-800 bg-teal-600 px-6 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Call 0788 781 648
          </a>
          <a
            href="mailto:renting.rw@gmail.com"
            className="rounded border-2 border-neutral-900 bg-white px-6 py-2.5 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Email Us
          </a>
        </div>
      </section>

      <div className="flex-1" />
      <SiteFooter locale={locale} />
    </main>
  );
}
