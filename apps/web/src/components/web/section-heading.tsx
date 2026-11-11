import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

type SectionHeadingProps = {
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
  index?: string;
};

export function SectionHeading({ title, description, href, actionLabel, index }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="flex items-baseline gap-2.5">
          {index ? <span className="text-sm font-black text-sun">{index}</span> : null}
          <h2 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">{title}</h2>
        </div>
        {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
      </div>
      {href && actionLabel ? (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-ink hover:bg-ink hover:text-white"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} />
        </Link>
      ) : null}
    </div>
  );
}
