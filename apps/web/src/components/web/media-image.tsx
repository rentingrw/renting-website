'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';

type MediaImageProps = Omit<ImageProps, 'onLoad' | 'onLoadingComplete'> & {
  /** Extra classes for the shimmer layer */
  shimmerClassName?: string;
  /** Soft shimmer while decoding. Set false when a content placeholder sits behind (e.g. initials). */
  showShimmer?: boolean;
};

/**
 * next/image with a muted shimmer while the bitmap loads, then a short fade-in.
 * For `fill`, the parent must be `relative` (and ideally already `bg-muted`).
 */
export function MediaImage({
  className = '',
  shimmerClassName = '',
  showShimmer = true,
  alt,
  src,
  fill,
  ...props
}: MediaImageProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <>
      {showShimmer && !loaded ? (
        <span
          className={`media-shimmer pointer-events-none absolute inset-0 z-[1] ${shimmerClassName}`}
          aria-hidden
        />
      ) : null}
      <Image
        {...props}
        src={src}
        alt={alt}
        fill={fill}
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-300 ease-out ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      />
    </>
  );
}
