'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

import { CroppedPhotoPicker } from '@/components/web/cropped-photo-picker';
import { OnboardWizardShell, onboardInputClass, onboardLabelClass } from '@/components/web/onboard-wizard-shell';
import { SubscriptionPayStep } from '@/components/web/subscription-pay-step';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  getMe,
  getTaxiDriverMe,
  getTaxiSubscriptionOverview,
  initiateTaxiSubscription,
  registerTaxiDriver,
  updateTaxiDriverMe,
  type TaxiDriverPayload,
} from '@/lib/api';

const STEPS = ['Photo', 'Contact', 'Car', 'Features', 'Car photo', 'Pay'];
const VEHICLE_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Van', 'Pickup'];
const TAXI_FEATURES = [
  'Air Conditioning',
  'Airport runs',
  'Night service',
  'Child seat',
  'Extra luggage',
  'WiFi',
  'Card payment',
  'Wheelchair accessible',
];

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
  const [photoUrl, setPhotoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('');
  const [carModel, setCarModel] = useState('');
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Sedan');
  const [seats, setSeats] = useState(4);
  const [features, setFeatures] = useState<string[]>([]);
  const [carPhoto, setCarPhoto] = useState('');

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
      const [me, taxi, sub] = await Promise.all([
        getMe(token),
        getTaxiDriverMe(token),
        getTaxiSubscriptionOverview(token),
      ]);
      if (cancelled) return;
      setFullName(me?.fullName || user?.fullName || '');
      setPhotoUrl(me?.profilePhotoUrl || '');
      setPhone(me?.phone || '');
      setWhatsapp(me?.whatsapp || '');
      if (taxi) {
        setHasProfile(true);
        setFullName(taxi.fullName);
        setPhotoUrl(taxi.profilePhotoUrl || me?.profilePhotoUrl || '');
        setPhone(taxi.phone);
        setWhatsapp(taxi.whatsapp || '');
        setCity(taxi.city);
        setCarModel(taxi.carModel || '');
        setPlate(taxi.plate || '');
        setVehicleType(taxi.vehicleType || 'Sedan');
        setSeats(taxi.seats);
        setFeatures(taxi.features ?? []);
        setCarPhoto(taxi.photos[0] || taxi.photoUrl || '');
      }
      if (sub.isActive) setDone(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getToken, user]);

  function toggleFeature(value: string) {
    setFeatures((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  function payload(): TaxiDriverPayload {
    return {
      fullName: fullName.trim() || 'Taxi driver',
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || undefined,
      city: city.trim(),
      seats,
      carModel: carModel.trim(),
      plate: plate.trim(),
      vehicleType,
      features,
      photos: [carPhoto],
      photoUrl: carPhoto,
      profilePhotoUrl: photoUrl || undefined,
    };
  }

  async function saveProfile() {
    const token = await getToken();
    if (!token) throw new Error('Please sign in.');
    if (hasProfile) await updateTaxiDriverMe(token, payload());
    else {
      await registerTaxiDriver(token, payload());
      setHasProfile(true);
    }
  }

  async function handleNext() {
    setError('');
    if (step === 1 && (!phone.trim() || !whatsapp.trim())) {
      setError('Phone and WhatsApp are required. Taxi contacts stay public.');
      return;
    }
    if (step === 2 && (!city.trim() || !carModel.trim() || !plate.trim())) {
      setError('Enter the city, car model, and plate.');
      return;
    }
    if (step === 3 && features.length === 0) {
      setError('Select at least one feature.');
      return;
    }
    if (step === 4 && !carPhoto) {
      setError('Add at least one full-car photo.');
      return;
    }
    setBusy(true);
    try {
      if (step === 4) await saveProfile();
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
        subtitle="No admin approval needed. Your phone is public so customers can call you now."
        steps={STEPS}
        step={STEPS.length - 1}
        hideNext
      >
        <p className="text-center text-sm text-muted-foreground">Your 10,000 RWF taxi plan is active.</p>
      </OnboardWizardShell>
    );
  }

  return (
    <OnboardWizardShell
      locale={locale}
      title="Become a taxi driver"
      subtitle="Pay or apply a promo to go live immediately. No admin approval after a successful payment."
      steps={STEPS}
      step={step}
      error={error}
      busy={busy}
      hideNext={step === 5}
      onBack={() => setStep((prev) => Math.max(0, prev - 1))}
      onNext={() => void handleNext()}
    >
      {step === 0 ? (
        <div className="space-y-4">
          <div>
            <label className={onboardLabelClass}>Name on your taxi card</label>
            <input className={onboardInputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <CroppedPhotoPicker
            label="Profile photo (optional. Initials if skipped)"
            value={photoUrl}
            folder="rentingi/taxi-drivers/profiles"
            round
            nameForInitials={fullName || 'Taxi'}
            getToken={getToken}
            onUploaded={setPhotoUrl}
          />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label className={onboardLabelClass}>Phone</label>
            <input className={onboardInputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" />
          </div>
          <div>
            <label className={onboardLabelClass}>WhatsApp</label>
            <input className={onboardInputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="07XXXXXXXX" />
          </div>
          <p className="text-xs text-muted-foreground">Taxi contacts are public. We do not collect a separate email here.</p>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div>
            <label className={onboardLabelClass}>City</label>
            <input className={onboardInputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City or neighborhood" />
          </div>
          <div>
            <label className={onboardLabelClass}>Car model</label>
            <input className={onboardInputClass} value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder="Toyota Axio" />
          </div>
          <div>
            <label className={onboardLabelClass}>Plate</label>
            <input className={onboardInputClass} value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="RAC 123 A" />
          </div>
          <div>
            <p className={onboardLabelClass}>Vehicle type</p>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setVehicleType(item)}
                  className={`rounded border px-3 py-1.5 text-sm font-bold ${
                    vehicleType === item ? 'border-brand bg-brand-soft text-foreground' : 'border-border text-muted-foreground'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={onboardLabelClass}>Seats</label>
            <input
              type="number"
              min={1}
              max={50}
              className={onboardInputClass}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-wrap gap-2">
          {TAXI_FEATURES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleFeature(item)}
              className={`rounded border px-3 py-1.5 text-sm font-bold ${
                features.includes(item) ? 'border-brand bg-brand-soft text-foreground' : 'border-border text-muted-foreground'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      {step === 4 ? (
        <CroppedPhotoPicker
          label="Full-car photo"
          value={carPhoto}
          folder="rentingi/taxi-drivers/cars"
          aspect={4 / 3}
          getToken={getToken}
          onUploaded={setCarPhoto}
        />
      ) : null}

      {step === 5 ? (
        <SubscriptionPayStep
          planLabel="Taxi"
          amountRwf={10_000}
          defaultPhone={phone}
          note="A successful payment or 100% promo publishes you immediately. No admin approval."
          onPay={async (pay) => {
            const token = await getToken();
            if (!token) throw new Error('Please sign in.');
            await saveProfile();
            return initiateTaxiSubscription(token, pay);
          }}
          onCheckLive={async () => {
            const token = await getToken();
            if (!token) return false;
            const sub = await getTaxiSubscriptionOverview(token);
            return sub.isActive;
          }}
          onSuccess={() => setDone(true)}
        />
      ) : null}
    </OnboardWizardShell>
  );
}
