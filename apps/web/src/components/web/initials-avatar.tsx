'use client';

import Image from 'next/image';

type InitialsAvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  alt?: string;
};

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function InitialsAvatar({ name, src, size = 64, className = '', alt }: InitialsAvatarProps) {
  const initials = initialsFromName(name);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border-2 border-border bg-brand-soft ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={alt || ''} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-black uppercase tracking-wide text-foreground"
          style={{ fontSize: Math.max(12, Math.round(size * 0.36)) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
