'use client';

import { MediaImage } from '@/components/web/media-image';

export type AvatarShape = 'circle' | 'portrait';

export function avatarShapeRadiusClass(shape: AvatarShape = 'circle'): string {
  return shape === 'portrait' ? 'rounded-t-2xl rounded-b-md' : 'rounded-full';
}

export function avatarDimensions(shape: AvatarShape, size: number): { width: number; height: number } {
  if (shape === 'portrait') {
    return { width: size, height: Math.round(size * 1.25) };
  }
  return { width: size, height: size };
}

type InitialsAvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
  shape?: AvatarShape;
  className?: string;
  alt?: string;
};

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function InitialsAvatar({ name, src, size = 64, shape = 'circle', className = '', alt }: InitialsAvatarProps) {
  const initials = initialsFromName(name);
  const { width, height } = avatarDimensions(shape, size);

  return (
    <div
      className={`relative shrink-0 overflow-hidden border-2 border-border bg-brand-soft ${avatarShapeRadiusClass(shape)} ${className}`}
      style={{ width, height }}
    >
      <span
        className="flex h-full w-full items-center justify-center font-black uppercase tracking-wide text-foreground"
        style={{ fontSize: Math.max(12, Math.round(size * 0.36)) }}
        aria-hidden={Boolean(src)}
      >
        {initials}
      </span>
      {src ? (
        <MediaImage
          src={src}
          alt={alt || ''}
          fill
          sizes={`${size}px`}
          className="object-cover"
          showShimmer={false}
        />
      ) : null}
    </div>
  );
}
