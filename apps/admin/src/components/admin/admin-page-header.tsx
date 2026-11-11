import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
};

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="admin-panel relative p-5 sm:p-6">
      <div className="hero-grid-light pointer-events-none absolute inset-0 opacity-80" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-sun" />
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm font-medium text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
