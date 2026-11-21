'use client';

import { useAuth } from '@clerk/nextjs';
import { DashboardHeader } from '@/components/web/dashboard-header';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { MarketplaceVisibilityControl, type MarketplaceVisibility } from '@/components/web/marketplace-visibility-control';
import {
  loadDriverProfileForOwner,
  saveDriverProfile,
  getMe,
  setDriverMarketplaceStatus,
  type DriverProfileFull,
  type MeResponse,
} from '@/lib/api';
import { RwandaDistrictMultiSelect } from '@/components/web/rwanda-district-multi-select';
import {
  availabilityCertifications,
  DRIVER_AVAILABILITY_OPTIONS,
  parseAvailabilityFromProfile,
  type DriverAvailabilityOption,
} from '@/lib/driver-availability';
import { DRIVER_PROFILE_API_DEFAULTS, defaultPrimaryCity } from '@/lib/driver-profile-defaults';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { DashboardNav, resolveDashboardNavKey } from '@/components/web/dashboard-nav';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type DriverProfilePageProps = {
  params: Promise<{ locale: string }>;
};

const LANGUAGE_OPTIONS: { label: string; value: string }[] = [
  { label: 'English', value: 'en' },
  { label: 'French', value: 'fr' },
  { label: 'Kinyarwanda', value: 'rw' },
  { label: 'Swahili', value: 'sw' },
];
const DRIVING_CAPABILITIES = ['Manual', 'Automatic', 'Both'];
const LICENSE_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F'];

function parseHomeDistrict(addressText?: string | null): string {
  const parts = (addressText ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length >= 3 ? parts[2] : '';
}

export default function DriverProfilePage({ params }: DriverProfilePageProps) {
  const tVis = useTranslations('web.app.marketplaceVisibility');
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [existing, setExisting] = useState<DriverProfileFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingReviewMessage, setPendingReviewMessage] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [yearsExperience, setYearsExperience] = useState(1);
  const [dailyRateRwf, setDailyRateRwf] = useState(30000);
  const [weeklyRateRwf, setWeeklyRateRwf] = useState('');
  const [monthlyRateRwf, setMonthlyRateRwf] = useState('');
  const [homeDistrict, setHomeDistrict] = useState('');
  const [languages, setLanguages] = useState<string[]>(['en', 'rw']);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [serviceDistricts, setServiceDistricts] = useState<string[]>(['Kigali']);
  const [availabilityModes, setAvailabilityModes] = useState<DriverAvailabilityOption[]>(['24/7']);
  const [drivingCapability, setDrivingCapability] = useState('Both');
  const [licenseCategories, setLicenseCategories] = useState<string[]>(['B']);

  useEffect(() => {
    let cancelled = false;
    params.then((p) => { if (!cancelled && isSupportedLocale(p.locale)) setLocale(p.locale); });
    return () => { cancelled = true; };
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      try {
        const me = await getMe(token);
        if (cancelled) return;
        setProfile(me);
        const driverProfile = await loadDriverProfileForOwner(token);
        if (cancelled) return;
        if (!driverProfile) {
          const routeParams = await params;
          const nextLocale = isSupportedLocale(routeParams.locale) ? routeParams.locale : routing.defaultLocale;
          router.replace(`/${nextLocale}/onboard/driver`);
          return;
        }
        setExisting(driverProfile);
        setYearsExperience(driverProfile.yearsExperience);
        setDailyRateRwf(driverProfile.dailyRateRwf);
        setWeeklyRateRwf(
          driverProfile.weeklyRateRwf != null ? String(Math.round(Number(driverProfile.weeklyRateRwf))) : '',
        );
        setMonthlyRateRwf(
          driverProfile.monthlyRateRwf != null ? String(Math.round(Number(driverProfile.monthlyRateRwf))) : '',
        );
        setHomeDistrict(parseHomeDistrict(driverProfile.addressText) || driverProfile.primaryCity || '');
        setLanguages(driverProfile.languages.length ? driverProfile.languages : ['en', 'rw']);
        setCertifications(driverProfile.certifications);
        const areas = driverProfile.serviceAreas.filter((item) => !item.startsWith('Availability:'));
        setServiceDistricts(areas.length ? areas : ['Kigali']);
        setAvailabilityModes(parseAvailabilityFromProfile(driverProfile));
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [getToken, params, router]);

  function toggleArrayItem<T extends string>(arr: T[], item: T, setArr: (v: T[]) => void) {
    if (arr.includes(item)) {
      if (arr.length > 1) setArr(arr.filter((x) => x !== item));
    } else {
      setArr([...arr, item]);
    }
  }

  async function changeVisibility(next: MarketplaceVisibility) {
    const token = await getToken();
    if (!token) return;
    setError('');
    try {
      const updated = await setDriverMarketplaceStatus(token, next);
      setExisting((prev) => (prev ? { ...prev, marketplaceVisibility: updated.marketplaceVisibility } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPendingReviewMessage(null);
    if (serviceDistricts.length === 0) {
      setError('Select at least one district you serve.');
      return;
    }
    if (availabilityModes.length === 0) {
      setError('Select at least one availability option.');
      return;
    }
    setSaving(true);
    const token = await getToken();
    if (!token) { setError('Please sign in.'); setSaving(false); return; }

    const builtCerts = [
      ...licenseCategories.map((lc) => `License: ${lc}`),
      drivingCapability !== 'Both' ? `Drive: ${drivingCapability}` : null,
    ].filter(Boolean) as string[];

    const weekly = weeklyRateRwf.trim() ? Number(weeklyRateRwf) : undefined;
    const monthly = monthlyRateRwf.trim() ? Number(monthlyRateRwf) : undefined;
    const payload = {
      ...DRIVER_PROFILE_API_DEFAULTS,
      yearsExperience,
      dailyRateRwf,
      ...(weekly !== undefined && weekly >= 1000 ? { weeklyRateRwf: weekly } : {}),
      ...(monthly !== undefined && monthly >= 1000 ? { monthlyRateRwf: monthly } : {}),
      primaryCity: defaultPrimaryCity(homeDistrict, serviceDistricts),
      languages,
      certifications: [
        ...certifications.filter(
          (c) => !c.startsWith('License:') && !c.startsWith('Drive:') && !c.startsWith('Availability:'),
        ),
        ...builtCerts,
        ...availabilityCertifications(availabilityModes),
      ],
      serviceAreas: serviceDistricts,
      availabilityCalendar: [],
    };

    try {
      const wasLive = existing?.status === 'approved';
      const updated = await saveDriverProfile(token, payload);
      setExisting(updated);
      setSaved(true);
      if (updated.status === 'pending_approval' && (wasLive || existing)) {
        setPendingReviewMessage(
          'Your changes were saved. Your profile stays visible in search; admin verification is pending and your verified badge will return after approval.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none';
  const labelClass = 'mb-1.5 block text-xs font-black uppercase tracking-widest text-muted-foreground';

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        locale={locale}
        onLocaleChange={() => {}}
        notifications={[]}
        onClearNotifications={() => {}}
      />
      {profile ? (
        <DashboardNav
          locale={locale}
          roles={profile.roles}
          hasTaxiProfile={profile.hasTaxiProfile}
          hasDriverProfile={profile.hasDriverProfile}
          active={resolveDashboardNavKey(pathname, null, null, 'driver-profile')}
        />
      ) : null}

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground">
            {existing ? 'Update Driver Profile' : 'Create Driver Profile'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {existing
              ? 'Your profile is live. Update any details below.'
              : 'Set up your profile so customers can find and book you.'}
          </p>
        </div>

        {existing && existing.status !== 'draft' ? (
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{tVis('sectionTitle')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tVis('hint')}</p>
            <div className="mt-3">
              <MarketplaceVisibilityControl
                value={(existing.marketplaceVisibility as MarketplaceVisibility) ?? 'active'}
                onChange={(next) => void changeVisibility(next)}
              />
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md border-2 border-border bg-muted" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-card">
            {saved && (
              <div className="flex items-center gap-2 rounded border-2 border-brand bg-brand-soft px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-brand" />
                <p className="text-sm font-bold text-brand">
                  Profile {existing ? 'updated' : 'created'} successfully!
                </p>
              </div>
            )}

            {pendingReviewMessage ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
                {pendingReviewMessage}
              </div>
            ) : null}

            {existing?.status === 'pending_approval' ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
                <p className="font-bold">Awaiting verification</p>
                <p className="mt-1 text-amber-900/90">
                  You stay visible in search. Admin review is in progress; the verified badge appears once your profile is approved.
                </p>
              </div>
            ) : null}

            {/* Years experience */}
            <div>
              <label className={labelClass}>Years of Experience *</label>
              <input
                type="number"
                required
                min={0}
                max={80}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(Number(e.target.value))}
                className={inputClass}
              />
            </div>

            {/* Rates */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Daily Rate (RWF) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={500}
                  value={dailyRateRwf}
                  onChange={(e) => setDailyRateRwf(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Weekly Rate (RWF)</label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={weeklyRateRwf}
                  onChange={(e) => setWeeklyRateRwf(e.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Monthly Rate (RWF)</label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={monthlyRateRwf}
                  onChange={(e) => setMonthlyRateRwf(e.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className={labelClass}>When are you available? (select all that apply) *</label>
              <div className="flex flex-wrap gap-2">
                {DRIVER_AVAILABILITY_OPTIONS.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => toggleArrayItem(availabilityModes, mode, setAvailabilityModes)}
                    className={`rounded border-2 px-3 py-1.5 text-sm font-bold transition-all ${
                      availabilityModes.includes(mode)
                        ? 'border-brand bg-brand text-white'
                        : 'border-neutral-300 bg-card text-muted-foreground hover:border-border'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Driving capability */}
            <div>
              <label className={labelClass}>Driving Capability *</label>
              <div className="flex flex-wrap gap-2">
                {DRIVING_CAPABILITIES.map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setDrivingCapability(cap)}
                    className={`rounded border-2 px-3 py-1.5 text-sm font-bold transition-all ${
                      drivingCapability === cap
                        ? 'border-brand bg-brand text-white'
                        : 'border-neutral-300 bg-card text-muted-foreground hover:border-border'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            {/* License categories */}
            <div>
              <label className={labelClass}>License Categories *</label>
              <div className="flex flex-wrap gap-2">
                {LICENSE_CATEGORIES.map((lc) => (
                  <button
                    key={lc}
                    type="button"
                    onClick={() => toggleArrayItem(licenseCategories, lc, setLicenseCategories)}
                    className={`h-10 w-10 rounded border-2 text-sm font-black transition-all ${
                      licenseCategories.includes(lc)
                        ? 'border-brand bg-brand text-white'
                        : 'border-neutral-300 bg-card text-muted-foreground hover:border-border'
                    }`}
                  >
                    {lc}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">B = car, C = truck, D = bus, A = motorcycle</p>
            </div>

            {/* Languages */}
            <div>
              <label className={labelClass}>Languages Spoken *</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      if (languages.includes(value)) {
                        if (languages.length > 1) setLanguages(languages.filter((l) => l !== value));
                      } else {
                        setLanguages([...languages, value]);
                      }
                    }}
                    className={`rounded border-2 px-3 py-1.5 text-sm font-bold transition-all ${
                      languages.includes(value)
                        ? 'border-brand bg-brand text-white'
                        : 'border-neutral-300 bg-card text-muted-foreground hover:border-border'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <RwandaDistrictMultiSelect
              variant="dashboard"
              label="Districts you serve"
              labelClassName={labelClass}
              value={serviceDistricts}
              onChange={setServiceDistricts}
            />

            {error && (
              <div className="rounded border-2 border-red-400 bg-red-50 px-4 py-3">
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded border-2 border-brand-strong bg-brand py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-brutal-sky-sm transition-all hover:translate-x-px hover:translate-y-px hover:bg-brand-hover hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : existing ? 'Update Driver Profile' : 'Create Driver Profile'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
