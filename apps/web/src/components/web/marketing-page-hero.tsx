import type { ReactNode } from 'react';

import { BrandEyebrow } from '@/components/web/brand-eyebrow';

type MarketingPageHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  children?: ReactNode;
};

export function MarketingPageHero({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  children,
}: MarketingPageHeroProps) {
  const centered = align === 'center';

  return (
    <section className="relative isolate overflow-hidden bg-ink px-4 py-14 text-white sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="aurora-blob -left-28 -top-20 h-72 w-72 bg-[#2f8f5b]" style={{ opacity: 0.35 }} />
        <div className="aurora-blob -right-20 top-1/4 h-64 w-64 bg-[#d4a017]" style={{ opacity: 0.18 }} />
        <div className="hero-grid absolute inset-0 opacity-50" />
      </div>

      <div
        className={`mx-auto flex max-w-5xl flex-col gap-8 ${
          centered ? 'items-center text-center' : 'md:flex-row md:items-center md:justify-between'
        }`}
      >
        <div className={centered ? 'max-w-2xl' : 'text-center md:max-w-xl md:text-left'}>
          {eyebrow ? (
            <BrandEyebrow tone="dark">{eyebrow}</BrandEyebrow>
          ) : null}
          <h1 className={`hero-title mt-4 text-white ${centered ? '' : ''}`}>{title}</h1>
          {subtitle ? <p className="mt-4 text-base text-white/70 sm:text-lg">{subtitle}</p> : null}
        </div>
        {children ? <div className={centered ? 'w-full max-w-sm' : 'w-full max-w-xs shrink-0 md:max-w-sm'}>{children}</div> : null}
      </div>
    </section>
  );
}
