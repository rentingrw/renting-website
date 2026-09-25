'use client';

import type { ReactNode } from 'react';

type ListingFilterRailProps = {
  children: ReactNode;
};

export function ListingFilterRail({ children }: ListingFilterRailProps) {
  return (
    <aside className="bg-ink p-4 text-white md:sticky md:top-[57px] md:h-[calc(100vh-57px)] md:w-72 md:shrink-0 md:overflow-y-auto">
      <div className="flex flex-col gap-2">{children}</div>
    </aside>
  );
}

type FilterButtonProps = {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
};

export function FilterButton({ active = false, onClick, children }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
        active
          ? 'border-white bg-white text-ink'
          : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
      }`}
    >
      {children}
    </button>
  );
}

export function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-white/60">{title}</p>
      {children}
    </div>
  );
}

const rangeThumb =
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white';

type FilterRangeProps = {
  label: string;
  min: number;
  max: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onChange: (nextMin: number, nextMax: number) => void;
  format?: (value: number) => string;
};

export function FilterRange({
  label,
  min,
  max,
  step = 1,
  valueMin,
  valueMax,
  onChange,
  format = String,
}: FilterRangeProps) {
  const span = Math.max(max - min, 1);
  const lowPct = ((valueMin - min) / span) * 100;
  const highPct = ((valueMax - min) / span) * 100;

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-3">
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span className="text-white/70">{label}</span>
        <span className="text-right text-white">
          {format(valueMin)} – {format(valueMax)}
        </span>
      </div>
      <div className="relative mt-4 h-2">
        <div className="absolute inset-0 rounded-full bg-white/15" />
        <div
          className="absolute h-2 rounded-full bg-white"
          style={{ left: `${lowPct}%`, width: `${Math.max(highPct - lowPct, 0)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          aria-label={`${label} minimum`}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Math.min(next, valueMax - step), valueMax);
          }}
          className={`pointer-events-none absolute inset-0 w-full appearance-none bg-transparent ${rangeThumb}`}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          aria-label={`${label} maximum`}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(valueMin, Math.max(next, valueMin + step));
          }}
          className={`pointer-events-none absolute inset-0 w-full appearance-none bg-transparent ${rangeThumb}`}
        />
      </div>
    </div>
  );
}

type FilterSliderProps = {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (next: number) => void;
  format?: (value: number) => string;
};

export function FilterSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  format = String,
}: FilterSliderProps) {
  const pct = ((value - min) / Math.max(max - min, 1)) * 100;

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-3">
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span className="text-white/70">{label}</span>
        <span className="text-white">{format(value)}</span>
      </div>
      <div className="relative mt-4 h-2">
        <div className="absolute inset-0 rounded-full bg-white/15" />
        <div className="absolute h-2 rounded-full bg-white" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`absolute inset-0 w-full cursor-pointer appearance-none bg-transparent ${rangeThumb}`}
        />
      </div>
    </div>
  );
}

export function compactRwf(value: number) {
  if (value >= 1000) return `RF ${Math.round(value / 1000)}k`;
  return `RF ${value}`;
}
