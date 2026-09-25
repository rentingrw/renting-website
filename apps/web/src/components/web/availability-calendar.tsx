'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { getCarAvailability } from '@/lib/api';

type BookedRange = { startDate: string; endDate: string };

export type Props = {
  carId: string;
  initialBookedRanges: BookedRange[];
  selectedStart: Date | null;
  selectedEnd: Date | null;
  onSelect: (start: Date, end: Date | null) => void;
};

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function toMonthKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

export function AvailabilityCalendar({ carId, initialBookedRanges, selectedStart, selectedEnd, onSelect }: Props) {
  const today = dayStart(new Date());
  const initYear = today.getFullYear();
  const initMonth = today.getMonth();

  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [allRanges, setAllRanges] = useState<BookedRange[]>(initialBookedRanges);
  const fetchedMonths = useRef<Set<string>>(new Set([toMonthKey(initYear, initMonth)]));

  async function fetchMonth(y: number, m: number) {
    const key = toMonthKey(y, m);
    if (fetchedMonths.current.has(key)) return;
    fetchedMonths.current.add(key);
    try {
      const data = await getCarAvailability(carId, key);
      setAllRanges(prev => {
        const existingKeys = new Set(prev.map(r => r.startDate + '|' + r.endDate));
        const fresh = data.bookedRanges
          .map(r => ({ startDate: r.startDate, endDate: r.endDate }))
          .filter(r => !existingKeys.has(r.startDate + '|' + r.endDate));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    } catch { /* ignore */ }
  }

  useEffect(() => {
    void fetchMonth(viewYear, viewMonth);
    const nm = viewMonth === 11 ? 0 : viewMonth + 1;
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
    void fetchMonth(ny, nm);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  function isBooked(d: Date): boolean {
    const ds = dayStart(d).getTime();
    return allRanges.some(r => {
      const s = dayStart(new Date(r.startDate)).getTime();
      const e = dayStart(new Date(r.endDate)).getTime();
      return ds >= s && ds <= e;
    });
  }

  function rangeHasConflict(start: Date, end: Date): boolean {
    const cur = new Date(dayStart(start));
    cur.setDate(cur.getDate() + 1);
    while (cur.getTime() < dayStart(end).getTime()) {
      if (isBooked(cur)) return true;
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  }

  function isInRange(d: Date): boolean {
    const start = selectedStart ? dayStart(selectedStart) : null;
    const tentativeEnd = selectedEnd
      ? dayStart(selectedEnd)
      : hoverDate && selectedStart && !selectedEnd
        ? dayStart(hoverDate)
        : null;
    if (!start || !tentativeEnd) return false;
    const ds = dayStart(d).getTime();
    return ds > start.getTime() && ds < tentativeEnd.getTime();
  }

  function handleClick(d: Date) {
    const ds = dayStart(d);
    if (ds.getTime() < today.getTime()) return;
    if (isBooked(ds)) return;

    if (!selectedStart || selectedEnd) {
      onSelect(ds, null);
      return;
    }

    const startDs = dayStart(selectedStart);
    if (ds.getTime() < startDs.getTime()) {
      onSelect(ds, null);
    } else if (sameDay(ds, startDs)) {
      onSelect(startDs, ds);
    } else if (rangeHasConflict(startDs, ds)) {
      onSelect(ds, null);
    } else {
      onSelect(startDs, ds);
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const canGoPrev = viewYear > initYear || (viewYear === initYear && viewMonth > initMonth);

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  type Cell = { date: Date } | null;
  const cells: Cell[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ date: new Date(viewYear, viewMonth, i + 1) })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selStart = selectedStart ? dayStart(selectedStart) : null;
  const selEnd = selectedEnd ? dayStart(selectedEnd) : null;

  return (
    <div className="w-full select-none">
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="rounded border-2 border-border p-1.5 transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-sm font-black text-foreground">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded border-2 border-border p-1.5 transition-all hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7">
        {DAY_LABELS.map(d => (
          <div key={d} className="py-1 text-center text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`e-${idx}`} className="h-9" />;

          const ds = dayStart(cell.date);
          const isPast = ds.getTime() < today.getTime();
          const booked = isBooked(ds);
          const isStart = selStart ? sameDay(ds, selStart) : false;
          const isEnd = selEnd ? sameDay(ds, selEnd) : false;
          const inRange = isInRange(ds);
          const isToday = sameDay(ds, today);
          const disabled = isPast || booked;

          let cls = 'relative flex h-9 w-full items-center justify-center text-xs transition-colors ';

          if (isStart || isEnd) {
            cls += 'bg-brand text-white font-black z-10 ';
            if (isStart && !selEnd && !hoverDate) cls += 'rounded ';
            else if (isStart) cls += 'rounded-l ';
            else cls += 'rounded-r ';
          } else if (inRange) {
            cls += 'bg-brand-soft text-brand-strong font-semibold ';
          } else if (booked) {
            cls += 'cursor-not-allowed bg-red-50 font-medium text-red-400 line-through ';
          } else if (isPast) {
            cls += 'cursor-not-allowed font-medium text-neutral-300 ';
          } else {
            cls += 'cursor-pointer font-semibold text-foreground hover:rounded-lg hover:bg-brand-soft hover:text-brand-strong ';
          }

          return (
            <button
              key={ds.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(ds)}
              onMouseEnter={() => {
                if (!disabled && selectedStart && !selectedEnd) setHoverDate(ds);
              }}
              onMouseLeave={() => setHoverDate(null)}
              className={cls}
              aria-label={ds.toLocaleDateString()}
            >
              <span className={isToday && !isStart && !isEnd ? 'underline underline-offset-2' : ''}>
                {cell.date.getDate()}
              </span>
              {booked && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Status message + legend */}
      <div className="mt-2 border-t border-neutral-100 pt-2">
        {!selectedStart && (
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Click a day to set your pick-up date.</p>
        )}
        {selectedStart && !selectedEnd && (
          <p className="mb-1.5 text-xs font-medium text-brand">
            Pick-up: {dayStart(selectedStart).toLocaleDateString('en', { month: 'short', day: 'numeric' })} — now click your return date.
          </p>
        )}
        {selectedStart && selectedEnd && (
          <p className="mb-1.5 text-xs font-medium text-brand">
            {dayStart(selectedStart).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            {' → '}
            {dayStart(selectedEnd).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            {' · '}
            {Math.max(1, Math.round((dayStart(selectedEnd).getTime() - dayStart(selectedStart).getTime()) / 86400000))} day(s)
            {' '}
            <button type="button" onClick={() => onSelect(selectedStart, null)} className="ml-1 font-black text-muted-foreground underline hover:text-red-600">
              clear
            </button>
          </p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand" /> Selected
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-red-200 bg-red-50" /> Already booked
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted" /> Unavailable
          </span>
        </div>
      </div>
    </div>
  );
}
