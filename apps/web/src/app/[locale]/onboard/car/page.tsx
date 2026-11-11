'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { CarAmenitiesField } from '@/components/web/car-amenities-field';
import { CarVehicleSelect } from '@/components/web/car-vehicle-select';
import { CarListingRatesFields, defaultCarListingRates } from '@/components/web/car-listing-rates-fields';
import { CroppedPhotoPicker } from '@/components/web/cropped-photo-picker';
import { OnboardWizardShell, onboardInputClass, onboardLabelClass } from '@/components/web/onboard-wizard-shell';
import { RegistrationAgreement, registrationAgreementError } from '@/components/web/registration-agreement';
import { RwandaAdminAddressSelect } from '@/components/web/rwanda-admin-address-select';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { resolveBrandModel, MAX_CAR_LISTING_PHOTOS, MIN_CAR_LISTING_PHOTOS } from '@/lib/car-catalog';
import { parseListingCityFromLocationText } from '@/lib/listing-city';
import {
  createCarListing,
  getMe,
  updateMe,
  upsertHosterProfile,
  type CarListingRates,
  type ServiceType,
  type VehicleType,
} from '@/lib/api';

const STEPS = ['Host', 'Photo', 'Location', 'Vehicle', 'Plate', 'Photos', 'Rates', 'Agreement'];

const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'van', label: 'Van' },
  { value: 'truck', label: 'Truck' },
];

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'self_drive', label: 'Self-drive' },
  { value: 'with_driver', label: 'With driver' },
  { value: 'airport_transfer', label: 'Airport transfer' },
  { value: 'corporate', label: 'Corporate' },
];

const TRANSMISSION_OPTIONS = ['Manual', 'Automatic', 'Both'];
const FUEL_OPTIONS = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'Other'];
const SEAT_OPTIONS = [2, 4, 5, 6, 7, 8, 9, 10, 12, 14];

function formatRwf(value: number) {
  return new Intl.NumberFormat('en-RW').format(value);
}

function listingTitle(year: number, brand: string, model: string, colorLabel: string) {
  const base = `${year} ${brand} ${model}`.trim();
  return colorLabel ? `${base} · ${colorLabel}` : base;
}

export default function CarListOnboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const { getToken } = useAuth();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const [hostType, setHostType] = useState<'individual' | 'company'>('individual');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');
  const [serviceType, setServiceType] = useState<ServiceType>('self_drive');
  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [color, setColor] = useState('');
  const [customColor, setCustomColor] = useState('');
  const [seats, setSeats] = useState(5);
  const [transmission, setTransmission] = useState('Automatic');
  const [fuelType, setFuelType] = useState('Petrol');
  const [plateNumber, setPlateNumber] = useState('');
  const [carPhotos, setCarPhotos] = useState<string[]>([]);
  const [rates, setRates] = useState<CarListingRates>(() => defaultCarListingRates());
  const [listingDistrict, setListingDistrict] = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [agreedToFee, setAgreedToFee] = useState(false);

  const onAddressChange = useCallback((formatted: string, district: string) => {
    setAddress(formatted);
    setListingDistrict(district);
  }, []);

  useEffect(() => {
    params.then((p) => {
      if (isSupportedLocale(p.locale)) setLocale(p.locale);
    });
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getToken();
      if (!token) return;
      const me = await getMe(token);
      if (cancelled || !me) return;
      setFullName(me.fullName || user?.fullName || '');
      setContactPhone(me.phone || me.hosterProfile?.contactPhone || '');
      if (me.profilePhotoUrl) setPhotoUrl(me.profilePhotoUrl);
      if (me.hosterProfile?.hostType) setHostType(me.hosterProfile.hostType);
      if (me.hosterProfile?.companyName) setCompanyName(me.hosterProfile.companyName);
      if (me.hosterProfile?.workAddress) setAddress(me.hosterProfile.workAddress);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getToken, user?.fullName]);

  function colorLabel() {
    if (!color) return '';
    if (color === 'Other') return customColor.trim();
    return color;
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (hostType === 'individual' && !fullName.trim()) return 'Enter your full name.';
      if (hostType === 'company' && !companyName.trim()) return 'Enter your company name.';
      return null;
    }
    if (step === 1 && !photoUrl.trim()) return 'Add a profile photo.';
    if (step === 2 && !address.trim()) return 'Select your location in Rwanda.';
    if (step === 3) {
      const resolved = resolveBrandModel(brand, customBrand, model, customModel);
      if (!resolved.brand || !resolved.model) return 'Choose brand and model.';
      if (!colorLabel()) return 'Select the car color.';
      if (amenities.length === 0) return 'Select at least one amenity.';
      return null;
    }
    if (step === 4 && !plateNumber.trim()) return 'Enter the vehicle plate number.';
    if (step === 5) {
      if (carPhotos.length < MIN_CAR_LISTING_PHOTOS) {
        return `Add at least ${MIN_CAR_LISTING_PHOTOS} photo of the car.`;
      }
      if (carPhotos.length > MAX_CAR_LISTING_PHOTOS) {
        return `You can upload at most ${MAX_CAR_LISTING_PHOTOS} photos.`;
      }
      return null;
    }
    if (step === 6) {
      const values = Object.values(rates);
      if (values.some((value) => !Number.isFinite(value) || value < 1000)) {
        return 'Each daily, weekly, and monthly rate must be at least 1,000 RWF.';
      }
      return null;
    }
    if (step === 7) return registrationAgreementError(agreedToPolicy, agreedToFee);
    return null;
  }

  async function persistHostProfile(token: string) {
    await updateMe(token, {
      fullName: hostType === 'individual' ? fullName.trim() : fullName.trim() || undefined,
      profilePhotoUrl: photoUrl.trim() || undefined,
      phone: contactPhone.trim() || undefined,
    });
    await upsertHosterProfile(token, {
      hostType,
      companyName: hostType === 'company' ? companyName.trim() : undefined,
      workAddress: address.trim(),
      contactPhone: contactPhone.trim() || undefined,
    });
  }

  async function handleNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    if (step < STEPS.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    const token = await getToken();
    if (!token) {
      setError('Sign in to publish your listing.');
      return;
    }

    setBusy(true);
    try {
      await persistHostProfile(token);
      const { brand: resolvedBrand, model: resolvedModel } = resolveBrandModel(
        brand,
        customBrand,
        model,
        customModel,
      );
      const colorResolved = colorLabel();
      const listingCity =
        listingDistrict.trim() || parseListingCityFromLocationText(address.trim());
      await createCarListing(token, {
        title: listingTitle(year, resolvedBrand, resolvedModel, colorResolved),
        description: description.trim() || undefined,
        vehicleType,
        serviceType,
        brand: resolvedBrand,
        model: resolvedModel,
        year,
        seats,
        transmission,
        fuelType,
        plateNumber: plateNumber.trim().toUpperCase(),
        color: colorResolved,
        listingCity,
        ...rates,
        locationText: address.trim(),
        photos: carPhotos,
        features: amenities,
      });
      setDone(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save listing.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <OnboardWizardShell
          locale={locale}
          title="Listing saved"
          subtitle="Your car is saved as a draft. Choose a hosting plan to publish it for renters."
          steps={['Done']}
          step={0}
          hideNext
        >
          <p className="text-sm text-muted-foreground">
            You can add more photos or edit pricing anytime from your dashboard.
          </p>
          <div className="mt-5">
            <Link
              href={`/${locale}/app/cars`}
              className="inline-block rounded-full bg-brand px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-hover"
            >
              My cars
            </Link>
          </div>
        </OnboardWizardShell>
      </main>
    );
  }

  return (
    <OnboardWizardShell
      locale={locale}
      title="List your car"
      subtitle="Tell renters who you are, where the car is based, and what they will drive."
      steps={STEPS}
      step={step}
      error={error}
      busy={busy}
      nextLabel={step === STEPS.length - 1 ? 'Save listing' : 'Continue'}
      nextDisabled={step === STEPS.length - 1 && (!agreedToPolicy || !agreedToFee)}
      onBack={() => setStep((prev) => Math.max(0, prev - 1))}
      onNext={() => void handleNext()}
    >
      {step === 0 ? (
        <div className="space-y-4">
          <p className={onboardLabelClass}>I am listing as</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 'individual' as const, label: 'Individual', hint: 'Your full legal name' },
                { value: 'company' as const, label: 'Company', hint: 'Registered business name' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setHostType(option.value)}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  hostType === option.value ? 'border-brand bg-brand-soft' : 'border-border hover:bg-muted'
                }`}
              >
                <p className="text-sm font-black text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.hint}</p>
              </button>
            ))}
          </div>
          {hostType === 'individual' ? (
            <div>
              <label className={onboardLabelClass}>Full name</label>
              <input
                className={onboardInputClass}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Jean Baptiste Uwimana"
              />
            </div>
          ) : (
            <div>
              <label className={onboardLabelClass}>Company name</label>
              <input
                className={onboardInputClass}
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Kigali Fleet Services Ltd"
              />
            </div>
          )}
          <div>
            <label className={onboardLabelClass}>Contact phone (optional)</label>
            <input
              className={onboardInputClass}
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder="+250 7XX XXX XXX"
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {hostType === 'company'
              ? 'Use your company logo or a photo that represents your fleet.'
              : 'Use a clear photo of yourself — not your Clerk avatar unless you upload it here.'}
          </p>
          <CroppedPhotoPicker
            label="Profile photo"
            value={photoUrl}
            folder="rentingi/hosts/profiles"
            round
            nameForInitials={
              hostType === 'company' ? companyName.trim() || 'Company' : fullName.trim() || user?.fullName || 'Host'
            }
            getToken={getToken}
            onUploaded={setPhotoUrl}
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Where is the car usually based? Pick province through cell.</p>
          <RwandaAdminAddressSelect value={address} onChange={onAddressChange} />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <div>
            <p className={onboardLabelClass}>Vehicle type</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {VEHICLE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVehicleType(option.value)}
                  className={`rounded-lg border-2 py-2 text-xs font-bold ${
                    vehicleType === option.value ? 'border-brand bg-brand-soft' : 'border-border'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={onboardLabelClass}>Rental service</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SERVICE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setServiceType(option.value)}
                  className={`rounded-lg border-2 p-2 text-left text-xs font-bold ${
                    serviceType === option.value ? 'border-brand bg-brand-soft' : 'border-border'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <CarVehicleSelect
            brand={brand}
            customBrand={customBrand}
            model={model}
            customModel={customModel}
            year={year}
            color={color}
            customColor={customColor}
            onBrandChange={setBrand}
            onCustomBrandChange={setCustomBrand}
            onModelChange={setModel}
            onCustomModelChange={setCustomModel}
            onYearChange={setYear}
            onColorChange={setColor}
            onCustomColorChange={setCustomColor}
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={onboardLabelClass}>Seats</label>
              <select className={onboardInputClass} value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
                {SEAT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={onboardLabelClass}>Transmission</label>
              <select
                className={onboardInputClass}
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
              >
                {TRANSMISSION_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={onboardLabelClass}>Fuel</label>
              <select className={onboardInputClass} value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                {FUEL_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <CarAmenitiesField selected={amenities} onChange={setAmenities} compact />
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-3">
          <label className={onboardLabelClass}>Plate number</label>
          <input
            className={`${onboardInputClass} uppercase`}
            value={plateNumber}
            onChange={(event) => setPlateNumber(event.target.value)}
            placeholder="RAB 123 A"
            maxLength={24}
          />
          <p className="text-xs text-muted-foreground">
            Plate numbers are shown only to you and admins — not on public search cards.
          </p>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add {MIN_CAR_LISTING_PHOTOS}–{MAX_CAR_LISTING_PHOTOS} clear exterior and interior shots. The first photo is the cover.
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            {carPhotos.length} / {MAX_CAR_LISTING_PHOTOS} photos
          </p>
          {carPhotos.length < MAX_CAR_LISTING_PHOTOS ? (
            <CroppedPhotoPicker
              label={carPhotos.length ? 'Add another photo' : 'Car photo'}
              value={null}
              folder="rentingi/cars/listings"
              aspect={4 / 3}
              getToken={getToken}
              onUploaded={(url) =>
                setCarPhotos((prev) => (prev.length >= MAX_CAR_LISTING_PHOTOS ? prev : [...prev, url]))
              }
            />
          ) : (
            <p className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              Maximum {MAX_CAR_LISTING_PHOTOS} photos reached. Remove one to replace it.
            </p>
          )}
          {carPhotos.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {carPhotos.map((url, index) => (
                <li key={url} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Car ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white"
                    onClick={() => setCarPhotos((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {step === 6 ? (
        <div className="space-y-4">
          <CarListingRatesFields
            city={listingDistrict.trim() || parseListingCityFromLocationText(address)}
            rates={rates}
            onChange={(field, value) => setRates((prev) => ({ ...prev, [field]: value }))}
          />
          <div>
            <label className={onboardLabelClass}>Description (optional)</label>
            <textarea
              className={`${onboardInputClass} min-h-[88px] resize-none`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Mention mileage, insurance, airport delivery, etc."
            />
          </div>
        </div>
      ) : null}

      {step === 7 ? (
        <RegistrationAgreement
          locale={locale}
          agreedToPolicy={agreedToPolicy}
          agreedToFee={agreedToFee}
          onPolicyChange={setAgreedToPolicy}
          onFeeChange={setAgreedToFee}
        />
      ) : null}
    </OnboardWizardShell>
  );
}
