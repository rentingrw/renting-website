import type { ReactNode } from 'react';

export function MarketingCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.35rem] border border-border/80 bg-card p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-soft ${className}`}
    >
    {children}
  </div>
  );
}
