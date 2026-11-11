'use client';

import type { CarListingRates } from '@/lib/api';
import { inCityRateLabel, outsideCityRateLabel } from '@/lib/listing-city';
import { onboardInputClass, onboardLabelClass } from '@/components/web/onboard-wizard-shell';

type RateField = keyof CarListingRates;

const IN_CITY_FIELDS: { key: RateField; period: string }[] = [
  { key: 'dailyRateInCityRwf', period: 'Daily' },
  { key: 'weeklyRateInCityRwf', period: 'Weekly' },
  { key: 'monthlyRateInCityRwf', period: 'Monthly' },
];

const OUTSIDE_CITY_FIELDS: { key: RateField; period: string }[] = [
  { key: 'dailyRateOutsideCityRwf', period: 'Daily' },
  { key: 'weeklyRateOutsideCityRwf', period: 'Weekly' },
  { key: 'monthlyRateOutsideCityRwf', period: 'Monthly' },
];

type CarListingRatesFieldsProps = {
  city: string;
  rates: CarListingRates;
  onChange: (field: RateField, value: number) => void;
  inputClass?: string;
  labelClass?: string;
};

function RateGroup({
  title,
  fields,
  rates,
  onChange,
  inputClass,
  labelClass,
}: {
  title: string;
  fields: { key: RateField; period: string }[];
  rates: CarListingRates;
  onChange: (field: RateField, value: number) => void;
  inputClass: string;
  labelClass: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-sm font-black text-foreground">{title}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {fields.map(({ key, period }) => (
          <div key={key}>
            <label className={labelClass}>{period} (RWF)</label>
            <input
              type="number"
              min={1000}
              step={500}
              className={inputClass}
              value={rates[key]}
              onChange={(event) => onChange(key, Number(event.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CarListingRatesFields({
  city,
  rates,
  onChange,
  inputClass = onboardInputClass,
  labelClass = onboardLabelClass,
}: CarListingRatesFieldsProps) {
  const cityLabel = city.trim() || 'your city';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set daily, weekly, and monthly rates for trips {inCityRateLabel(cityLabel).toLowerCase()} and{' '}
        {outsideCityRateLabel(cityLabel).toLowerCase()}.
      </p>
      <RateGroup
        title={inCityRateLabel(cityLabel)}
        fields={IN_CITY_FIELDS}
        rates={rates}
        onChange={onChange}
        inputClass={inputClass}
        labelClass={labelClass}
      />
      <RateGroup
        title={outsideCityRateLabel(cityLabel)}
        fields={OUTSIDE_CITY_FIELDS}
        rates={rates}
        onChange={onChange}
        inputClass={inputClass}
        labelClass={labelClass}
      />
    </div>
  );
}

export function defaultCarListingRates(): CarListingRates {
  return {
    dailyRateInCityRwf: 25_000,
    dailyRateOutsideCityRwf: 30_000,
    weeklyRateInCityRwf: 150_000,
    weeklyRateOutsideCityRwf: 180_000,
    monthlyRateInCityRwf: 700_000,
    monthlyRateOutsideCityRwf: 840_000,
  };
}
