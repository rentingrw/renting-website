'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';

import { CroppedPhotoPicker } from '@/components/web/cropped-photo-picker';
import { DriverApplicationSummary } from '@/components/web/driver-application-summary';
import { OnboardWizardShell, onboardInputClass, onboardLabelClass } from '@/components/web/onboard-wizard-shell';
import { RegistrationAgreement, registrationAgreementError } from '@/components/web/registration-agreement';
import { RwandaAdminAddressSelect } from '@/components/web/rwanda-admin-address-select';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  addRole,
  createDriverProfile,
  getDriverProfileFull,
  getMe,
  submitDriverProfileForReview,
  updateDriverProfile,
  updateMe,
  type DriverProfilePayload,
} from '@/lib/api';

const STEPS = ['Name', 'Photo', 'Phone', 'Address', 'License', 'Languages', 'Rates', 'Documents', 'Agreement'];
type ApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';
const LICENSE_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F'];
const TRANSMISSIONS = ['Manual', 'Automatic', 'Both'];
const AVAILABILITY = ['24/7', 'Weekends', 'Daytime', 'Nighttime'] as const;
const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'rw', label: 'Kinyarwanda' },
  { code: 'sw', label: 'Swahili' },
  { code: 'fr', label: 'French' },
] as const;

function formatRwf(value: number) {
  return new Intl.NumberFormat('en-RW').format(value);
}

function parseAvailability(profile: {
  certifications?: string[];
  serviceAreas?: string[];
}): (typeof AVAILABILITY)[number] {
  const fromCert = profile.certifications?.find((item) => item.startsWith('Availability: '))?.replace('Availability: ', '');
  const fromArea = profile.serviceAreas?.find((item) => item.startsWith('Availability: '))?.replace('Availability: ', '');
  const raw = fromCert || fromArea || '';
  const legacy: Record<string, (typeof AVAILABILITY)[number]> = {
    Anytime: '24/7',
    'Daytime (6am–6pm)': 'Daytime',
    'Daytime (6am-6pm)': 'Daytime',
    'Nighttime (6pm–6am)': 'Nighttime',
    'Nighttime (6pm-6am)': 'Nighttime',
    'Weekends only': 'Weekends',
  };
  if (raw && (AVAILABILITY as readonly string[]).includes(raw)) return raw as (typeof AVAILABILITY)[number];
  if (raw && legacy[raw]) return legacy[raw];
  return '24/7';
}

const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(LANGUAGE_OPTIONS.map((item) => [item.code, item.label]));

export default function DriverOnboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const { getToken } = useAuth();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('draft');
  const [rejectionReason, setRejectionReason] = useState('');
  const [hasProfile, setHasProfile] = useState(false);
  const [fullName, setFullName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [primaryDistrict, setPrimaryDistrict] = useState('');
  const [yearsExperience, setYearsExperience] = useState(1);
  const [licenseCategories, setLicenseCategories] = useState<string[]>(['B']);
  const [transmission, setTransmission] = useState('Both');
  const [availability, setAvailability] = useState<(typeof AVAILABILITY)[number]>('24/7');
  const [languages, setLanguages] = useState<string[]>(['en', 'rw']);
  const [dailyRateRwf, setDailyRateRwf] = useState('');
  const [monthlyRateRwf, setMonthlyRateRwf] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [licenseDocumentUrl, setLicenseDocumentUrl] = useState('');
  const [editingAfterReject, setEditingAfterReject] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [agreedToFee, setAgreedToFee] = useState(false);

  const showSummary =
    approvalStatus === 'pending_approval' ||
    approvalStatus === 'approved' ||
    (approvalStatus === 'rejected' && hasProfile && !editingAfterReject);

  const onAddressChange = useCallback((formatted: string, districtName: string) => {
    setAddress(formatted);
    setPrimaryDistrict(districtName);
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
      const [me, profile] = await Promise.all([getMe(token), getDriverProfileFull(token)]);
      if (cancelled) return;
      if (me) {
        setFullName(me.fullName || user?.fullName || '');
        setPhone(me.phone || '');
      } else if (user?.fullName) {
        setFullName(user.fullName);
      }
      if (profile) {
        setHasProfile(true);
        setFullName(profile.fullName || me?.fullName || user?.fullName || '');
        if (profile.profilePhotoUrl) setPhotoUrl(profile.profilePhotoUrl);
        setPhone(profile.phone || me?.phone || '');
        setAddress(profile.addressText || '');
        setPrimaryDistrict(profile.primaryCity || '');
        setYearsExperience(profile.yearsExperience || 1);
        setLicenseCategories(profile.licenseCategories?.length ? profile.licenseCategories : ['B']);
        setTransmission(profile.transmission || 'Both');
        setAvailability(parseAvailability(profile));
        if (profile.languages?.length) setLanguages(profile.languages);
        if (profile.dailyRateRwf) setDailyRateRwf(String(Math.round(profile.dailyRateRwf)));
        if (profile.monthlyRateRwf) setMonthlyRateRwf(String(Math.round(profile.monthlyRateRwf)));
        setIdDocumentUrl(profile.idDocumentUrl || '');
        setLicenseDocumentUrl(profile.licenseDocumentUrl || '');
        if (profile.status) setApprovalStatus(profile.status);
        setRejectionReason(profile.rejectionReason || '');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getToken, user?.fullName]);

  function toggleLicense(value: string) {
    setLicenseCategories((prev) =>
      prev.includes(value) ? (prev.length === 1 ? prev : prev.filter((item) => item !== value)) : [...prev, value],
    );
  }

  function toggleLanguage(code: string) {
    setLanguages((prev) =>
      prev.includes(code) ? (prev.length === 1 ? prev : prev.filter((item) => item !== code)) : [...prev, code],
    );
  }

  function payload(): DriverProfilePayload {
    const city = primaryDistrict.trim() || address.split(',').map((part) => part.trim())[2] || 'Kigali';
    const daily = dailyRateRwf.trim() ? Number(dailyRateRwf) : 0;
    const monthly = monthlyRateRwf.trim() ? Number(monthlyRateRwf) : undefined;
    const dailyForApi =
      daily >= 1000 ? daily : monthly && monthly >= 1000 ? Math.max(1000, Math.round(monthly / 30)) : 1000;
    return {
      driverCategory: 'city',
      yearsExperience,
      dailyRateRwf: dailyForApi,
      ...(monthly !== undefined && monthly >= 1000 ? { monthlyRateRwf: monthly } : {}),
      primaryCity: city,
      languages,
      categories: ['city'],
      vehicleTypes: ['sedan'],
      certifications: [
        ...licenseCategories.map((item) => `License: ${item}`),
        `Availability: ${availability}`,
      ],
      serviceAreas: [city],
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
      ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
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

    if (step === 0 && !fullName.trim()) {
      setError('Enter your full name as it appears on your ID.');
      return;
    }
    if (step === 1 && !photoUrl) {
      setError('Upload a profile photo (not your sign-in avatar).');
      return;
    }
    if (step === 2 && !phone.trim()) {
      setError('Enter a phone number. It stays admin-only until a booking is confirmed.');
      return;
    }
    if (step === 3 && !address.trim()) {
      setError('Select your province, district, sector, and cell.');
      return;
    }
    if (step === 4 && licenseCategories.length === 0) {
      setError('Select at least one license category.');
      return;
    }
    if (step === 5 && languages.length === 0) {
      setError('Select at least one language you can speak with customers.');
      return;
    }
    if (step === 6) {
      const daily = dailyRateRwf.trim() ? Number(dailyRateRwf) : 0;
      const monthly = monthlyRateRwf.trim() ? Number(monthlyRateRwf) : 0;
      if (daily < 1000 && monthly < 1000) {
        setError('Enter your rate per day and/or per month (minimum 1,000 RWF).');
        return;
      }
      if (daily > 0 && daily < 1000) {
        setError('Daily rate must be at least 1,000 RWF.');
        return;
      }
      if (monthly > 0 && monthly < 1000) {
        setError('Monthly rate must be at least 1,000 RWF.');
        return;
      }
    }
    if (step === 7 && (!idDocumentUrl || !licenseDocumentUrl)) {
      setError('Upload both your national ID and driving license.');
      return;
    }
    if (step === 8) {
      const agreementError = registrationAgreementError(agreedToPolicy, agreedToFee);
      if (agreementError) {
        setError(agreementError);
        return;
      }
    }

    setBusy(true);
    try {
      if (step === 8) {
        await saveProfile();
        const token = await getToken();
        if (!token) throw new Error('Please sign in.');
        const submitted = await submitDriverProfileForReview(token);
        setApprovalStatus(submitted.status ?? 'pending_approval');
        setRejectionReason('');
        setEditingAfterReject(false);
        return;
      }
      if (step >= 4) await saveProfile();
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  }

  if (showSummary) {
    return (
      <DriverApplicationSummary
        locale={locale}
        status={approvalStatus as 'pending_approval' | 'approved' | 'rejected'}
        rejectionReason={rejectionReason}
        fullName={fullName}
        photoUrl={photoUrl}
        phone={phone}
        address={address}
        licenseCategories={licenseCategories}
        yearsExperience={yearsExperience}
        transmission={transmission}
        availability={availability}
        languages={languages}
        languageLabels={LANGUAGE_LABELS}
        dailyRateRwf={dailyRateRwf}
        monthlyRateRwf={monthlyRateRwf}
        idDocumentUrl={idDocumentUrl}
        licenseDocumentUrl={licenseDocumentUrl}
        formatRwf={formatRwf}
        onEdit={approvalStatus === 'rejected' ? () => setEditingAfterReject(true) : undefined}
      />
    );
  }

  return (
    <OnboardWizardShell
      locale={locale}
      title="Become a driver"
      subtitle="Complete your profile and submit for admin review. You appear in search only after approval."
      steps={STEPS}
      step={step}
      error={error}
      busy={busy}
      nextLabel={step === STEPS.length - 1 ? 'Submit for review' : 'Continue'}
      nextDisabled={step === STEPS.length - 1 && (!agreedToPolicy || !agreedToFee)}
      onBack={() => setStep((prev) => Math.max(0, prev - 1))}
      onNext={() => void handleNext()}
    >
      {approvalStatus === 'rejected' && editingAfterReject ? (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-bold">Update and submit again</p>
          {rejectionReason ? <p className="mt-1">{rejectionReason}</p> : null}
        </div>
      ) : null}

      {step === 0 ? (
        <div>
          <label className={onboardLabelClass} htmlFor="driver-full-name">
            Full name
          </label>
          <input
            id="driver-full-name"
            className={onboardInputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jean Baptiste Uwimana"
            autoComplete="name"
          />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-2">
          <CroppedPhotoPicker
            label="Profile photo"
            value={photoUrl}
            folder="rentingi/drivers/profiles"
            round
            nameForInitials={fullName.trim() || user?.fullName || 'Driver'}
            getToken={getToken}
            onUploaded={setPhotoUrl}
          />
          <p className="text-xs text-muted-foreground">
            Upload a clear photo of your face. Do not use the picture from your email or social sign-in.
          </p>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <label className={onboardLabelClass}>Phone (admin-only until booking)</label>
          <input className={onboardInputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" />
        </div>
      ) : null}

      {step === 3 ? (
        <div>
          <p className={`${onboardLabelClass} mb-3`}>Address in Rwanda</p>
          <RwandaAdminAddressSelect value={address} onChange={onAddressChange} />
        </div>
      ) : null}

      {step === 4 ? (
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

      {step === 5 ? (
        <div>
          <p className={onboardLabelClass}>Languages you speak</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => toggleLanguage(item.code)}
                className={`rounded border px-3 py-1.5 text-sm font-bold ${
                  languages.includes(item.code) ? 'border-brand bg-brand-soft text-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Tell customers what you charge. Enter at least one of daily or monthly rate.</p>
          <div>
            <label className={onboardLabelClass} htmlFor="driver-daily-rate">
              Rate per day (RWF)
            </label>
            <input
              id="driver-daily-rate"
              type="number"
              min={1000}
              className={onboardInputClass}
              value={dailyRateRwf}
              onChange={(e) => setDailyRateRwf(e.target.value)}
              placeholder="e.g. 35000"
            />
          </div>
          <div>
            <label className={onboardLabelClass} htmlFor="driver-monthly-rate">
              Rate per month (RWF, optional)
            </label>
            <input
              id="driver-monthly-rate"
              type="number"
              min={1000}
              className={onboardInputClass}
              value={monthlyRateRwf}
              onChange={(e) => setMonthlyRateRwf(e.target.value)}
              placeholder="e.g. 800000"
            />
          </div>
        </div>
      ) : null}

      {step === 7 ? (
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
          <p className="text-xs text-muted-foreground">
            Your documents are reviewed by an admin. You will not be approved automatically.
          </p>
        </div>
      ) : null}

      {step === 8 ? (
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
