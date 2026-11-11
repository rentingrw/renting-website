'use client';

import { onboardInputClass, onboardLabelClass } from '@/components/web/onboard-wizard-shell';
import {
  CAR_BRANDS,
  CAR_COLORS,
  CUSTOM_BRAND,
  CUSTOM_MODEL,
  modelsForBrand,
  yearOptions,
} from '@/lib/car-catalog';

type CarVehicleSelectProps = {
  brand: string;
  customBrand: string;
  model: string;
  customModel: string;
  year: number;
  color: string;
  customColor?: string;
  onBrandChange: (value: string) => void;
  onCustomBrandChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onCustomModelChange: (value: string) => void;
  onYearChange: (value: number) => void;
  onColorChange: (value: string) => void;
  onCustomColorChange?: (value: string) => void;
  inputClass?: string;
  labelClass?: string;
  compact?: boolean;
};

export function CarVehicleSelect({
  brand,
  customBrand,
  model,
  customModel,
  year,
  color,
  customColor = '',
  onBrandChange,
  onCustomBrandChange,
  onModelChange,
  onCustomModelChange,
  onYearChange,
  onColorChange,
  onCustomColorChange,
  inputClass = onboardInputClass,
  labelClass = onboardLabelClass,
  compact = false,
}: CarVehicleSelectProps) {
  const modelOptions = modelsForBrand(brand);
  const years = yearOptions();
  const gridGap = compact ? 'gap-2' : 'gap-3';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridGap}`}>
        <div>
          <label className={labelClass}>Brand</label>
          <select
            className={inputClass}
            value={brand}
            onChange={(event) => {
              const next = event.target.value;
              onBrandChange(next);
              const nextModels = modelsForBrand(next);
              if (!nextModels.includes(model)) onModelChange(nextModels[0] ?? CUSTOM_MODEL);
            }}
          >
            <option value="">Select brand…</option>
            {CAR_BRANDS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        {brand === CUSTOM_BRAND ? (
          <div>
            <label className={labelClass}>Brand name</label>
            <input
              className={inputClass}
              placeholder="e.g. Proton"
              value={customBrand}
              onChange={(event) => onCustomBrandChange(event.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridGap}`}>
        <div>
          <label className={labelClass}>Model</label>
          <select
            className={inputClass}
            value={model}
            disabled={!brand}
            onChange={(event) => onModelChange(event.target.value)}
          >
            <option value="">Select model…</option>
            {modelOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        {model === CUSTOM_MODEL ? (
          <div>
            <label className={labelClass}>Model name</label>
            <input
              className={inputClass}
              placeholder="e.g. X50"
              value={customModel}
              onChange={(event) => onCustomModelChange(event.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 ${gridGap}`}>
        <div>
          <label className={labelClass}>Year</label>
          <select className={inputClass} value={year} onChange={(event) => onYearChange(Number(event.target.value))}>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Color</label>
          <select className={inputClass} value={color} onChange={(event) => onColorChange(event.target.value)}>
            <option value="">Select color…</option>
            {CAR_COLORS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        {color === 'Other' && onCustomColorChange ? (
          <div className="col-span-2 sm:col-span-1">
            <label className={labelClass}>Color name</label>
            <input
              className={inputClass}
              placeholder="e.g. Midnight blue"
              value={customColor}
              onChange={(event) => onCustomColorChange(event.target.value)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
