'use client';

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@rentingi/ui';
import { LoadingSpinner } from '@/components/web/loading-states';
import { AddressInput } from '@/components/web/address-input';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ChevronLeft, ChevronRight, MapPin, Minus, Plus, Upload } from 'lucide-react';

import { getCarUploadUrl, type CarListingPayload, type OwnerCar, type ServiceType, type VehicleType } from '@/lib/api';

type OwnerListingWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCar?: OwnerCar | null;
  onSubmit: (payload: CarListingPayload, publishNow: boolean) => Promise<void>;
  canPublish: boolean;
  getToken: () => Promise<string | null>;
};

type ListingFormState = {
  title: string;
  description: string;
  vehicleType: VehicleType;
  serviceType: ServiceType;
  brand: string;
  model: string;
  year: number;
  seats: number;
  transmission: string;
  fuelType: string;
  dailyRateKigaliRwf: number;
  dailyRateCountrysideRwf: number;
  weeklyRateRwf: string;
  monthlyRateRwf: string;
  priceNegotiable: boolean;
  locationText: string;
  latitude: string;
  longitude: string;
  photos: string[];
  features: string[];
};

const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string; emoji: string }[] = [
  { value: 'sedan', label: 'Sedan', emoji: '🚗' },
  { value: 'suv', label: 'SUV', emoji: '🚙' },
  { value: 'hatchback', label: 'Hatchback', emoji: '🚘' },
  { value: 'pickup', label: 'Pickup', emoji: '🛻' },
  { value: 'van', label: 'Van', emoji: '🚐' },
  { value: 'truck', label: 'Truck', emoji: '🚛' },
];

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string; desc: string }[] = [
  { value: 'self_drive', label: 'Self-Drive', desc: 'Renter drives themselves' },
  { value: 'with_driver', label: 'With Driver', desc: 'Your driver included' },
  { value: 'airport_transfer', label: 'Airport Transfer', desc: 'Airport pickup & drop' },
  { value: 'corporate', label: 'Corporate', desc: 'Business use' },
];

const TRANSMISSION_OPTIONS = ['Manual', 'Automatic', 'Both'];
const FUEL_OPTIONS = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'Other'];

const COMMON_FEATURES = [
  'Air Conditioning', 'Leather Seats', 'GPS Navigation', 'Bluetooth',
  'USB Charging', 'Child Seat Available', 'Roof Rack', '4WD / AWD',
  'Sunroof', 'Backup Camera', 'Insurance Included', 'Airport Pickup',
  'Extra Driver Allowed', 'Fuel Included',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1999 }, (_, i) => CURRENT_YEAR - i);
const SEAT_OPTIONS = [2, 4, 5, 6, 7, 8, 9, 10, 12, 14];

const STEPS = ['Details', 'Photos', 'Pricing', 'Location', 'Publish'];

function emptyState(): ListingFormState {
  return {
    title: '',
    description: '',
    vehicleType: 'sedan',
    serviceType: 'self_drive',
    brand: '',
    model: '',
    year: CURRENT_YEAR,
    seats: 5,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    dailyRateKigaliRwf: 25000,
    dailyRateCountrysideRwf: 30000,
    weeklyRateRwf: '',
    monthlyRateRwf: '',
    priceNegotiable: false,
    locationText: 'Kigali',
    latitude: '',
    longitude: '',
    photos: [],
    features: [],
  };
}

function fromCar(car: OwnerCar): ListingFormState {
  return {
    title: car.title,
    description: car.description ?? '',
    vehicleType: car.vehicleType,
    serviceType: car.serviceType,
    brand: car.brand,
    model: car.model,
    year: car.year,
    seats: car.seats,
    transmission: car.transmission ?? 'Automatic',
    fuelType: car.fuelType ?? 'Petrol',
    dailyRateKigaliRwf: car.dailyRateKigaliRwf,
    dailyRateCountrysideRwf: car.dailyRateCountrysideRwf,
    weeklyRateRwf: '',
    monthlyRateRwf: '',
    priceNegotiable: false,
    locationText: car.locationText,
    latitude: '',
    longitude: '',
    photos: car.photos,
    features: car.features,
  };
}

function formatRwf(n: number) {
  return n.toLocaleString('en-RW') + ' RWF';
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-black uppercase tracking-widest text-neutral-500">{children}</p>
  );
}

export function OwnerListingWizard({
  open,
  onOpenChange,
  initialCar,
  onSubmit,
  canPublish,
  getToken,
}: OwnerListingWizardProps) {
  const t = useTranslations('web');
  const [step, setStep] = useState(0);
  const [publishNow, setPublishNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customFeature, setCustomFeature] = useState('');
  const [state, setState] = useState<ListingFormState>(emptyState());

  const isEditing = Boolean(initialCar);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError(null);
    setPublishNow(false);
    setCustomFeature('');
    setState(initialCar ? fromCar(initialCar) : emptyState());
  }, [initialCar, open]);

  function update<K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFeature(feature: string) {
    setState((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  }

  function addCustomFeature() {
    const trimmed = customFeature.trim();
    if (!trimmed || state.features.includes(trimmed)) return;
    setState((prev) => ({ ...prev, features: [...prev.features, trimmed] }));
    setCustomFeature('');
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files?.length) return;
    const token = await getToken();
    if (!token) { setError('Please sign in to upload photos.'); return; }
    setUploading(true);
    setError(null);
    try {
      const { uploadUrl, fields } = await getCarUploadUrl(token);
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const formData = new FormData();
        // Cloudinary requires all fields before the file
        Object.entries(fields).forEach(([k, v]) => formData.append(k, String(v)));
        formData.append('file', file);
        const res = await fetch(uploadUrl, { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: { message?: string } })?.error?.message ?? `Upload failed: ${res.status}`);
        }
        const data = (await res.json()) as { secure_url?: string };
        if (data.secure_url) urls.push(data.secure_url);
      }
      if (urls.length) {
        update('photos', [...state.photos, ...urls]);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function parsePayload(): CarListingPayload {
    return {
      title: state.title.trim(),
      description: state.description.trim() || undefined,
      vehicleType: state.vehicleType,
      serviceType: state.serviceType,
      brand: state.brand.trim(),
      model: state.model.trim(),
      year: state.year,
      seats: state.seats,
      transmission: state.transmission || undefined,
      fuelType: state.fuelType || undefined,
      dailyRateKigaliRwf: state.dailyRateKigaliRwf,
      dailyRateCountrysideRwf: state.dailyRateCountrysideRwf,
      weeklyRateRwf: state.weeklyRateRwf ? Number(state.weeklyRateRwf) : undefined,
      monthlyRateRwf: state.monthlyRateRwf ? Number(state.monthlyRateRwf) : undefined,
      priceNegotiable: state.priceNegotiable,
      locationText: state.locationText.trim(),
      latitude: state.latitude.trim() ? Number(state.latitude) : undefined,
      longitude: state.longitude.trim() ? Number(state.longitude) : undefined,
      photos: state.photos,
      features: state.features,
    };
  }

  async function handleSubmit() {
    setError(null);
    try {
      setBusy(true);
      await onSubmit(parsePayload(), publishNow);
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('app.listingWizard.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  const inputClass = 'w-full rounded border-2 border-neutral-900 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none focus:border-teal-600';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-neutral-900">
            {isEditing ? t('app.listingWizard.editTitle') : t('app.listingWizard.createTitle')}
          </DialogTitle>
        </DialogHeader>

        {/* Step progress */}
        <div className="space-y-2">
          <div className="flex gap-1">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-teal-600' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        {/* ── STEP 0: Car Details ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <FieldLabel>Listing title</FieldLabel>
              <input
                className={inputClass}
                placeholder="e.g. Toyota RAV4 2022 — Kigali"
                value={state.title}
                onChange={(e) => update('title', e.target.value)}
              />
            </div>

            <div>
              <FieldLabel>Description (optional)</FieldLabel>
              <textarea
                className={`${inputClass} min-h-[80px] resize-none`}
                placeholder="Tell renters what makes your car special..."
                value={state.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>

            <div>
              <FieldLabel>Vehicle Type</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {VEHICLE_TYPE_OPTIONS.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update('vehicleType', value)}
                    className={`flex flex-col items-center gap-1 rounded border-2 py-3 text-center transition-all ${
                      state.vehicleType === value
                        ? 'border-teal-600 bg-teal-50 shadow-[2px_2px_0px_0px_rgba(13,148,136,0.4)]'
                        : 'border-neutral-300 bg-white hover:border-neutral-900'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs font-black text-neutral-900">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Service Type</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {SERVICE_TYPE_OPTIONS.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update('serviceType', value)}
                    className={`rounded border-2 p-3 text-left transition-all ${
                      state.serviceType === value
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-neutral-300 bg-white hover:border-neutral-900'
                    }`}
                  >
                    <p className="text-sm font-black text-neutral-900">{label}</p>
                    <p className="text-xs font-medium text-neutral-500">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Brand</FieldLabel>
                <input className={inputClass} placeholder="Toyota" value={state.brand} onChange={(e) => update('brand', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Model</FieldLabel>
                <input className={inputClass} placeholder="RAV4" value={state.model} onChange={(e) => update('model', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Year</FieldLabel>
                <select
                  className={inputClass}
                  value={state.year}
                  onChange={(e) => update('year', Number(e.target.value))}
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Seats</FieldLabel>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => update('seats', Math.max(2, state.seats - 1))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded border-2 border-neutral-900 bg-white hover:bg-neutral-100"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex-1 rounded border-2 border-neutral-900 py-2 text-center text-sm font-black text-neutral-900">
                    {state.seats}
                  </div>
                  <button
                    type="button"
                    onClick={() => update('seats', Math.min(14, state.seats + 1))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded border-2 border-neutral-900 bg-white hover:bg-neutral-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Transmission</FieldLabel>
                <div className="flex gap-1.5">
                  {TRANSMISSION_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('transmission', opt)}
                      className={`flex-1 rounded border-2 py-2 text-xs font-black transition-all ${
                        state.transmission === opt
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>Fuel Type</FieldLabel>
                <select
                  className={inputClass}
                  value={state.fuelType}
                  onChange={(e) => update('fuelType', e.target.value)}
                >
                  {FUEL_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <FieldLabel>Features & Amenities</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {COMMON_FEATURES.map((feature) => {
                  const selected = state.features.includes(feature);
                  return (
                    <button
                      key={feature}
                      type="button"
                      onClick={() => toggleFeature(feature)}
                      className={`flex items-center gap-1.5 rounded border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                        selected
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {feature}
                    </button>
                  );
                })}
              </div>
              {/* Custom feature input */}
              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded border-2 border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:border-teal-600 focus:outline-none"
                  placeholder="Add custom feature..."
                  value={customFeature}
                  onChange={(e) => setCustomFeature(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomFeature(); } }}
                />
                <button
                  type="button"
                  onClick={addCustomFeature}
                  className="rounded border-2 border-neutral-900 bg-white px-3 py-2 text-xs font-black hover:bg-neutral-100"
                >
                  Add
                </button>
              </div>
              {state.features.length > 0 && (
                <p className="mt-2 text-xs font-medium text-teal-700">{state.features.length} feature{state.features.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 1: Photos ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <FieldLabel>Upload Photos</FieldLabel>
              {/* Hidden file input — triggered via ref to avoid Dialog blocking issues */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
                disabled={uploading}
                onChange={(e) => { handlePhotoUpload(e.target.files); e.target.value = ''; }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center gap-3 rounded border-2 border-dashed border-neutral-400 bg-neutral-50 px-6 py-10 transition hover:border-teal-600 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <span className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
                    <LoadingSpinner className="h-5 w-5" />
                    Uploading photos...
                  </span>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-neutral-400" />
                    <div className="text-center">
                      <p className="text-sm font-black text-neutral-900">Click to upload photos</p>
                      <p className="text-xs font-medium text-neutral-500">JPG, PNG up to 10MB each. Multiple files allowed.</p>
                    </div>
                  </>
                )}
              </button>
            </div>

            {state.photos.length > 0 && (
              <div>
                <FieldLabel>{state.photos.length} photo{state.photos.length !== 1 ? 's' : ''} added</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {state.photos.map((url, i) => (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded border-2 border-neutral-900 bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => update('photos', state.photos.filter((_, j) => j !== i))}
                        className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white group-hover:flex"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.photos.length === 0 && (
              <div className="flex items-start gap-2 rounded border-2 border-amber-400 bg-amber-50 px-4 py-3">
                <Camera className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs font-semibold text-amber-800">
                  Listings with photos get 3× more bookings. Add at least 3 good photos.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Pricing ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <FieldLabel>Daily Rate — Kigali (RWF)</FieldLabel>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={500}
                  className={inputClass}
                  value={state.dailyRateKigaliRwf}
                  onChange={(e) => update('dailyRateKigaliRwf', Number(e.target.value))}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">Displayed to renters:</span>
                <span className="text-sm font-black text-teal-700">{formatRwf(state.dailyRateKigaliRwf)}/day</span>
              </div>
              {/* Quick presets */}
              <div className="mt-3 flex flex-wrap gap-2">
                <p className="w-full text-xs font-semibold text-neutral-400">Quick presets:</p>
                {[15000, 25000, 40000, 60000, 80000, 120000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => update('dailyRateKigaliRwf', preset)}
                    className={`rounded border-2 px-2.5 py-1 text-xs font-bold transition-all ${
                      state.dailyRateKigaliRwf === preset
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900'
                    }`}
                  >
                    {formatRwf(preset)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Daily Rate — Countryside / Upcountry (RWF)</FieldLabel>
              <input
                type="number"
                min={0}
                step={500}
                className={inputClass}
                value={state.dailyRateCountrysideRwf}
                onChange={(e) => update('dailyRateCountrysideRwf', Number(e.target.value))}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">Displayed to renters:</span>
                <span className="text-sm font-black text-teal-700">{formatRwf(state.dailyRateCountrysideRwf)}/day</span>
              </div>
            </div>

            {/* Weekly rate */}
            <div>
              <FieldLabel>Weekly Rate (RWF) — optional</FieldLabel>
              <input
                type="number"
                min={0}
                step={500}
                className={inputClass}
                value={state.weeklyRateRwf}
                onChange={(e) => update('weeklyRateRwf', e.target.value)}
                placeholder="e.g. 150000"
              />
              <p className="mt-1 text-xs font-medium text-neutral-500">
                Discount for 7+ day bookings. Leave blank to not offer.
              </p>
            </div>

            {/* Monthly rate */}
            <div>
              <FieldLabel>Monthly Rate (RWF) — optional</FieldLabel>
              <input
                type="number"
                min={0}
                step={500}
                className={inputClass}
                value={state.monthlyRateRwf}
                onChange={(e) => update('monthlyRateRwf', e.target.value)}
                placeholder="e.g. 500000"
              />
              <p className="mt-1 text-xs font-medium text-neutral-500">
                Discount for 30+ day bookings. Leave blank to not offer.
              </p>
            </div>

            {/* Negotiable toggle */}
            <div className="flex items-center justify-between rounded border-2 border-neutral-900 bg-neutral-50 p-4">
              <div>
                <p className="text-sm font-black text-neutral-900">Price is negotiable</p>
                <p className="text-xs font-medium text-neutral-500">Show a "Negotiable" badge on your listing</p>
              </div>
              <button
                type="button"
                onClick={() => update('priceNegotiable', !state.priceNegotiable)}
                className={`relative h-6 w-11 rounded-full border-2 border-neutral-900 transition-colors ${
                  state.priceNegotiable ? 'bg-teal-600' : 'bg-neutral-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full border-2 border-neutral-900 bg-white transition-transform ${
                    state.priceNegotiable ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Earnings estimate */}
            <div className="rounded border-2 border-neutral-900 bg-neutral-50 p-4 shadow-brutal-xs">
              <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Potential Monthly Earnings</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: '10 days/month', value: state.dailyRateKigaliRwf * 10 },
                  { label: '20 days/month', value: state.dailyRateKigaliRwf * 20 },
                  { label: '30 days/month', value: state.dailyRateKigaliRwf * 30 },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded border-2 border-neutral-200 bg-white px-2 py-2">
                    <p className="text-xs font-semibold text-neutral-500">{label}</p>
                    <p className="text-sm font-black text-teal-700">{formatRwf(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Location ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <FieldLabel>Pickup Location</FieldLabel>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <AddressInput
                  value={state.locationText}
                  onChange={(v) => update('locationText', v)}
                  onPlaceSelected={(p) => {
                    update('locationText', p.address);
                    update('latitude', String(p.latitude));
                    update('longitude', String(p.longitude));
                  }}
                  className="w-full rounded border-2 border-neutral-900 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-neutral-900 placeholder:font-normal placeholder:text-neutral-400 focus:border-teal-600 focus:outline-none"
                  placeholder="Start typing your location..."
                />
              </div>
              {state.latitude && state.longitude && (
                <p className="mt-1.5 text-xs font-medium text-teal-700">
                  ✓ Precise location set — renters can find you on the map
                </p>
              )}
            </div>

            <div className="rounded border-2 border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Location Preview</p>
              <p className="mt-2 text-sm font-semibold text-neutral-900">{state.locationText || 'No location set'}</p>
              {state.latitude && state.longitude && (
                <p className="mt-1 text-xs font-medium text-neutral-400">
                  Coordinates: {Number(state.latitude).toFixed(4)}, {Number(state.longitude).toFixed(4)}
                </p>
              )}
            </div>

            <div className="rounded border-2 border-amber-400 bg-amber-50 p-4">
              <p className="text-xs font-bold text-amber-800">
                Tip: Select a suggestion from the dropdown for the most accurate location. This helps renters find you on the map.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 4: Publish ── */}
        {step === 4 && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="rounded border-2 border-neutral-900 bg-white p-4 shadow-brutal-xs">
              <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Listing Summary</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-neutral-600">Title</span>
                  <span className="font-bold text-neutral-900">{state.title || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-neutral-600">Vehicle</span>
                  <span className="font-bold text-neutral-900">{state.year} {state.brand} {state.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-neutral-600">Type</span>
                  <span className="font-bold text-neutral-900 capitalize">{state.vehicleType} · {state.transmission}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-neutral-600">Seats</span>
                  <span className="font-bold text-neutral-900">{state.seats}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-neutral-600">Kigali rate</span>
                  <span className="font-black text-teal-700">{formatRwf(state.dailyRateKigaliRwf)}/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-neutral-600">Photos</span>
                  <span className="font-bold text-neutral-900">{state.photos.length} added</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-neutral-600">Features</span>
                  <span className="font-bold text-neutral-900">{state.features.length} selected</span>
                </div>
              </div>
            </div>

            {/* Publish toggle */}
            <button
              type="button"
              onClick={() => canPublish && setPublishNow((v) => !v)}
              disabled={!canPublish}
              className={`w-full rounded border-2 p-4 text-left transition-all ${
                !canPublish
                  ? 'cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60'
                  : publishNow
                    ? 'border-teal-600 bg-teal-50 shadow-[2px_2px_0px_0px_rgba(13,148,136,0.4)]'
                    : 'border-neutral-300 bg-white hover:border-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-neutral-900">Publish immediately</p>
                  <p className="text-xs font-medium text-neutral-500">Make this listing live right after saving</p>
                </div>
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  publishNow ? 'border-teal-600 bg-teal-600' : 'border-neutral-300 bg-white'
                }`}>
                  {publishNow && <Check className="h-3.5 w-3.5 text-white" />}
                </div>
              </div>
            </button>

            {!canPublish && (
              <div className="flex items-start gap-2 rounded border-2 border-amber-400 bg-amber-50 p-3">
                <p className="text-xs font-bold text-amber-800">
                  You need an active subscription to publish listings. Your listing will be saved as a draft and you can publish it after subscribing.
                </p>
              </div>
            )}

            {!publishNow && (
              <div className="rounded border-2 border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold text-neutral-600">
                  Saving as draft. You can publish anytime from your dashboard.
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="rounded border-2 border-red-600 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
        )}

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between border-t-2 border-neutral-100 pt-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
            className="flex items-center gap-1 rounded border-2 border-neutral-900 bg-white px-4 py-2 text-sm font-black text-neutral-900 shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('app.listingWizard.back')}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              disabled={busy}
              className="flex items-center gap-1 rounded border-2 border-teal-800 bg-teal-600 px-4 py-2 text-sm font-black text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
            >
              {t('app.listingWizard.next')}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="rounded border-2 border-teal-800 bg-teal-600 px-5 py-2 text-sm font-black text-white shadow-brutal-teal-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
            >
              {busy ? (
                <span className="flex items-center gap-2"><LoadingSpinner className="h-4 w-4" />{t('app.listingWizard.saving')}</span>
              ) : isEditing ? t('app.listingWizard.saveChanges') : t('app.listingWizard.create')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
