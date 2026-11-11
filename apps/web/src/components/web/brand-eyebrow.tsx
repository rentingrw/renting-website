import type { ReactNode } from 'react';

type BrandEyebrowTone = 'light' | 'dark' | 'sun';

const toneStyles: Record<BrandEyebrowTone, string> = {
  dark: 'border-white/15 bg-white/5 text-white/70',
  sun: 'border-ink/15 bg-ink/5 text-ink/70',
  light: 'border-border bg-card text-muted-foreground',
};

export function BrandEyebrow({
  children,
  tone = 'light',
}: {
  children: ReactNode;
  tone?: BrandEyebrowTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${toneStyles[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone === 'sun' ? 'bg-ink' : 'bg-sun'}`} />
      {children}
    </span>
  );
}
