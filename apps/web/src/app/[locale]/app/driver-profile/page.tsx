'use client';

import { useAuth } from '@clerk/nextjs';
import { DashboardHeader } from '@/components/web/dashboard-header';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import {
  addRole,
  createDriverProfile,
  getDriverProfileFull,
  updateDriverProfile,
  type DriverCategory,
  type DriverProfileFull,
  type VehicleType,
} from '@/lib/api';
import { CheckCircle2, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type DriverProfilePageProps = {
  params: Promise<{ locale: string }>;
};

const DRIVER_CATEGORIES: DriverCategory[] = ['city', 'outstation', 'airport', 'chauffeur', 'tour_guide', 'delivery'];
const VEHICLE_TYPES: VehicleType[] = ['sedan', 'suv', 'hatchback', 'pickup', 'van', 'truck'];
const LANGUAGE_OPTIONS: { label: string; value: string }[] = [
  { label: 'English', value: 'en' },
  { label: 'French', value: 'fr' },
  { label: 'Kinyarwanda', value: 'rw' },
  { label: 'Swahili', value: 'sw' },
];
const AVAILABILITY_MODES = ['Anytime', 'Daytime (6am–6pm)', 'Nighttime (6pm–6am)', 'Weekends only'];
const DRIVING_CAPABILITIES = ['Manual', 'Automatic', 'Both'];
const LICENSE_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F'];

function labelFor(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DriverProfilePage({ params }: DriverProfilePageProps) {
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const { getToken } = useAuth();
  const router = useRouter();
  const [existing, setExisting] = useState<DriverProfileFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [driverCategory, setDriverCategory] = useState<DriverCategory>('city');
  const [yearsExperience, setYearsExperience] = useState(1);
  const [biography, setBiography] = useState('');
  const [dailyRateRwf, setDailyRateRwf] = useState(30000);
  const [hourlyRateRwf, setHourlyRateRwf] = useState('');
  const [weeklyRateRwf, setWeeklyRateRwf] = useState('');
  const [primaryCity, setPrimaryCity] = useState('Kigali');
  const [languages, setLanguages] = useState<string[]>(['en', 'rw']);
  const [categories, setCategories] = useState<DriverCategory[]>(['city']);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(['sedan']);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>(['Kigali']);
  const [customServiceArea, setCustomServiceArea] = useState('');
  const [availabilityMode, setAvailabilityMode] = useState('Anytime');
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
        const profile = await getDriverProfileFull(token);
        if (cancelled) return;
        if (!profile) {
          const routeParams = await params;
          const nextLocale = isSupportedLocale(routeParams.locale) ? routeParams.locale : routing.defaultLocale;
          router.replace(`/${nextLocale}/onboard/driver`);
          return;
        }
        setExisting(profile);
        setDriverCategory(profile.driverCategory);
        setYearsExperience(profile.yearsExperience);
        setBiography(profile.biography ?? '');
        setDailyRateRwf(profile.dailyRateRwf);
        setHourlyRateRwf(profile.hourlyRateRwf != null ? String(profile.hourlyRateRwf) : '');
        setWeeklyRateRwf(profile.weeklyRateRwf != null ? String(profile.weeklyRateRwf) : '');
        setPrimaryCity(profile.primaryCity);
        setLanguages(profile.languages.length ? profile.languages : ['en', 'rw']);
        setCategories(profile.categories.length ? (profile.categories as DriverCategory[]) : [profile.driverCategory]);
        setVehicleTypes(profile.vehicleTypes.length ? (profile.vehicleTypes as VehicleType[]) : ['sedan']);
        setCertifications(profile.certifications);
        setServiceAreas(profile.serviceAreas.length ? profile.serviceAreas : ['Kigali']);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const token = await getToken();
    if (!token) { setError('Please sign in.'); setSaving(false); return; }

    const builtCerts = [
      ...licenseCategories.map((lc) => `License: ${lc}`),
      drivingCapability !== 'Both' ? `Drive: ${drivingCapability}` : null,
    ].filter(Boolean) as string[];

    const payload = {
      driverCategory,
      yearsExperience,
      biography: biography.trim() || undefined,
      dailyRateRwf,
      hourlyRateRwf: hourlyRateRwf ? Number(hourlyRateRwf) : undefined,
      weeklyRateRwf: weeklyRateRwf ? Number(weeklyRateRwf) : undefined,
      primaryCity: primaryCity.trim(),
      languages,
      categories,
      vehicleTypes,
      certifications: [...certifications.filter((c) => !c.startsWith('License:') && !c.startsWith('Drive:')), ...builtCerts],
      serviceAreas: [...serviceAreas, availabilityMode !== 'Anytime' ? `Availability: ${availabilityMode}` : null].filter(Boolean) as string[],
      availabilityCalendar: [],
    };

    try {
      if (existing) {
        await updateDriverProfile(token, payload);
      } else {
        await addRole(token, 'driver');
        await createDriverProfile(token, payload);
      }
      setSaved(true);
      setExisting({ ...existing!, ...payload, id: existing?.id ?? '', userId: existing?.userId ?? '', fullName: existing?.fullName ?? '', trustScore: existing?.trustScore ?? 100, rating: null, completedTrips: 0, bookingStats: { total: 0, pending: 0, confirmed: 0, active: 0, completed: 0 } });
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

            {/* Main category */}
            <div>
              <label className={labelClass}>Primary Driver Category *</label>
              <select
                required
                value={driverCategory}
                onChange={(e) => setDriverCategory(e.target.value as DriverCategory)}
                className={inputClass}
              >
                {DRIVER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{labelFor(cat)}</option>
                ))}
              </select>
            </div>

            {/* Categories (multiple) */}
            <div>
              <label className={labelClass}>Service Categories (select all that apply) *</label>
              <div className="flex flex-wrap gap-2">
                {DRIVER_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleArrayItem(categories, cat, setCategories)}
                    className={`rounded border-2 px-3 py-1.5 text-sm font-bold transition-all ${
                      categories.includes(cat)
                        ? 'border-brand bg-brand text-white'
                        : 'border-neutral-300 bg-card text-muted-foreground hover:border-border'
                    }`}
                  >
                    {labelFor(cat)}
                  </button>
                ))}
              </div>
            </div>

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

            {/* Bio */}
            <div>
              <label className={labelClass}>Biography (optional)</label>
              <textarea
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                rows={3}
                placeholder="Tell customers about your experience, specialties, and what makes you great..."
                className={`${inputClass} resize-none`}
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
                <label className={labelClass}>Hourly Rate (RWF)</label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={hourlyRateRwf}
                  onChange={(e) => setHourlyRateRwf(e.target.value)}
                  placeholder="Optional"
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
            </div>

            {/* Primary city */}
            <div>
              <label className={labelClass}>Primary City *</label>
              <input
                type="text"
                required
                value={primaryCity}
                onChange={(e) => setPrimaryCity(e.target.value)}
                placeholder="Kigali"
                className={inputClass}
              />
            </div>

            {/* Availability */}
            <div>
              <label className={labelClass}>When Are You Available? *</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABILITY_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAvailabilityMode(mode)}
                    className={`rounded border-2 px-3 py-1.5 text-sm font-bold transition-all ${
                      availabilityMode === mode
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

            {/* Vehicle types */}
            <div>
              <label className={labelClass}>Vehicle Types You Can Drive *</label>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_TYPES.map((vt) => (
                  <button
                    key={vt}
                    type="button"
                    onClick={() => toggleArrayItem(vehicleTypes, vt, setVehicleTypes)}
                    className={`rounded border-2 px-3 py-1.5 text-sm font-bold capitalize transition-all ${
                      vehicleTypes.includes(vt)
                        ? 'border-brand bg-brand text-white'
                        : 'border-neutral-300 bg-card text-muted-foreground hover:border-border'
                    }`}
                  >
                    {vt}
                  </button>
                ))}
              </div>
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

            {/* Service areas */}
            <div>
              <label className={labelClass}>Service Areas *</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {serviceAreas.filter((a) => !a.startsWith('Availability:')).map((area) => (
                  <span
                    key={area}
                    className="flex items-center gap-1 rounded border-2 border-border bg-neutral-50 px-2.5 py-1 text-sm font-bold"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => setServiceAreas(serviceAreas.filter((a) => a !== area))}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customServiceArea}
                  onChange={(e) => setCustomServiceArea(e.target.value)}
                  placeholder="Add a city or area..."
                  className="flex-1 rounded border-2 border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = customServiceArea.trim();
                      if (trimmed && !serviceAreas.includes(trimmed)) {
                        setServiceAreas([...serviceAreas, trimmed]);
                      }
                      setCustomServiceArea('');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = customServiceArea.trim();
                    if (trimmed && !serviceAreas.includes(trimmed)) {
                      setServiceAreas([...serviceAreas, trimmed]);
                    }
                    setCustomServiceArea('');
                  }}
                  className="flex items-center gap-1 rounded border-2 border-border px-3 py-2 text-sm font-bold hover:bg-muted"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>

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
