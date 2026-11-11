'use client';

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@rentingi/ui';
import { LoadingSpinner } from '@/components/web/loading-states';
import { AddressInput } from '@/components/web/address-input';
import { RwandaAdminAddressSelect } from '@/components/web/rwanda-admin-address-select';
import { ImageCropDialog } from '@/components/web/image-crop-dialog';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ChevronLeft, ChevronRight, Minus, Plus, Upload } from 'lucide-react';

import { uploadImageFile, type CarListingPayload, type CarListingRates, type OwnerCar, type ServiceType, type VehicleType } from '@/lib/api';
import { CarListingRatesFields, defaultCarListingRates } from '@/components/web/car-listing-rates-fields';
import { parseListingCityFromLocationText } from '@/lib/listing-city';
import { CarVehicleSelect } from '@/components/web/car-vehicle-select';
import { CAR_BRANDS, CAR_COLORS, CUSTOM_BRAND, CUSTOM_MODEL, MAX_CAR_LISTING_PHOTOS, MIN_CAR_LISTING_PHOTOS, modelsForBrand, resolveBrandModel } from '@/lib/car-catalog';
import { CarAmenitiesField } from '@/components/web/car-amenities-field';

type OwnerListingWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCar?: OwnerCar | null;
  onSubmit: (payload: CarListingPayload, publishNow: boolean) => Promise<void>;
  canPublish?: boolean;
  getToken: () => Promise<string | null>;
};

type ListingFormState = {
  title: string;
  description: string;
  vehicleType: VehicleType;
  serviceType: ServiceType;
  brand: string;
  customBrand: string;
  model: string;
  customModel: string;
  year: number;
  color: string;
  customColor: string;
  plateNumber: string;
  seats: number;
  transmission: string;
  fuelType: string;
  locationText: string;
  listingDistrict: string;
  latitude: string;
  longitude: string;
  photos: string[];
  features: string[];
  priceNegotiable: boolean;
} & CarListingRates;

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

const CURRENT_YEAR = new Date().getFullYear();
const SEAT_OPTIONS = [2, 4, 5, 6, 7, 8, 9, 10, 12, 14];

const STEPS = ['Details', 'Photos', 'Location', 'Pricing', 'Publish'];

function brandFieldsFromListing(brand: string, model: string) {
  const knownBrand = (CAR_BRANDS as readonly string[]).includes(brand) && brand !== CUSTOM_BRAND;
  if (!knownBrand) {
    return { brand: CUSTOM_BRAND, customBrand: brand, model: CUSTOM_MODEL, customModel: model };
  }
  const models = modelsForBrand(brand);
  const knownModel = models.includes(model);
  return {
    brand,
    customBrand: '',
    model: knownModel ? model : CUSTOM_MODEL,
    customModel: knownModel ? '' : model,
  };
}

function emptyState(): ListingFormState {
  return {
    title: '',
    description: '',
    vehicleType: 'sedan',
    serviceType: 'self_drive',
    brand: '',
    customBrand: '',
    model: '',
    customModel: '',
    year: CURRENT_YEAR,
    color: '',
    customColor: '',
    plateNumber: '',
    seats: 5,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    priceNegotiable: false,
    locationText: '',
    listingDistrict: '',
    latitude: '',
    longitude: '',
    photos: [],
    features: [],
    ...defaultCarListingRates(),
  };
}

function fromCar(car: OwnerCar): ListingFormState {
  const catalog = brandFieldsFromListing(car.brand, car.model);
  const colorValue = car.color ?? '';
  const knownColor = (CAR_COLORS as readonly string[]).includes(colorValue);
  return {
    title: car.title,
    description: car.description ?? '',
    vehicleType: car.vehicleType,
    serviceType: car.serviceType,
    brand: catalog.brand,
    customBrand: catalog.customBrand,
    model: catalog.model,
    customModel: catalog.customModel,
    year: car.year,
    color: knownColor ? colorValue : colorValue ? 'Other' : '',
    customColor: knownColor ? '' : colorValue,
    plateNumber: car.plateNumber ?? '',
    seats: car.seats,
    transmission: car.transmission ?? 'Automatic',
    fuelType: car.fuelType ?? 'Petrol',
    priceNegotiable: false,
    locationText: car.locationText,
    listingDistrict: car.listingCity ?? parseListingCityFromLocationText(car.locationText),
    latitude: '',
    longitude: '',
    photos: car.photos,
    features: car.features,
    dailyRateInCityRwf: car.dailyRateInCityRwf,
    dailyRateOutsideCityRwf: car.dailyRateOutsideCityRwf,
    weeklyRateInCityRwf: car.weeklyRateInCityRwf,
    weeklyRateOutsideCityRwf: car.weeklyRateOutsideCityRwf,
    monthlyRateInCityRwf: car.monthlyRateInCityRwf,
    monthlyRateOutsideCityRwf: car.monthlyRateOutsideCityRwf,
  };
}

function formatRwf(n: number) {
  return n.toLocaleString('en-RW') + ' RWF';
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">{children}</p>
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
  const allowPublish = canPublish !== false;
  const [step, setStep] = useState(0);
  const [publishNow, setPublishNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoQueueRef = useRef<File[]>([]);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [state, setState] = useState<ListingFormState>(emptyState());

  const isEditing = Boolean(initialCar);

  useEffect(() => {
    if (!open) {
      photoQueueRef.current = [];
      setPendingPhoto(null);
      return;
    }
    setStep(0);
    setError(null);
    setPublishNow(false);
    setState(initialCar ? fromCar(initialCar) : emptyState());
  }, [initialCar, open]);

  function update<K extends keyof ListingFormState>(key: K, value: ListingFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function queuePhotos(files: FileList | null) {
    const images = Array.from(files ?? []).filter((file) => file.type.startsWith('image/'));
    if (!images.length) return;
    const queuedCount = photoQueueRef.current.length + (pendingPhoto ? 1 : 0);
    const slotsLeft = MAX_CAR_LISTING_PHOTOS - state.photos.length - queuedCount;
    if (slotsLeft <= 0) {
      setError(`You can upload at most ${MAX_CAR_LISTING_PHOTOS} photos.`);
      return;
    }
    const batch = images.slice(0, slotsLeft);
    if (batch.length < images.length) {
      setError(`Only ${MAX_CAR_LISTING_PHOTOS} photos allowed. Extra files were skipped.`);
    }
    if (pendingPhoto) {
      photoQueueRef.current.push(...batch);
      return;
    }
    const [first, ...rest] = batch;
    photoQueueRef.current.push(...rest);
    setPendingPhoto(first);
  }

  async function uploadCroppedPhoto(file: File) {
    const token = await getToken();
    if (!token) {
      setError('Please sign in to upload photos.');
      return;
    }
    if (state.photos.length >= MAX_CAR_LISTING_PHOTOS) {
      setError(`You can upload at most ${MAX_CAR_LISTING_PHOTOS} photos.`);
      photoQueueRef.current = [];
      setPendingPhoto(null);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImageFile(token, file, 'rentingi/cars/listings');
      let countAfterUpload = state.photos.length;
      setState((prev) => {
        if (prev.photos.length >= MAX_CAR_LISTING_PHOTOS) return prev;
        const photos = [...prev.photos, url];
        countAfterUpload = photos.length;
        return { ...prev, photos };
      });
      if (countAfterUpload >= MAX_CAR_LISTING_PHOTOS) {
        photoQueueRef.current = [];
        setPendingPhoto(null);
      } else {
        setPendingPhoto(photoQueueRef.current.shift() ?? null);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Photo upload failed.');
      setPendingPhoto(photoQueueRef.current.shift() ?? null);
    } finally {
      setUploading(false);
    }
  }

  function listingCityLabel() {
    return state.listingDistrict.trim() || parseListingCityFromLocationText(state.locationText);
  }

  function applySuggestedTitle() {
    const { brand: resolvedBrand, model: resolvedModel } = resolveBrandModel(
      state.brand,
      state.customBrand,
      state.model,
      state.customModel,
    );
    const color = resolveColorLabel(state.color, state.customColor);
    update('title', buildListingTitle(state.year, resolvedBrand, resolvedModel, color));
  }

  function goToNextStep() {
    if (step === 0) {
      const { brand: resolvedBrand, model: resolvedModel } = resolveBrandModel(
        state.brand,
        state.customBrand,
        state.model,
        state.customModel,
      );
      if (!resolvedBrand || !resolvedModel) {
        setError('Select brand and model (or enter custom names).');
        return;
      }
      if (!state.plateNumber.trim()) {
        setError('Plate number is required.');
        return;
      }
      if (!state.title.trim()) {
        setError('Add a listing title or use “Suggest title”.');
        return;
      }
      if (state.features.length === 0) {
        setError('Select at least one amenity for your car.');
        return;
      }
    }
    if (step === 1) {
      if (state.photos.length < MIN_CAR_LISTING_PHOTOS) {
        setError(`Add at least ${MIN_CAR_LISTING_PHOTOS} photo before continuing.`);
        return;
      }
      if (state.photos.length > MAX_CAR_LISTING_PHOTOS) {
        setError(`You can upload at most ${MAX_CAR_LISTING_PHOTOS} photos.`);
        return;
      }
    }
    if (step === 2 && !state.locationText.trim()) {
      setError('Select your Rwanda address (cell through province).');
      return;
    }
    if (step === 3) {
      const rateValues = [
        state.dailyRateInCityRwf,
        state.dailyRateOutsideCityRwf,
        state.weeklyRateInCityRwf,
        state.weeklyRateOutsideCityRwf,
        state.monthlyRateInCityRwf,
        state.monthlyRateOutsideCityRwf,
      ];
      if (rateValues.some((value) => !Number.isFinite(value) || value < 1000)) {
        setError('Each rate must be at least 1,000 RWF.');
        return;
      }
    }
    setError(null);
    setStep((s) => Math.min(4, s + 1));
  }

  function parsePayload(): CarListingPayload {
    const { brand: resolvedBrand, model: resolvedModel } = resolveBrandModel(
      state.brand,
      state.customBrand,
      state.model,
      state.customModel,
    );
    const colorResolved =
      state.color === 'Other' ? state.customColor.trim() : state.color.trim() || undefined;
    return {
      title: state.title.trim(),
      description: state.description.trim() || undefined,
      vehicleType: state.vehicleType,
      serviceType: state.serviceType,
      brand: resolvedBrand,
      model: resolvedModel,
      year: state.year,
      seats: state.seats,
      transmission: state.transmission || undefined,
      fuelType: state.fuelType || undefined,
      plateNumber: state.plateNumber.trim().toUpperCase(),
      color: colorResolved,
      listingCity: listingCityLabel(),
      dailyRateInCityRwf: state.dailyRateInCityRwf,
      dailyRateOutsideCityRwf: state.dailyRateOutsideCityRwf,
      weeklyRateInCityRwf: state.weeklyRateInCityRwf,
      weeklyRateOutsideCityRwf: state.weeklyRateOutsideCityRwf,
      monthlyRateInCityRwf: state.monthlyRateInCityRwf,
      monthlyRateOutsideCityRwf: state.monthlyRateOutsideCityRwf,
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
    if (
      state.photos.length < MIN_CAR_LISTING_PHOTOS ||
      state.photos.length > MAX_CAR_LISTING_PHOTOS
    ) {
      setError(`Listings need ${MIN_CAR_LISTING_PHOTOS}–${MAX_CAR_LISTING_PHOTOS} photos.`);
      return;
    }
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

  const inputClass = 'w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none focus:border-brand';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground">
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
                  i <= step ? 'bg-brand' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
        </div>

        {/* ── STEP 0: Car Details ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <FieldLabel>Listing title</FieldLabel>
              <div className="flex gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="e.g. 2022 Toyota RAV4 · Silver"
                  value={state.title}
                  onChange={(e) => update('title', e.target.value)}
                />
                <button
                  type="button"
                  onClick={applySuggestedTitle}
                  className="shrink-0 rounded-xl border-2 border-border bg-muted px-3 py-2 text-xs font-bold text-foreground hover:bg-brand-soft"
                >
                  Suggest title
                </button>
              </div>
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
                        ? 'border-brand bg-brand-soft shadow-[2px_2px_0px_0px_rgba(14,165,233,0.35)]'
                        : 'border-neutral-300 bg-card hover:border-border'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs font-black text-foreground">{label}</span>
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
                        ? 'border-brand bg-brand-soft'
                        : 'border-neutral-300 bg-card hover:border-border'
                    }`}
                  >
                    <p className="text-sm font-black text-foreground">{label}</p>
                    <p className="text-xs font-medium text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <CarVehicleSelect
              brand={state.brand}
              customBrand={state.customBrand}
              model={state.model}
              customModel={state.customModel}
              year={state.year}
              color={state.color}
              customColor={state.customColor}
              onBrandChange={(value) => update('brand', value)}
              onCustomBrandChange={(value) => update('customBrand', value)}
              onModelChange={(value) => update('model', value)}
              onCustomModelChange={(value) => update('customModel', value)}
              onYearChange={(value) => update('year', value)}
              onColorChange={(value) => update('color', value)}
              onCustomColorChange={(value) => update('customColor', value)}
              inputClass={inputClass}
              labelClass="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground"
              compact
            />

            <div>
              <FieldLabel>Plate number</FieldLabel>
              <input
                className={`${inputClass} uppercase`}
                placeholder="RAB 123 A"
                value={state.plateNumber}
                onChange={(e) => update('plateNumber', e.target.value)}
                maxLength={24}
              />
            </div>

            <div>
              <FieldLabel>Seats</FieldLabel>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => update('seats', Math.max(2, state.seats - 1))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded border-2 border-border bg-card hover:bg-muted"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 rounded border-2 border-border py-2 text-center text-sm font-black text-foreground">
                  {state.seats}
                </div>
                <button
                  type="button"
                  onClick={() => update('seats', Math.min(14, state.seats + 1))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded border-2 border-border bg-card hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                </button>
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
                          ? 'border-brand bg-brand text-white'
                          : 'border-neutral-300 bg-card text-muted-foreground hover:border-border'
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

            <CarAmenitiesField
              selected={state.features}
              onChange={(features) => update('features', features)}
            />
          </div>
        )}

        {/* ── STEP 1: Photos ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <FieldLabel>Upload photos ({MIN_CAR_LISTING_PHOTOS}–{MAX_CAR_LISTING_PHOTOS})</FieldLabel>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {state.photos.length} / {MAX_CAR_LISTING_PHOTOS} added
              </p>
              {/* Hidden file input — triggered via ref to avoid Dialog blocking issues */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="absolute opacity-0 w-px h-px pointer-events-none"
                disabled={uploading || state.photos.length >= MAX_CAR_LISTING_PHOTOS}
                onChange={(e) => { queuePhotos(e.target.files); e.target.value = ''; }}
              />
              <button
                type="button"
                disabled={uploading || state.photos.length >= MAX_CAR_LISTING_PHOTOS}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full cursor-pointer flex-col items-center gap-3 rounded border-2 border-dashed border-neutral-400 bg-neutral-50 px-6 py-10 transition hover:border-brand hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <LoadingSpinner className="h-5 w-5" />
                    Uploading photos...
                  </span>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-black text-foreground">Click to upload photos</p>
                      <p className="text-xs font-medium text-muted-foreground">
                        JPG or PNG. Up to {MAX_CAR_LISTING_PHOTOS} photos. Crop each before upload.
                      </p>
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
                    <div key={url} className="group relative aspect-square overflow-hidden rounded border-2 border-border bg-muted">
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
                  Add at least {MIN_CAR_LISTING_PHOTOS} photo (up to {MAX_CAR_LISTING_PHOTOS}). Listings with photos get more bookings.
                </p>
              </div>
            )}
            {pendingPhoto ? (
              <ImageCropDialog
                file={pendingPhoto}
                aspect={4 / 3}
                title="Crop car photo"
                onCancel={() => {
                  const next = photoQueueRef.current.shift() ?? null;
                  setPendingPhoto(next);
                }}
                onCropped={(file) => void uploadCroppedPhoto(file)}
              />
            ) : null}
          </div>
        )}

        {/* ── STEP 2: Pricing ── */}
        {/* ── STEP 2: Location ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <FieldLabel>Car location (Rwanda)</FieldLabel>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Same as list-your-car onboarding: cell, sector, district, province. Rates use the district as your listing city.
              </p>
              <RwandaAdminAddressSelect
                value={state.locationText}
                onChange={(formatted, district) => {
                  update('locationText', formatted);
                  update('listingDistrict', district);
                  update('latitude', '');
                  update('longitude', '');
                }}
              />
              {listingCityLabel() ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Listing city for rates:{' '}
                  <span className="font-bold text-foreground">{listingCityLabel()}</span>
                </p>
              ) : null}
            </div>

            <div className="rounded border-2 border-border bg-muted/40 p-4">
              <FieldLabel>Optional map pin</FieldLabel>
              <p className="mb-2 text-xs text-muted-foreground">
                Refine pickup on the map (optional). Structured address above is required.
              </p>
              <AddressInput
                value={state.locationText}
                onChange={(v) => update('locationText', v)}
                onPlaceSelected={(p) => {
                  update('locationText', p.address);
                  update('latitude', String(p.latitude));
                  update('longitude', String(p.longitude));
                  update('listingDistrict', parseListingCityFromLocationText(p.address));
                }}
                className={inputClass}
                placeholder="Search map for exact pickup…"
              />
              {state.latitude && state.longitude ? (
                <p className="mt-1.5 text-xs font-medium text-brand">Map coordinates saved for search distance.</p>
              ) : null}
            </div>
          </div>
        )}

        {/* ── STEP 3: Pricing ── */}
        {step === 3 && (
          <div className="space-y-6">
            <CarListingRatesFields
              city={listingCityLabel()}
              rates={{
                dailyRateInCityRwf: state.dailyRateInCityRwf,
                dailyRateOutsideCityRwf: state.dailyRateOutsideCityRwf,
                weeklyRateInCityRwf: state.weeklyRateInCityRwf,
                weeklyRateOutsideCityRwf: state.weeklyRateOutsideCityRwf,
                monthlyRateInCityRwf: state.monthlyRateInCityRwf,
                monthlyRateOutsideCityRwf: state.monthlyRateOutsideCityRwf,
              }}
              onChange={(field, value) => update(field, value)}
              inputClass={inputClass}
              labelClass="mb-1 block text-xs font-black uppercase tracking-widest text-muted-foreground"
            />

            <div className="flex items-center justify-between rounded border-2 border-border bg-neutral-50 p-4">
              <div>
                <p className="text-sm font-black text-foreground">Price is negotiable</p>
                <p className="text-xs font-medium text-muted-foreground">Show a &quot;Negotiable&quot; badge on your listing</p>
              </div>
              <button
                type="button"
                onClick={() => update('priceNegotiable', !state.priceNegotiable)}
                className={`relative h-6 w-11 rounded-full border-2 border-border transition-colors ${
                  state.priceNegotiable ? 'bg-brand' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full border-2 border-border bg-card transition-transform ${
                    state.priceNegotiable ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="rounded border-2 border-border bg-neutral-50 p-4 shadow-brutal-xs">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">In-city daily estimate</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: '10 days/month', value: state.dailyRateInCityRwf * 10 },
                  { label: '20 days/month', value: state.dailyRateInCityRwf * 20 },
                  { label: '30 days/month', value: state.dailyRateInCityRwf * 30 },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded border-2 border-border bg-card px-2 py-2">
                    <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                    <p className="text-sm font-black text-brand">{formatRwf(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Publish ── */}
        {step === 4 && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft-sm">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Listing Summary</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Title</span>
                  <span className="font-bold text-foreground">{state.title || '—'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="font-medium text-muted-foreground">Plate</span>
                  <span className="font-bold text-foreground">{state.plateNumber || '—'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="font-medium text-muted-foreground">Location</span>
                  <span className="max-w-[60%] text-right font-bold text-foreground">{state.locationText || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Listing city</span>
                  <span className="font-bold text-foreground">{listingCityLabel()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Vehicle</span>
                  <span className="font-bold text-foreground">{state.year} {state.brand} {state.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Type</span>
                  <span className="font-bold text-foreground capitalize">{state.vehicleType} · {state.transmission}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Seats</span>
                  <span className="font-bold text-foreground">{state.seats}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">In-city daily</span>
                  <span className="font-black text-brand">{formatRwf(state.dailyRateInCityRwf)}/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Photos</span>
                  <span className="font-bold text-foreground">{state.photos.length} added</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">Features</span>
                  <span className="font-bold text-foreground">{state.features.length} selected</span>
                </div>
              </div>
            </div>

            {/* Publish toggle */}
            <button
              type="button"
              onClick={() => allowPublish && setPublishNow((v) => !v)}
              disabled={!allowPublish}
              className={`w-full rounded border-2 p-4 text-left transition-all ${
                !allowPublish
                  ? 'cursor-not-allowed border-border bg-neutral-50 opacity-60'
                  : publishNow
                    ? 'border-brand bg-brand-soft shadow-[2px_2px_0px_0px_rgba(14,165,233,0.35)]'
                    : 'border-neutral-300 bg-card hover:border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-foreground">Publish immediately</p>
                  <p className="text-xs font-medium text-muted-foreground">Make this listing live right after saving</p>
                </div>
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  publishNow ? 'border-brand bg-brand' : 'border-neutral-300 bg-card'
                }`}>
                  {publishNow && <Check className="h-3.5 w-3.5 text-foreground" />}
                </div>
              </div>
            </button>

            {!publishNow && (
              <div className="rounded border-2 border-border bg-neutral-50 p-3">
                <p className="text-xs font-semibold text-muted-foreground">
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
            className="flex items-center gap-1 rounded border-2 border-border bg-card px-4 py-2 text-sm font-black text-foreground shadow-brutal-xs transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('app.listingWizard.back')}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => goToNextStep()}
              disabled={busy}
              className="flex items-center gap-1 rounded border-2 border-brand-strong bg-brand px-4 py-2 text-sm font-black text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
            >
              {t('app.listingWizard.next')}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="rounded border-2 border-brand-strong bg-brand px-5 py-2 text-sm font-black text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
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
