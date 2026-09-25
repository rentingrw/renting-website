'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

import { AddressInput } from '@/components/web/address-input';
import { CroppedPhotoPicker } from '@/components/web/cropped-photo-picker';
import { OnboardWizardShell, onboardInputClass, onboardLabelClass } from '@/components/web/onboard-wizard-shell';
import { SubscriptionPayStep } from '@/components/web/subscription-pay-step';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  addRole,
  createDriverProfile,
  getDriverProfileFull,
  getDriverSubscriptionOverview,
  getMe,
  initiateDriverSubscription,
  updateDriverProfile,
  updateMe,
  type DriverProfilePayload,
} from '@/lib/api';

const STEPS = ['Photo', 'Contact', 'Address', 'License', 'Documents', 'Pay'];
const LICENSE_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F'];
const TRANSMISSIONS = ['Manual', 'Automatic', 'Both'];
const AVAILABILITY = ['Anytime', 'Daytime (6am–6pm)', 'Nighttime (6pm–6am)', 'Weekends only'];
const CITIES = ['Kigali', 'Musanze', 'Rubavu', 'Rusizi', 'Karongi', 'Huye', 'Muhanga', 'Nyagatare', 'Rwamagana', 'Kayonza'];

function cityFromAddress(address: string): string {
  const found = CITIES.find((city) => address.toLowerCase().includes(city.toLowerCase()));
  if (found) return found;
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts[0] || address.trim();
}

export default function DriverOnboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const { getToken } = useAuth();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [yearsExperience, setYearsExperience] = useState(1);
  const [licenseCategories, setLicenseCategories] = useState<string[]>(['B']);
  const [transmission, setTransmission] = useState('Both');
  const [availability, setAvailability] = useState('Anytime');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [licenseDocumentUrl, setLicenseDocumentUrl] = useState('');

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
      const [me, profile, sub] = await Promise.all([
        getMe(token),
        getDriverProfileFull(token),
        getDriverSubscriptionOverview(token),
      ]);
      if (cancelled) return;
      if (me) {
        setPhotoUrl(me.profilePhotoUrl || '');
        setPhone(me.phone || '');
      }
      if (profile) {
        setHasProfile(true);
        setPhotoUrl(profile.profilePhotoUrl || me?.profilePhotoUrl || '');
        setPhone(profile.phone || me?.phone || '');
        setAddress(profile.addressText || profile.primaryCity || '');
        setYearsExperience(profile.yearsExperience || 1);
        setLicenseCategories(profile.licenseCategories?.length ? profile.licenseCategories : ['B']);
        setTransmission(profile.transmission || 'Both');
        setIdDocumentUrl(profile.idDocumentUrl || '');
        setLicenseDocumentUrl(profile.licenseDocumentUrl || '');
      }
      if (sub.isActive) setDone(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  function toggleLicense(value: string) {
    setLicenseCategories((prev) =>
      prev.includes(value) ? (prev.length === 1 ? prev : prev.filter((item) => item !== value)) : [...prev, value],
    );
  }

  function payload(): DriverProfilePayload {
    const city = cityFromAddress(address);
    return {
      driverCategory: 'city',
      yearsExperience,
      dailyRateRwf: 25000,
      primaryCity: city,
      languages: ['en', 'rw'],
      categories: ['city'],
      vehicleTypes: ['sedan'],
      certifications: licenseCategories.map((item) => `License: ${item}`),
      serviceAreas: [city, availability === 'Anytime' ? city : `Availability: ${availability}`],
      availabilityCalendar: [],
      licenseCategories,
      transmission,
      addressText: address.trim(),
      idDocumentUrl: idDocumentUrl || undefined,
      licenseDocumentUrl: licenseDocumentUrl || undefined,
      phone: phone.trim() || undefined,
      profilePhotoUrl: photoUrl || undefined,
    };
  }

  async function saveProfile() {
    const token = await getToken();
    if (!token) throw new Error('Please sign in.');
    await updateMe(token, {
      ...(photoUrl ? { profilePhotoUrl: photoUrl } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    });
    await addRole(token, 'driver');
    if (hasProfile) await updateDriverProfile(token, payload());
    else {
      await createDriverProfile(token, payload());
      setHasProfile(true);
    }
  }

  async function handleNext() {
    setError('');
    if (step === 1 && !phone.trim()) {
      setError('Enter a phone number. It stays admin-only until a booking is confirmed.');
      return;
    }
    if (step === 2 && !address.trim()) {
      setError('Enter your address.');
      return;
    }
    if (step === 3 && licenseCategories.length === 0) {
      setError('Select at least one license category.');
      return;
    }
    if (step === 4 && (!idDocumentUrl || !licenseDocumentUrl)) {
      setError('Upload both your ID and driving license.');
      return;
    }
    setBusy(true);
    try {
      if (step === 4) await saveProfile();
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <OnboardWizardShell
        locale={locale}
        title="You are live as a driver"
        subtitle="Customers can now find you in search. Contacts stay hidden until a booking is confirmed."
        steps={STEPS}
        step={STEPS.length - 1}
        hideNext
      >
        <p className="text-center text-sm text-muted-foreground">Your 10,000 RWF driver plan is active.</p>
      </OnboardWizardShell>
    );
  }

  return (
    <OnboardWizardShell
      locale={locale}
      title="Become a driver"
      subtitle="Finish these steps, then pay. You will not appear in search until payment or a promo succeeds."
      steps={STEPS}
      step={step}
      error={error}
      busy={busy}
      hideNext={step === 5}
      onBack={() => setStep((prev) => Math.max(0, prev - 1))}
      onNext={() => void handleNext()}
    >
      {step === 0 ? (
        <CroppedPhotoPicker
          label="Profile photo"
          value={photoUrl}
          folder="rentingi/drivers/profiles"
          round
          nameForInitials={user?.fullName || 'Driver'}
          getToken={getToken}
          onUploaded={setPhotoUrl}
        />
      ) : null}

      {step === 1 ? (
        <div>
          <label className={onboardLabelClass}>Phone (admin-only until booking)</label>
          <input className={onboardInputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" />
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <label className={onboardLabelClass}>Address</label>
          <AddressInput value={address} onChange={setAddress} dark className={onboardInputClass} placeholder="Where you usually start from" />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <div>
            <p className={onboardLabelClass}>License categories</p>
            <div className="flex flex-wrap gap-2">
              {LICENSE_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleLicense(item)}
                  className={`rounded border px-3 py-1.5 text-sm font-black ${
                    licenseCategories.includes(item) ? 'border-brand bg-brand-soft text-foreground' : 'border-border text-muted-foreground'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={onboardLabelClass}>Years of experience</label>
            <input
              type="number"
              min={0}
              max={80}
              className={onboardInputClass}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(Number(e.target.value))}
            />
          </div>
          <div>
            <p className={onboardLabelClass}>Transmission</p>
            <div className="flex flex-wrap gap-2">
              {TRANSMISSIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTransmission(item)}
                  className={`rounded border px-3 py-1.5 text-sm font-bold ${
                    transmission === item ? 'border-brand bg-brand-soft text-foreground' : 'border-border text-muted-foreground'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={onboardLabelClass}>Availability</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAvailability(item)}
                  className={`rounded border px-3 py-1.5 text-sm font-bold ${
                    availability === item ? 'border-brand bg-brand-soft text-foreground' : 'border-border text-muted-foreground'
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
          <CroppedPhotoPicker
            label="National ID photo"
            value={idDocumentUrl}
            folder="rentingi/drivers/docs"
            aspect={1.6}
            getToken={getToken}
            onUploaded={setIdDocumentUrl}
          />
          <CroppedPhotoPicker
            label="Driving license photo"
            value={licenseDocumentUrl}
            folder="rentingi/drivers/docs"
            aspect={1.6}
            getToken={getToken}
            onUploaded={setLicenseDocumentUrl}
          />
        </div>
      ) : null}

      {step === 5 ? (
        <SubscriptionPayStep
          planLabel="Driver"
          amountRwf={10_000}
          defaultPhone={phone}
          onPay={async (pay) => {
            const token = await getToken();
            if (!token) throw new Error('Please sign in.');
            await saveProfile();
            return initiateDriverSubscription(token, pay);
          }}
          onCheckLive={async () => {
            const token = await getToken();
            if (!token) return false;
            const sub = await getDriverSubscriptionOverview(token);
            return sub.isActive;
          }}
          onSuccess={() => setDone(true)}
        />
      ) : null}
    </OnboardWizardShell>
  );
}
