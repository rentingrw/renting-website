'use client';

import { useLocale, useTranslations } from 'next-intl';

type JobOpeningMetaProps = {
  postedAt?: string | null;
  applicationDeadline?: string | null;
  className?: string;
};

function formatWhen(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function JobOpeningMeta({ postedAt, applicationDeadline, className = '' }: JobOpeningMetaProps) {
  const t = useTranslations('web.careers');
  const locale = useLocale();
  const postedLabel = formatWhen(postedAt, locale);
  const deadlineLabel = formatWhen(applicationDeadline, locale);

  const parts: string[] = [];
  if (postedLabel) parts.push(t('posted', { when: postedLabel }));
  if (deadlineLabel) parts.push(t('applyBy', { when: deadlineLabel }));
  else if (postedLabel) parts.push(t('openUntilFilled'));

  if (parts.length === 0) return null;

  return <p className={`text-xs font-medium text-muted-foreground ${className}`.trim()}>{parts.join(' · ')}</p>;
}