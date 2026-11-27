import { ShieldCheck } from 'lucide-react';

type VerifiedBadgeProps = {
  label: string;
  /** Default pill with icon + label; compact is slightly smaller */
  size?: 'default' | 'compact' | 'hero';
  className?: string;
};

const sizeStyles = {
  compact: 'gap-1 px-2 py-0.5 text-[10px]',
  default: 'gap-1.5 px-2.5 py-1 text-[11px]',
  hero: 'gap-2 px-3 py-1.5 text-xs',
} as const;

const iconSizes = {
  compact: 'h-3 w-3',
  default: 'h-3.5 w-3.5',
  hero: 'h-4 w-4',
} as const;

/** Platform verified badge — icon + label pill */
export function VerifiedBadge({ label, size = 'default', className = '' }: VerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border border-emerald-500/35 bg-gradient-to-br from-emerald-50 via-white to-teal-50 font-bold uppercase tracking-wide text-emerald-900 shadow-[0_1px_0_rgba(16,185,129,0.15),0_2px_8px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/10 ${sizeStyles[size]} ${className}`}
    >
      <ShieldCheck className={`shrink-0 text-emerald-600 ${iconSizes[size]}`} strokeWidth={2.5} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

type VerifiedPhotoMarkProps = {
  label: string;
  className?: string;
};

/** Verified mark on driver profile photos */
export function VerifiedPhotoMark({ label, className = '' }: VerifiedPhotoMarkProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`absolute bottom-2.5 left-2.5 z-10 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full border border-white/90 bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-[0_2px_8px_rgba(5,150,105,0.45)] ${className}`}
    >
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}