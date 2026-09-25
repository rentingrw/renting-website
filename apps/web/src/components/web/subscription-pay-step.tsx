'use client';

import { useState } from 'react';

import { onboardInputClass, onboardLabelClass } from '@/components/web/onboard-wizard-shell';
import { formatCurrencyRwf } from '@/lib/format';
import type { SubscriptionInitiateResponse } from '@/lib/api';

type SubscriptionPayStepProps = {
  planLabel: string;
  amountRwf: number;
  defaultPhone?: string;
  note?: string;
  onPay: (payload: {
    paymentMethod: 'mtn_momo' | 'airtel_money';
    mobileNumber: string;
    promoCode?: string;
  }) => Promise<SubscriptionInitiateResponse>;
  onCheckLive: () => Promise<boolean>;
  onSuccess: () => void;
};

export function SubscriptionPayStep({
  planLabel,
  amountRwf,
  defaultPhone,
  note,
  onPay,
  onCheckLive,
  onSuccess,
}: SubscriptionPayStepProps) {
  const [method, setMethod] = useState<'mtn_momo' | 'airtel_money'>('mtn_momo');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [promo, setPromo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'waiting' | 'failed'>('idle');

  async function waitForLive() {
    const started = Date.now();
    while (Date.now() - started < 90_000) {
      if (await onCheckLive()) return true;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    return false;
  }

  async function handlePay() {
    setError('');
    if (!promo.trim() && !phone.trim()) {
      setError('Enter a MoMo number or a promo code.');
      return;
    }
    setBusy(true);
    setStatus('waiting');
    try {
      const result = await onPay({
        paymentMethod: method,
        mobileNumber: phone.trim() || '0780000000',
        ...(promo.trim() ? { promoCode: promo.trim() } : {}),
      });
      if (result.activated || result.status === 'active') {
        onSuccess();
        return;
      }
      const live = await waitForLive();
      if (live) {
        onSuccess();
        return;
      }
      setStatus('failed');
      setError('Payment is still pending. Confirm on your phone, then try again.');
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-brand-soft px-4 py-3">
        <p className="text-xs font-black uppercase tracking-wide text-brand">{planLabel}</p>
        <p className="text-2xl font-black text-foreground">{formatCurrencyRwf(amountRwf)} / month</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {note ?? 'You are not searchable until this payment or a valid promo succeeds.'}
        </p>
      </div>
      <div>
        <label className={onboardLabelClass}>Mobile money</label>
        <select
          className={onboardInputClass}
          value={method}
          onChange={(event) => setMethod(event.target.value as 'mtn_momo' | 'airtel_money')}
        >
          <option value="mtn_momo">MTN MoMo</option>
          <option value="airtel_money">Airtel Money</option>
        </select>
      </div>
      <div>
        <label className={onboardLabelClass}>Phone number</label>
        <input
          className={onboardInputClass}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="07XXXXXXXX"
        />
      </div>
      <div>
        <label className={onboardLabelClass}>Promo code (optional)</label>
        <input
          className={onboardInputClass}
          value={promo}
          onChange={(event) => setPromo(event.target.value.toUpperCase())}
          placeholder="WAIVE100"
        />
      </div>
      {status === 'waiting' ? (
        <p className="text-sm text-blue-200">Approve the MoMo prompt on your phone. We will mark you live when it clears.</p>
      ) : null}
      {status === 'failed' ? (
        <p className="text-sm text-amber-200">Payment did not complete. You can retry with MoMo or a promo code.</p>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={busy}
        className="w-full rounded bg-brand px-4 py-3 text-sm font-black text-foreground disabled:opacity-50"
      >
        {busy ? 'Processing…' : promo.trim() ? 'Apply promo / pay' : 'Pay and go live'}
      </button>
    </div>
  );
}
