import type { LucideIcon } from 'lucide-react';

import { BrandEyebrow } from '@/components/web/brand-eyebrow';

type ListingPageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
};

export function ListingPageHeader({ eyebrow, title, subtitle, icon: Icon }: ListingPageHeaderProps) {
  return (
    <header className="mb-6">
      {eyebrow ? <BrandEyebrow>{eyebrow}</BrandEyebrow> : null}
      <h1 className={`flex items-center gap-2.5 text-3xl font-black tracking-tight text-foreground ${eyebrow ? 'mt-3' : ''}`}>
        {Icon ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icon className="h-5 w-5" strokeWidth={2.25} />
          </span>
        ) : null}
        {title}
      </h1>
      {subtitle ? <p className="mt-1.5 text-sm font-medium text-muted-foreground">{subtitle}</p> : null}
    </header>
  );
}
