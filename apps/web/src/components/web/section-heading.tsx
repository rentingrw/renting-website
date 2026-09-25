import Link from 'next/link';

type SectionHeadingProps = {
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
};

export function SectionHeading({ title, description, href, actionLabel }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-[1.75rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {href && actionLabel ? (
        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-brand transition hover:underline"
        >
          {actionLabel} →
        </Link>
      ) : null}
    </div>
  );
}
