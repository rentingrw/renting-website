'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { CroppedPhotoPicker } from '@/components/web/cropped-photo-picker';
import { OnboardWizardShell, onboardInputClass, onboardLabelClass } from '@/components/web/onboard-wizard-shell';
import { RegistrationAgreement, registrationAgreementError } from '@/components/web/registration-agreement';
import { RwandaAdminAddressSelect } from '@/components/web/rwanda-admin-address-select';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  getMe,
  getTaxiDriverMe,
  registerTaxiDriver,
  updateTaxiDriverMe,
  type TaxiDriverPayload,
} from '@/lib/api';
import {
  MAX_TAXI_CAR_PHOTOS,
  MIN_TAXI_CAR_PHOTOS,
  TAXI_CAR_FEATURES,
  TAXI_LANGUAGE_OPTIONS,
  TAXI_VEHICLE_TYPES,
} from '@/lib/taxi-features';

const STEPS = ['You', 'Contact', 'Location', 'Vehicle', 'Photos', 'Agreement'];

export default function TaxiOnboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const { getToken } = useAuth();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const [fullName, setFullName] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [languages, setLanguages] = useState<string[]>(['en', 'rw']);

  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [contactPhoneEnabled, setContactPhoneEnabled] = useState(true);
  const [contactWhatsappEnabled, setContactWhatsappEnabled] = useState(true);

  const [workLocationText, setWorkLocationText] = useState('');
  const [listingDistrict, setListingDistrict] = useState('');

  const [vehicleType, setVehicleType] = useState<string>('sedan');
  const [carModel, setCarModel] = useState('');
  const [plate, setPlate] = useState('');
  const [seats, setSeats] = useState(4);
  const [features, setFeatures] = useState<string[]>([]);
  const [carPhotos, setCarPhotos] = useState<string[]>([]);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [agreedToFee, setAgreedToFee] = useState(false);

  const onWorkLocationChange = useCallback((formatted: string, district: string) => {
    setWorkLocationText(formatted);
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
      const [me, taxi] = await Promise.all([getMe(token), getTaxiDriverMe(token)]);
      if (cancelled) return;
      setFullName(me?.fullName || user?.fullName || '');
      setProfilePhotoUrl(me?.profilePhotoUrl || '');
      setPhone(me?.phone || '');
      setWhatsapp(me?.whatsapp || '');
      if (taxi) {
        setHasProfile(true);
        setFullName(taxi.fullName);
        setProfilePhotoUrl(taxi.profilePhotoUrl || me?.profilePhotoUrl || '');
        setLanguages(taxi.languages?.length ? taxi.languages : ['en', 'rw']);
        setPhone(taxi.phone);
        setWhatsapp(taxi.whatsapp || '');
        setContactPhoneEnabled(taxi.contactPhoneEnabled ?? true);
        setContactWhatsappEnabled(taxi.contactWhatsappEnabled ?? true);
        setWorkLocationText(taxi.workLocationText || taxi.city);
        setListingDistrict(taxi.city);
        setVehicleType(taxi.vehicleType || 'sedan');
        setCarModel(taxi.carModel || '');
        setPlate(taxi.plate || '');
        setSeats(taxi.seats ?? 4);
        setFeatures(taxi.features ?? []);
        setCarPhotos(taxi.photos?.length ? taxi.photos : taxi.photoUrl ? [taxi.photoUrl] : []);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getToken, user]);

  function toggleLanguage(code: string) {
    setLanguages((prev) => {
      if (prev.includes(code)) {
        return prev.length > 1 ? prev.filter((item) => item !== code) : prev;
      }
      return [...prev, code];
    });
  }

  function toggleFeature(value: string) {
    setFeatures((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  function workCity() {
    return listingDistrict.trim() || workLocationText.split(',').map((p) => p.trim()).filter(Boolean).slice(-2)[0] || workLocationText.trim();
  }

  function payload(includeAgreement = false): TaxiDriverPayload {
    const photos = carPhotos.slice(0, MAX_TAXI_CAR_PHOTOS);
    return {
      fullName: fullName.trim() || 'Taxi driver',
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || undefined,
      city: workCity(),
      workLocationText: workLocationText.trim(),
      languages,
      contactPhoneEnabled,
      contactWhatsappEnabled,
      seats: Math.min(50, Math.max(1, Math.round(Number(seats)) || 4)),
      carModel: carModel.trim(),
      plate: plate.trim().toUpperCase(),
      vehicleType,
      features,
      photos,
      photoUrl: photos[0],
      profilePhotoUrl: profilePhotoUrl.trim(),
      ...(includeAgreement
        ? { acceptedTerms: agreedToPolicy, acceptedPlatformFee: agreedToFee }
        : {}),
    };
  }

  async function saveProfile(includeAgreement = false) {
    const token = await getToken();
    if (!token) throw new Error('Please sign in.');
    if (hasProfile) await updateTaxiDriverMe(token, payload(includeAgreement));
    else {
      await registerTaxiDriver(token, payload(true));
      setHasProfile(true);
    }
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!fullName.trim()) return 'Enter your name.';
      if (!profilePhotoUrl.trim()) return 'Add a profile photo.';
      if (languages.length === 0) return 'Select at least one language.';
      return null;
    }
    if (step === 1) {
      if (!contactPhoneEnabled && !contactWhatsappEnabled) {
        return 'Enable phone calls or WhatsApp so customers can reach you.';
      }
      if (contactPhoneEnabled && !phone.trim()) return 'Enter your phone number.';
      if (contactWhatsappEnabled && !whatsapp.trim()) return 'Enter your WhatsApp number.';
      return null;
    }
    if (step === 2 && !workLocationText.trim()) {
      return 'Select where you usually work (Rwanda address).';
    }
    if (step === 3) {
      if (!vehicleType) return 'Choose a vehicle type.';
      if (!carModel.trim()) return 'Enter your car model (e.g. Toyota Axio).';
      if (carModel.trim().length > 80) return 'Car model must be 80 characters or less.';
      if (!plate.trim()) return 'Enter your plate number.';
      if (plate.trim().length > 20) return 'Plate must be 20 characters or less.';
      const seatCount = Math.round(Number(seats));
      if (!Number.isFinite(seatCount) || seatCount < 1 || seatCount > 50) {
        return 'Seats must be a whole number between 1 and 50.';
      }
      if (features.length === 0) return 'Select at least one car feature.';
      return null;
    }
    if (step === 4) {
      if (carPhotos.length < MIN_TAXI_CAR_PHOTOS) {
        return `Add at least ${MIN_TAXI_CAR_PHOTOS} car photo.`;
      }
      if (carPhotos.length > MAX_TAXI_CAR_PHOTOS) {
        return `You can upload at most ${MAX_TAXI_CAR_PHOTOS} photos.`;
      }
      return null;
    }
    if (step === 5) return registrationAgreementError(agreedToPolicy, agreedToFee);
    return null;
  }

  async function handleNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (step === STEPS.length - 1) {
        await saveProfile(true);
        setDone(true);
        return;
      }
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save taxi profile.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <OnboardWizardShell
        locale={locale}
        title="You are live as a taxi driver"
        subtitle="Customers can find you in taxi search and use your chosen contact options."
        steps={STEPS}
        step={STEPS.length - 1}
        hideNext
      >
        <p className="text-center text-sm text-muted-foreground">
          You are <strong>active</strong> in taxi search. Set inactive or booked anytime from your dashboard.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={`/${locale}/app/taxi`}
            className="rounded-full bg-brand px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Manage my taxi
          </Link>
          <Link
            href={`/${locale}/search?type=taxis`}
            className="rounded-full border border-border px-5 py-2.5 text-center text-sm font-semibold text-foreground hover:bg-muted"
          >
            View taxi search
          </Link>
        </div>
      </OnboardWizardShell>
    );
  }

  return (
    <OnboardWizardShell
      locale={locale}
      title="Register as a taxi driver"
      subtitle="Add your profile, contacts, work area, vehicle, and photos — then publish."
      steps={STEPS}
      step={step}
      error={error}
      busy={busy}
      nextLabel={step === STEPS.length - 1 ? 'Publish & go live' : 'Continue'}
      nextDisabled={step === STEPS.length - 1 && (!agreedToPolicy || !agreedToFee)}
      onBack={() => setStep((prev) => Math.max(0, prev - 1))}
      onNext={() => void handleNext()}
    >
      {step === 0 ? (
        <div className="space-y-4">
          <div>
            <label className={onboardLabelClass}>Full name</label>
            <input className={onboardInputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <CroppedPhotoPicker
            label="Profile photo"
            value={profilePhotoUrl}
            folder="rentingi/taxi-drivers/profiles"
            round
            nameForInitials={fullName || 'Taxi'}
            getToken={getToken}
            onUploaded={setProfilePhotoUrl}
          />
          <div>
            <p className={onboardLabelClass}>Languages you speak</p>
            <div className="flex flex-wrap gap-2">
              {TAXI_LANGUAGE_OPTIONS.map((item) => {
                const on = languages.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => toggleLanguage(item.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                      on ? 'border-brand bg-brand text-white' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label className={onboardLabelClass}>Phone number</label>
            <input
              className={onboardInputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              disabled={!contactPhoneEnabled}
            />
          </div>
          <div>
            <label className={onboardLabelClass}>WhatsApp number</label>
            <input
              className={onboardInputClass}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="07XXXXXXXX"
              disabled={!contactWhatsappEnabled}
            />
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Show on your public listing</p>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={contactPhoneEnabled}
                onChange={(e) => setContactPhoneEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Allow phone calls
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={contactWhatsappEnabled}
                onChange={(e) => setContactWhatsappEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Show WhatsApp button
            </label>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <p className={onboardLabelClass}>Location of work</p>
          <p className="text-xs text-muted-foreground">
            Where you usually pick up passengers — cell, sector, district, and province in Rwanda.
          </p>
          <RwandaAdminAddressSelect value={workLocationText} onChange={onWorkLocationChange} />
          {workCity() ? (
            <p className="text-xs text-muted-foreground">
              Search area: <span className="font-semibold text-foreground">{workCity()}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div>
            <p className={onboardLabelClass}>Car type</p>
            <div className="flex flex-wrap gap-2">
              {TAXI_VEHICLE_TYPES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setVehicleType(item)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-bold capitalize ${
                    vehicleType === item ? 'border-brand bg-brand-soft text-foreground' : 'border-border text-muted-foreground'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={onboardLabelClass}>Car model</label>
              <input
                className={onboardInputClass}
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                placeholder="Toyota Axio"
                maxLength={80}
              />
            </div>
            <div>
              <label className={onboardLabelClass}>Plate number</label>
              <input
                className={`${onboardInputClass} uppercase`}
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="RAC 123 A"
                maxLength={20}
              />
            </div>
          </div>
          <div>
            <label className={onboardLabelClass}>Seats</label>
            <input
              type="number"
              min={1}
              max={50}
              step={1}
              className={onboardInputClass}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Passenger seats (1–50).</p>
          </div>
          <div>
            <p className={onboardLabelClass}>Car features</p>
            <div className="flex flex-wrap gap-2">
              {TAXI_CAR_FEATURES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleFeature(item)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                    features.includes(item) ? 'border-brand bg-brand text-white' : 'border-border text-muted-foreground'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add {MIN_TAXI_CAR_PHOTOS}–{MAX_TAXI_CAR_PHOTOS} clear photos of your taxi (exterior and interior). The first photo is the cover.
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            {carPhotos.length} / {MAX_TAXI_CAR_PHOTOS} photos
          </p>
          {carPhotos.length < MAX_TAXI_CAR_PHOTOS ? (
            <CroppedPhotoPicker
              label={carPhotos.length ? 'Add another photo' : 'Car photo'}
              value={null}
              folder="rentingi/taxi-drivers/cars"
              aspect={4 / 3}
              getToken={getToken}
              onUploaded={(url) =>
                setCarPhotos((prev) => (prev.length >= MAX_TAXI_CAR_PHOTOS ? prev : [...prev, url]))
              }
            />
          ) : (
            <p className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              Maximum {MAX_TAXI_CAR_PHOTOS} photos. Remove one to replace it.
            </p>
          )}
          {carPhotos.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {carPhotos.map((url, index) => (
                <li key={`${url}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Taxi ${index + 1}`} className="h-full w-full object-cover" />
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

      {step === 5 ? (
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
