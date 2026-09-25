'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AddressInput } from '@/components/web/address-input';
import { OnboardWizardShell, onboardInputClass, onboardLabelClass } from '@/components/web/onboard-wizard-shell';
import { SubscriptionPayStep } from '@/components/web/subscription-pay-step';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  getMe,
  getSubscriptionOverview,
  initiateSubscription,
  updateMe,
  upsertHosterProfile,
} from '@/lib/api';
import { formatCurrencyRwf } from '@/lib/format';

const STEPS = ['Name', 'Address', 'Contact', 'Plan', 'Pay'];

const PLANS = [
  { tier: 'basic' as const, label: 'Basic', price: 10_000, perks: ['1 car listing'] },
  { tier: 'premium' as const, label: 'Premium', price: 25_000, perks: ['Up to 5 cars', 'Location boost'] },
  {
    tier: 'enterprise' as const,
    label: 'Extra Premium',
    price: 50_000,
    perks: ['Unlimited cars', 'Verified badge', 'Instant booking', 'Public contact'],
  },
];

export default function HosterOnboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const { getToken } = useAuth();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [tier, setTier] = useState<'basic' | 'premium' | 'enterprise'>('basic');
  const [done, setDone] = useState(false);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getToken();
      if (!token) return;
      const [me, sub] = await Promise.all([getMe(token), getSubscriptionOverview(token).catch(() => null)]);
      if (cancelled) return;
      if (me) {
        setFullName(me.fullName || user?.fullName || '');
        setContactPhone(me.phone || me.hosterProfile?.contactPhone || '');
        setCompanyName(me.hosterProfile?.companyName || '');
        setWorkAddress(me.hosterProfile?.workAddress || '');
      } else if (user?.fullName) {
        setFullName(user.fullName);
      }
      if (sub?.subscription && ['active', 'cancelled'].includes(sub.subscription.status)) {
        setDone(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getToken, user]);

  const selectedPlan = PLANS.find((plan) => plan.tier === tier) ?? PLANS[0];

  async function saveProfile() {
    const token = await getToken();
    if (!token) throw new Error('Please sign in.');
    await upsertHosterProfile(token, {
      companyName: companyName.trim() || undefined,
      workAddress: workAddress.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
    });
    if (fullName.trim()) {
      await updateMe(token, { fullName: fullName.trim() });
    }
  }

  async function handleNext() {
    setError('');
    if (step === 0 && !fullName.trim()) {
      setError('Enter your name.');
      return;
    }
    if (step === 1 && !workAddress.trim()) {
      setError('Enter your work address.');
      return;
    }
    if (step === 2 && !contactPhone.trim()) {
      setError('Enter a contact phone number.');
      return;
    }
    setBusy(true);
    try {
      if (step === 2) await saveProfile();
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <OnboardWizardShell
        locale={locale}
        title="You are live as a hoster"
        subtitle="Start listing your car so renters can find it."
        steps={STEPS}
        step={STEPS.length - 1}
        hideNext
      >
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Your {selectedPlan.label} plan is active.</p>
          <Link
            href={`/${locale}/app/cars`}
            className="inline-block rounded bg-brand px-5 py-3 text-sm font-black text-foreground"
          >
            Start listing your car
          </Link>
        </div>
      </OnboardWizardShell>
    );
  }

  return (
    <OnboardWizardShell
      locale={locale}
      title="Become a hoster"
      subtitle="Create your hoster profile, pick a plan, then pay. You stay hidden until payment or a promo succeeds."
      steps={STEPS}
      step={step}
      error={error}
      busy={busy}
      nextDisabled={step === 4}
      hideNext={step === 4}
      onBack={() => setStep((prev) => Math.max(0, prev - 1))}
      onNext={() => void handleNext()}
    >
      {step === 0 ? (
        <div className="space-y-4">
          <div>
            <label className={onboardLabelClass}>Your name</label>
            <input className={onboardInputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className={onboardLabelClass}>Company (optional)</label>
            <input
              className={onboardInputClass}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Personal or company name"
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <label className={onboardLabelClass}>Work address</label>
          <AddressInput
            value={workAddress}
            onChange={setWorkAddress}
            dark
            className={onboardInputClass}
            placeholder="Street, sector, city"
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <label className={onboardLabelClass}>Contact phone</label>
          <input
            className={onboardInputClass}
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="07XXXXXXXX"
          />
          <p className="mt-2 text-xs text-muted-foreground">Shown publicly only on Extra Premium. Otherwise after a confirmed booking.</p>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          {PLANS.map((plan) => (
            <button
              key={plan.tier}
              type="button"
              onClick={() => setTier(plan.tier)}
              className={`w-full rounded-lg border p-4 text-left ${
                tier === plan.tier ? 'border-brand bg-brand-soft' : 'border-border bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-black text-foreground">{plan.label}</p>
                <p className="text-sm font-bold text-brand">{formatCurrencyRwf(plan.price)}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.perks.join(' · ')}</p>
            </button>
          ))}
        </div>
      ) : null}

      {step === 4 ? (
        <SubscriptionPayStep
          planLabel={selectedPlan.label}
          amountRwf={selectedPlan.price}
          defaultPhone={contactPhone}
          onPay={async (payload) => {
            const token = await getToken();
            if (!token) throw new Error('Please sign in.');
            await saveProfile();
            return initiateSubscription(token, { tier, ...payload });
          }}
          onCheckLive={async () => {
            const token = await getToken();
            if (!token) return false;
            const sub = await getSubscriptionOverview(token);
            return Boolean(sub.subscription && ['active', 'cancelled'].includes(sub.subscription.status));
          }}
          onSuccess={() => setDone(true)}
        />
      ) : null}
    </OnboardWizardShell>
  );
}
