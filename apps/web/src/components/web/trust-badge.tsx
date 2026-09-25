'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { trustTierFromScore, trustToneClass } from '@/lib/format';

type TrustBadgeProps = {
  score: number;
  verified?: boolean;
  showScore?: boolean;
  className?: string;
};

export function TrustBadge({ score, verified = false, showScore = true, className = '' }: TrustBadgeProps) {
  const t = useTranslations('web.listing');
  const numeric = Number.isFinite(score) ? score : 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${trustToneClass(numeric)} ${className}`}>
      <ShieldCheck className="h-3.5 w-3.5" />
      {verified ? t('verified') : trustTierFromScore(numeric)}
      {showScore ? <span className="font-semibold opacity-80">{Math.round(numeric)}</span> : null}
    </span>
  );
}
