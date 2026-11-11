'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { onboardInputClass, onboardLabelClass } from '@/components/web/onboard-wizard-shell';

type Loc = { id: number; name: string; parent_id?: number };

type RwandaApi = {
  provinces: (where?: { id?: number }) => Loc | Loc[];
  districts: (where?: { id?: number; parent_id?: number }) => Loc | Loc[];
  sectors: (where?: { id?: number; parent_id?: number }) => Loc | Loc[];
  cells: (where?: { id?: number; parent_id?: number }) => Loc | Loc[];
};

function asList(result: Loc | Loc[] | undefined): Loc[] {
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

export function formatRwandaAdminAddress(province: string, district: string, sector: string, cell: string): string {
  return `${cell}, ${sector}, ${district}, ${province}`;
}

function parseRwandaAdminAddress(value: string): { cell?: string; sector?: string; district?: string; province?: string } {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 4) {
    return { cell: parts[0], sector: parts[1], district: parts[2], province: parts[3] };
  }
  return {};
}

type Props = {
  value: string;
  onChange: (formatted: string, districtName: string) => void;
};

export function RwandaAdminAddressSelect({ value, onChange }: Props) {
  const [api, setApi] = useState<RwandaApi | null>(null);
  const [provinceId, setProvinceId] = useState<number | ''>('');
  const [districtId, setDistrictId] = useState<number | ''>('');
  const [sectorId, setSectorId] = useState<number | ''>('');
  const [cellId, setCellId] = useState<number | ''>('');
  const lastEmitted = useRef('');

  useEffect(() => {
    let cancelled = false;
    void import('rwanda-relational').then((mod) => {
      if (!cancelled) {
        const loaded = (mod as { default?: RwandaApi }).default ?? (mod as unknown as RwandaApi);
        setApi(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!api || !value.trim()) return;
    if (value === lastEmitted.current) return;
    const parsed = parseRwandaAdminAddress(value);
    if (!parsed.province || !parsed.district || !parsed.sector || !parsed.cell) return;

    const provinces = asList(api.provinces() as Loc | Loc[]);
    const province = provinces.find((item) => item.name.toLowerCase() === parsed.province!.toLowerCase());
    if (!province) return;

    const districts = asList(api.districts({ parent_id: province.id }) as Loc | Loc[]);
    const district = districts.find((item) => item.name.toLowerCase() === parsed.district!.toLowerCase());
    if (!district) return;

    const sectors = asList(api.sectors({ parent_id: district.id }) as Loc | Loc[]);
    const sector = sectors.find((item) => item.name.toLowerCase() === parsed.sector!.toLowerCase());
    if (!sector) return;

    const cells = asList(api.cells({ parent_id: sector.id }) as Loc | Loc[]);
    const cell = cells.find((item) => item.name.toLowerCase() === parsed.cell!.toLowerCase());
    if (!cell) return;

    setProvinceId(province.id);
    setDistrictId(district.id);
    setSectorId(sector.id);
    setCellId(cell.id);
  }, [api, value]);

  const provinces = useMemo(() => (api ? asList(api.provinces() as Loc | Loc[]) : []), [api]);
  const districts = useMemo(
    () => (api && provinceId !== '' ? asList(api.districts({ parent_id: provinceId }) as Loc | Loc[]) : []),
    [api, provinceId],
  );
  const sectors = useMemo(
    () => (api && districtId !== '' ? asList(api.sectors({ parent_id: districtId }) as Loc | Loc[]) : []),
    [api, districtId],
  );
  const cells = useMemo(
    () => (api && sectorId !== '' ? asList(api.cells({ parent_id: sectorId }) as Loc | Loc[]) : []),
    [api, sectorId],
  );

  useEffect(() => {
    if (!api || provinceId === '' || districtId === '' || sectorId === '' || cellId === '') return;

    const province = asList(api.provinces({ id: provinceId }) as Loc | Loc[])[0]?.name;
    const district = asList(api.districts({ id: districtId }) as Loc | Loc[])[0]?.name;
    const sector = asList(api.sectors({ id: sectorId }) as Loc | Loc[])[0]?.name;
    const cell = asList(api.cells({ id: cellId }) as Loc | Loc[])[0]?.name;
    if (!province || !district || !sector || !cell) return;

    const formatted = formatRwandaAdminAddress(province, district, sector, cell);
    if (formatted === lastEmitted.current) return;
    lastEmitted.current = formatted;
    onChange(formatted, district);
  }, [api, provinceId, districtId, sectorId, cellId, onChange]);

  const selectClass = `${onboardInputClass} cursor-pointer`;

  if (!api) {
    return <p className="text-sm text-muted-foreground">Loading Rwanda locations…</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={onboardLabelClass} htmlFor="rw-province">
          Province
        </label>
        <select
          id="rw-province"
          className={selectClass}
          value={provinceId}
          onChange={(e) => {
            const next = e.target.value ? Number(e.target.value) : '';
            setProvinceId(next);
            setDistrictId('');
            setSectorId('');
            setCellId('');
            lastEmitted.current = '';
          }}
        >
          <option value="">Select province</option>
          {provinces.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={onboardLabelClass} htmlFor="rw-district">
          District
        </label>
        <select
          id="rw-district"
          className={selectClass}
          value={districtId}
          disabled={provinceId === ''}
          onChange={(e) => {
            const next = e.target.value ? Number(e.target.value) : '';
            setDistrictId(next);
            setSectorId('');
            setCellId('');
            lastEmitted.current = '';
          }}
        >
          <option value="">Select district</option>
          {districts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={onboardLabelClass} htmlFor="rw-sector">
          Sector
        </label>
        <select
          id="rw-sector"
          className={selectClass}
          value={sectorId}
          disabled={districtId === ''}
          onChange={(e) => {
            const next = e.target.value ? Number(e.target.value) : '';
            setSectorId(next);
            setCellId('');
            lastEmitted.current = '';
          }}
        >
          <option value="">Select sector</option>
          {sectors.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={onboardLabelClass} htmlFor="rw-cell">
          Cell
        </label>
        <select
          id="rw-cell"
          className={selectClass}
          value={cellId}
          disabled={sectorId === ''}
          onChange={(e) => {
            const next = e.target.value ? Number(e.target.value) : '';
            setCellId(next);
            lastEmitted.current = '';
          }}
        >
          <option value="">Select cell</option>
          {cells.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
