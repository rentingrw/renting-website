'use client';

import type { SupportedLocale } from '@/i18n/routing';
import Link from 'next/link';

type RegistrationAgreementProps = {
  locale: SupportedLocale;
  agreedToPolicy: boolean;
  agreedToFee: boolean;
  onPolicyChange: (value: boolean) => void;
  onFeeChange: (value: boolean) => void;
};

export function registrationAgreementError(agreedToPolicy: boolean, agreedToFee: boolean): string | null {
  if (!agreedToPolicy && !agreedToFee) {
    return 'Agree to the policy and the 10% platform fee to continue.';
  }
  if (!agreedToPolicy) return 'Agree to the Terms of Service and Privacy Policy to continue.';
  if (!agreedToFee) return 'Agree to pay 10% of the rental amount to continue.';
  return null;
}

export function RegistrationAgreement({
  locale,
  agreedToPolicy,
  agreedToFee,
  onPolicyChange,
  onFeeChange,
}: RegistrationAgreementProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Confirm both points below. You cannot finish registration until you agree.
      </p>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
        <input
          type="checkbox"
          checked={agreedToPolicy}
          onChange={(event) => onPolicyChange(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-brand"
        />
        <span>
          I have read and agree to the{' '}
          <Link
            href={`/${locale}/terms`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand underline"
            onClick={(event) => event.stopPropagation()}
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href={`/${locale}/privacy`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand underline"
            onClick={(event) => event.stopPropagation()}
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed text-foreground">
        <input
          type="checkbox"
          checked={agreedToFee}
          onChange={(event) => onFeeChange(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-brand"
        />
        <span>
          I agree to pay renting.rw <strong>10%</strong> of the rental amount on each booking. I keep the
          remaining 90%.
        </span>
      </label>
    </div>
  );
}
