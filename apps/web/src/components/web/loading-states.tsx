'use client';

import { Skeleton } from '@rentingi/ui';

/** Dashboard app loading - matches layout structure */
export function AppLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 h-14 border-b border-gray-200 bg-background/90" />
      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Skeleton className="h-9 w-48 bg-gray-200" />
            <Skeleton className="mt-2 h-4 w-32 bg-gray-200" />
          </div>
        </div>
        <div className="-mx-4 flex gap-1 border-b border-gray-200 bg-white px-4 py-3 md:mx-0">
          <Skeleton className="h-9 w-20 rounded-lg bg-gray-200" />
          <Skeleton className="h-9 w-24 rounded-lg bg-gray-200" />
        </div>
        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg bg-gray-200" />
          ))}
        </section>
      </main>
    </div>
  );
}

/** Search result card skeleton */
export function SearchCardSkeleton({ variant = 'car' }: { variant?: 'car' | 'driver' }) {
  return (
    <div className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <Skeleton
        className={`shrink-0 bg-gray-200 ${variant === 'car' ? 'h-16 w-24' : 'h-16 w-16 rounded-full'}`}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 bg-gray-200" />
        <Skeleton className="h-3 w-1/2 bg-gray-200" />
        <Skeleton className="h-4 w-20 bg-gray-200" />
      </div>
    </div>
  );
}

/** Search popup loading - list of card skeletons */
export function SearchPopupLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <SearchCardSkeleton key={i} variant={i % 2 === 0 ? 'driver' : 'car'} />
      ))}
    </div>
  );
}

/** Car/Driver detail page skeleton */
export function DetailPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <section className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-52 rounded-lg bg-gray-200" />
        <Skeleton className="h-52 rounded-lg bg-gray-200" />
        <Skeleton className="h-52 rounded-lg bg-gray-200" />
      </section>
      <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64 bg-gray-200" />
          <Skeleton className="h-4 w-full bg-gray-200" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded bg-gray-200" />
            <Skeleton className="h-6 w-24 rounded bg-gray-200" />
          </div>
          <Skeleton className="h-20 w-full bg-gray-200" />
        </div>
        <Skeleton className="h-64 rounded-lg bg-gray-200" />
      </section>
    </div>
  );
}

/** Inline spinner for buttons/small areas */
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? 'h-5 w-5'}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
