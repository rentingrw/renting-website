'use client';

import { useEffect, useMemo, useState } from 'react';

import { onboardLabelClass } from '@/components/web/onboard-wizard-shell';

type Loc = { id: number; name: string; parent_id?: number };

type RwandaApi = {
  provinces: (where?: { id?: number }) => Loc | Loc[];
  districts: (where?: { id?: number; parent_id?: number }) => Loc | Loc[];
};

function asList(result: Loc | Loc[] | undefined): Loc[] {
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

type RwandaDistrictMultiSelectProps = {
  label?: string;
  value: string[];
  onChange: (districts: string[]) => void;
  /** Dashboard form uses different label/input classes */
  variant?: 'onboard' | 'dashboard';
  labelClassName?: string;
  chipActiveClass?: string;
  chipInactiveClass?: string;
};

export function RwandaDistrictMultiSelect({
  label = 'Districts you serve',
  value,
  onChange,
  variant = 'onboard',
  labelClassName,
  chipActiveClass,
  chipInactiveClass,
}: RwandaDistrictMultiSelectProps) {
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void import('rwanda-relational').then((mod) => {
      if (cancelled) return;
      const api = (mod as { default?: RwandaApi }).default ?? (mod as unknown as RwandaApi);
      const provinces = asList(api.provinces() as Loc | Loc[]);
      const names: string[] = [];
      for (const province of provinces) {
        const children = asList(api.districts({ parent_id: province.id }) as Loc | Loc[]);
        for (const d of children) names.push(d.name);
      }
      setDistricts([...new Set(names)].sort((a, b) => a.localeCompare(b)));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedSelected = useMemo(() => [...value].sort((a, b) => a.localeCompare(b)), [value]);

  function toggle(name: string) {
    if (value.includes(name)) {
      if (value.length === 1) return;
      onChange(value.filter((item) => item !== name));
    } else {
      onChange([...value, name]);
    }
  }

  const labelClass = labelClassName ?? onboardLabelClass;
  const active =
    chipActiveClass ??
    (variant === 'onboard'
      ? 'border-brand bg-brand-soft text-foreground'
      : 'border-brand bg-brand text-white');
  const inactive =
    chipInactiveClass ??
    (variant === 'onboard'
      ? 'border-border text-muted-foreground'
      : 'border-neutral-300 bg-card text-muted-foreground hover:border-border');

  return (
    <div>
      <p className={labelClass}>{label} *</p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading districts…</p>
      ) : (
        <div className="mt-2 flex max-h-52 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3">
          {districts.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              className={`rounded border px-2.5 py-1 text-xs font-bold transition-all sm:text-sm ${
                value.includes(name) ? active : inactive
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {sortedSelected.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Selected: {sortedSelected.join(', ')}
        </p>
      ) : null}
    </div>
  );
}