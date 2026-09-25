'use client';

import { useEffect, useState } from 'react';

const DEFAULT_WINDOW_MS = 60 * 60 * 1000;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

type BookingCountdownProps = {
  createdAt: string;
  windowMs?: number;
  expiredLabel?: string;
  className?: string;
};

export function BookingCountdown({
  createdAt,
  windowMs = DEFAULT_WINDOW_MS,
  expiredLabel = 'Expired',
  className,
}: BookingCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, new Date(createdAt).getTime() + windowMs - now);
  const label = remaining <= 0 ? expiredLabel : formatRemaining(remaining);

  return <span className={className ?? 'font-semibold tabular-nums'}>{label}</span>;
}
