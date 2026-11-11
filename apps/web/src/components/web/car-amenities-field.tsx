'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

import { CAR_AMENITIES, addCustomAmenity, toggleAmenity } from '@/lib/car-amenities';

type CarAmenitiesFieldProps = {
  selected: string[];
  onChange: (next: string[]) => void;
  label?: string;
  hint?: string;
  compact?: boolean;
};

export function CarAmenitiesField({
  selected,
  onChange,
  label = 'Amenities',
  hint = 'Select everything your car offers. Renters see these on your listing page.',
  compact = false,
}: CarAmenitiesFieldProps) {
  const [custom, setCustom] = useState('');

  function toggle(amenity: string) {
    onChange(toggleAmenity(selected, amenity));
  }

  function addCustom() {
    const next = addCustomAmenity(selected, custom);
    if (next.length !== selected.length) {
      onChange(next);
      setCustom('');
    }
  }

  const chipClass = (on: boolean) =>
    `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      on
        ? 'border-brand bg-brand text-white'
        : 'border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground'
    }`;

  return (
    <div>
      <p className={`font-black uppercase tracking-widest text-muted-foreground ${compact ? 'mb-1.5 text-[10px]' : 'mb-2 text-xs'}`}>
        {label}
      </p>
      {hint ? <p className="mb-3 text-xs font-medium text-muted-foreground">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        {CAR_AMENITIES.map((amenity) => {
          const on = selected.includes(amenity);
          return (
            <button key={amenity} type="button" onClick={() => toggle(amenity)} className={chipClass(on)}>
              {on ? <Check className="h-3 w-3 shrink-0" aria-hidden /> : null}
              {amenity}
            </button>
          );
        })}
      </div>
      <div className={`flex gap-2 ${compact ? 'mt-2' : 'mt-3'}`}>
        <input
          className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
          placeholder="Other amenity…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button
          type="button"
          onClick={addCustom}
          className="shrink-0 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-bold text-foreground hover:bg-muted/80"
        >
          Add
        </button>
      </div>
      <p className="mt-2 text-xs font-medium text-muted-foreground">
        {selected.length === 0 ? 'Pick at least one amenity.' : `${selected.length} selected`}
      </p>
    </div>
  );
}
