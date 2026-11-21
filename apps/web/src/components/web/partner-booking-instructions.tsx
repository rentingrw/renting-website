'use client';

import type { SupportedLocale } from '@/i18n/routing';
import { Building2, FileSignature, Mail, Percent, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

type PartnerBookingInstructionsProps = {
  locale: SupportedLocale;
};

export function PartnerBookingInstructions({ locale: _locale }: PartnerBookingInstructionsProps) {
  const t = useTranslations('web.app.partner');

  const items = [
    { icon: Mail, title: t('instrEmailTitle'), body: t('instrEmailBody') },
    { icon: ShieldCheck, title: t('instrAdminTitle'), body: t('instrAdminBody') },
    { icon: Percent, title: t('instrFeeTitle'), body: t('instrFeeBody') },
    { icon: FileSignature, title: t('instrContractTitle'), body: t('instrContractBody') },
    { icon: Building2, title: t('instrFleetTitle'), body: t('instrFleetBody') },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('instrLead')}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}