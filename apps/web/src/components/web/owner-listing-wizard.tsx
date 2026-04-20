'use client';

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@rentingi/ui';
import { LoadingSpinner } from '@/components/web/loading-states';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

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
  year: string;
  seats: string;
  transmission: string;
  fuelType: string;
  dailyRateKigaliRwf: string;
  dailyRateCountrysideRwf: string;
  locationText: string;
  latitude: string;
  longitude: string;
  photosText: string;
  featuresText: string;
};

const vehicleTypes: VehicleType[] = ['sedan', 'suv', 'hatchback', 'pickup', 'van', 'truck'];
const serviceTypes: ServiceType[] = ['self_drive', 'with_driver', 'private_driver', 'airport_transfer', 'corporate'];

function emptyState(): ListingFormState {
  return {
    title: '',
    description: '',
    vehicleType: 'sedan',
    serviceType: 'self_drive',
    brand: '',
    model: '',
    year: String(new Date().getFullYear()),
    seats: '4',
    transmission: '',
    fuelType: '',
    dailyRateKigaliRwf: '25000',
    dailyRateCountrysideRwf: '30000',
    locationText: 'Kigali',
    latitude: '',
    longitude: '',
    photosText: '',
    featuresText: '',
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
    year: String(car.year),
    seats: String(car.seats),
    transmission: car.transmission ?? '',
    fuelType: car.fuelType ?? '',
    dailyRateKigaliRwf: String(car.dailyRateKigaliRwf),
    dailyRateCountrysideRwf: String(car.dailyRateCountrysideRwf),
    locationText: car.locationText,
    latitude: '',
    longitude: '',
    photosText: car.photos.join('\n'),
    featuresText: car.features.join(', '),
  };
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
  const [state, setState] = useState<ListingFormState>(emptyState);

  const isEditing = Boolean(initialCar);

  useEffect(() => {
    if (!open) {
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

  async function handlePhotoUpload(files: FileList | null) {
    if (!files?.length) return;
    const token = await getToken();
    if (!token) {
      setError('Please sign in to upload photos.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const { uploadUrl, fields } = await getCarUploadUrl(token);
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const formData = new FormData();
        formData.append('file', file);
        Object.entries(fields).forEach(([k, v]) => formData.append(k, String(v)));
        const res = await fetch(uploadUrl, { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message ?? `Upload failed: ${res.status}`);
        }
        const data = (await res.json()) as { secure_url?: string };
        if (data.secure_url) urls.push(data.secure_url);
      }
      if (urls.length) {
        const existing = state.photosText.split('\n').filter(Boolean);
        update('photosText', [...existing, ...urls].join('\n'));
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function parsePayload(): CarListingPayload {
    const photos = state.photosText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    const features = state.featuresText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      title: state.title.trim(),
      description: state.description.trim() || undefined,
      vehicleType: state.vehicleType,
      serviceType: state.serviceType,
      brand: state.brand.trim(),
      model: state.model.trim(),
      year: Number(state.year),
      seats: Number(state.seats),
      transmission: state.transmission.trim() || undefined,
      fuelType: state.fuelType.trim() || undefined,
      dailyRateKigaliRwf: Number(state.dailyRateKigaliRwf),
      dailyRateCountrysideRwf: Number(state.dailyRateCountrysideRwf),
      locationText: state.locationText.trim(),
      latitude: state.latitude.trim() ? Number(state.latitude) : undefined,
      longitude: state.longitude.trim() ? Number(state.longitude) : undefined,
      photos,
      features,
    };
  }

  async function handleSubmit() {
    setError(null);
    try {
      setBusy(true);
      const payload = parsePayload();
      await onSubmit(payload, publishNow);
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('app.listingWizard.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('app.listingWizard.editTitle') : t('app.listingWizard.createTitle')}</DialogTitle>
        </DialogHeader>

        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          {[
            t('app.listingWizard.steps.details'),
            t('app.listingWizard.steps.photos'),
            t('app.listingWizard.steps.pricing'),
            t('app.listingWizard.steps.location'),
            t('app.listingWizard.steps.publish'),
          ].map((label, index) => (
            <span key={label} className={`rounded px-2 py-1 ${index === step ? 'bg-muted text-foreground' : 'bg-muted/40'}`}>
              {index + 1}. {label}
            </span>
          ))}
        </div>

        {step === 0 ? (
          <div className="space-y-3">
            <input className="w-full rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.title')} value={state.title} onChange={(e) => update('title', e.target.value)} />
            <textarea className="min-h-20 w-full rounded border p-3 text-sm" placeholder={t('app.listingWizard.fields.description')} value={state.description} onChange={(e) => update('description', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <select className="rounded border px-3 py-2 text-sm" value={state.vehicleType} onChange={(e) => update('vehicleType', e.target.value as VehicleType)}>
                {vehicleTypes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select className="rounded border px-3 py-2 text-sm" value={state.serviceType} onChange={(e) => update('serviceType', e.target.value as ServiceType)}>
                {serviceTypes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.brand')} value={state.brand} onChange={(e) => update('brand', e.target.value)} />
              <input className="rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.model')} value={state.model} onChange={(e) => update('model', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.year')} value={state.year} onChange={(e) => update('year', e.target.value)} />
              <input className="rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.seats')} value={state.seats} onChange={(e) => update('seats', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.transmission')} value={state.transmission} onChange={(e) => update('transmission', e.target.value)} />
              <input className="rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.fuelType')} value={state.fuelType} onChange={(e) => update('fuelType', e.target.value)} />
            </div>
            <textarea className="min-h-20 w-full rounded border p-3 text-sm" placeholder={t('app.listingWizard.fields.features')} value={state.featuresText} onChange={(e) => update('featuresText', e.target.value)} />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">{t('app.listingWizard.photoHint')}</p>
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-600 bg-zinc-800/50 px-4 py-6 text-sm text-zinc-400 transition hover:border-emerald-500/50 hover:bg-zinc-800">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner className="h-4 w-4" />
                    {t('app.listingWizard.uploading')}
                  </span>
                ) : (
                  t('app.listingWizard.uploadPhotos')
                )}
              </label>
              <textarea
                className="min-h-24 w-full rounded border border-zinc-700 bg-zinc-800 p-3 text-sm text-white placeholder:text-zinc-500"
                placeholder={t('app.listingWizard.fields.photoUrl')}
                value={state.photosText}
                onChange={(e) => update('photosText', e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid grid-cols-2 gap-2">
            <input className="rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.kigaliRate')} value={state.dailyRateKigaliRwf} onChange={(e) => update('dailyRateKigaliRwf', e.target.value)} />
            <input className="rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.countrysideRate')} value={state.dailyRateCountrysideRwf} onChange={(e) => update('dailyRateCountrysideRwf', e.target.value)} />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-2">
            <input className="w-full rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.location')} value={state.locationText} onChange={(e) => update('locationText', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.latitude')} value={state.latitude} onChange={(e) => update('latitude', e.target.value)} />
              <input className="rounded border px-3 py-2 text-sm" placeholder={t('app.listingWizard.fields.longitude')} value={state.longitude} onChange={(e) => update('longitude', e.target.value)} />
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('app.listingWizard.publishHint')}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                disabled={!canPublish}
              />
              {t('app.listingWizard.publishNow')}
            </label>
            {!canPublish ? (
              <p className="text-xs text-amber-700">{t('app.listingWizard.publishBlocked')}</p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="mt-2 flex justify-between">
          <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
            {t('app.listingWizard.back')}
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={busy}>
              {t('app.listingWizard.next')}
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={busy}>
              {busy
                ? t('app.listingWizard.saving')
                : isEditing
                  ? t('app.listingWizard.saveChanges')
                  : t('app.listingWizard.create')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
