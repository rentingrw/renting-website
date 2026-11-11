'use client';

import { AppHeader } from '@/components/web/app-header';
import { useFavoriteIds } from '@/components/web/favorite-button';
import { CarListingCard } from '@/components/web/car-listing-card';
import { DriverListingCard } from '@/components/web/driver-listing-card';
import { InitialsAvatar } from '@/components/web/initials-avatar';
import { MediaImage } from '@/components/web/media-image';
import { TaxiListingCard } from '@/components/web/taxi-listing-card';
import { MarketplaceSearchBar } from '@/components/web/marketplace-search-bar';
import { SiteFooter } from '@/components/web/site-footer';
import { isSupportedLocale, routing, type SupportedLocale } from '@/i18n/routing';
import { searchMarketplace, type SearchCar, type SearchDriver, type SearchTaxi, type SearchType } from '@/lib/api';
import { formatSearchCarDailyPrice } from '@/lib/car-listing-price';
import { stockImages } from '@/lib/stock-images';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Car,
  Home,
  MapPin,
  MousePointerClick,
  Plane,
  Search,
  Sparkles,
  Truck,
  UserRound,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

const POPULAR_PLACES = ['Kigali', 'Musanze', 'Rubavu', 'Huye', 'Karongi'] as const;
const HOME_SECTION_LIMIT = 8;
const WORD_ROTATE_MS = 2400;

type PopularListingKind = 'all' | 'cars' | 'drivers' | 'taxi';
type QuickRange = 'today' | 'weekend' | 'week';

const SEARCH_TYPE_FOR_KIND: Record<PopularListingKind, SearchType> = {
  all: 'all',
  cars: 'cars',
  drivers: 'drivers',
  taxi: 'taxis',
};

function cityHrefForListing(locale: SupportedLocale, kind: PopularListingKind, city: string): string {
  const q = encodeURIComponent(city);
  switch (kind) {
    case 'cars':
      return `/${locale}/cars?location=${q}`;
    case 'drivers':
      return `/${locale}/drivers?location=${q}`;
    case 'taxi':
      return `/${locale}/taxi-drivers?location=${q}`;
    default:
      return `/${locale}/search?location=${q}`;
  }
}

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function quickRange(range: QuickRange): { from: string; to: string } {
  const start = new Date();
  const end = new Date(start);
  if (range === 'today') {
    end.setDate(start.getDate() + 1);
  } else if (range === 'weekend') {
    const day = start.getDay();
    if (day !== 6 && day !== 0) start.setDate(start.getDate() + (6 - day));
    end.setTime(start.getTime());
    end.setDate(start.getDate() + (start.getDay() === 6 ? 1 : 0));
  } else {
    end.setDate(start.getDate() + 7);
  }
  return { from: toDateInput(start), to: toDateInput(end) };
}

export default function HomePage({ params }: HomePageProps) {
  const t = useTranslations('web');
  const [locale, setLocale] = useState<SupportedLocale>(routing.defaultLocale);
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [intent, setIntent] = useState<PopularListingKind>('all');
  const [activeRange, setActiveRange] = useState<QuickRange | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [featuredCars, setFeaturedCars] = useState<SearchCar[]>([]);
  const [featuredDrivers, setFeaturedDrivers] = useState<SearchDriver[]>([]);
  const [featuredTaxis, setFeaturedTaxis] = useState<SearchTaxi[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [popularListing, setPopularListing] = useState<PopularListingKind>('all');
  const carFavorites = useFavoriteIds('car');
  const driverFavorites = useFavoriteIds('driver');

  useEffect(() => {
    let cancelled = false;
    async function resolveParams() {
      const routeParams = await params;
      if (!cancelled && isSupportedLocale(routeParams.locale)) setLocale(routeParams.locale);
    }
    resolveParams();
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWordIndex((i) => (i + 1) % POPULAR_PLACES.length);
    }, WORD_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFeatured() {
      try {
        const data = await searchMarketplace({ type: 'all', limit: HOME_SECTION_LIMIT });
        if (!cancelled) {
          setFeaturedCars(data.cars.slice(0, HOME_SECTION_LIMIT));
          setFeaturedDrivers(data.drivers.slice(0, HOME_SECTION_LIMIT));
          setFeaturedTaxis((data.taxis ?? []).slice(0, HOME_SECTION_LIMIT));
        }
      } catch {
        if (!cancelled) {
          setFeaturedCars([]);
          setFeaturedDrivers([]);
          setFeaturedTaxis([]);
        }
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    }
    loadFeatured();
    return () => {
      cancelled = true;
    };
  }, []);

  const searchHref = useMemo(() => {
    const paramsObj = new URLSearchParams();
    if (intent !== 'all') paramsObj.set('type', SEARCH_TYPE_FOR_KIND[intent]);
    if (location.trim()) paramsObj.set('location', location.trim());
    if (latitude !== null) paramsObj.set('latitude', String(latitude));
    if (longitude !== null) paramsObj.set('longitude', String(longitude));
    if (from) paramsObj.set('from', from);
    if (to) paramsObj.set('to', to);
    return `/${locale}/search?${paramsObj.toString()}`;
  }, [from, intent, latitude, locale, location, longitude, to]);

  const intentTabs: { id: PopularListingKind; label: string; icon: typeof Car }[] = [
    { id: 'all', label: t('tabs.all'), icon: Sparkles },
    { id: 'cars', label: t('tabs.cars'), icon: Car },
    { id: 'drivers', label: t('tabs.drivers'), icon: UserRound },
    { id: 'taxi', label: t('tabs.taxi'), icon: Truck },
  ];

  const quickRanges: { id: QuickRange; label: string }[] = [
    { id: 'today', label: t('home.quickToday') },
    { id: 'weekend', label: t('home.quickWeekend') },
    { id: 'week', label: t('home.quickWeek') },
  ];

  const supply = [
    { href: `/${locale}/list-your-car`, label: t('nav.becomeHoster'), desc: t('home.supplyHostDesc'), icon: Home },
    { href: `/${locale}/drive-with-us`, label: t('nav.becomeDriver'), desc: t('home.supplyDriveDesc'), icon: Car },
    { href: `/${locale}/onboard/taxi`, label: t('nav.becomeTaxi'), desc: t('home.supplyTaxiDesc'), icon: Zap },
  ];

  const steps = [
    { title: t('home.howSearchTitle'), desc: t('home.howSearchDesc'), icon: Search },
    { title: t('home.howChooseTitle'), desc: t('home.howChooseDesc'), icon: MousePointerClick },
    { title: t('home.howBookTitle'), desc: t('home.howBookDesc'), icon: CalendarCheck },
  ];

  const popularListingTabs: { id: PopularListingKind; label: string }[] = [
    { id: 'all', label: t('tabs.all') },
    { id: 'cars', label: t('tabs.cars') },
    { id: 'drivers', label: t('tabs.drivers') },
    { id: 'taxi', label: t('tabs.taxi') },
  ];

  const showcaseCar = featuredCars[0];
  const showcaseCarPhoto =
    showcaseCar?.photos?.[0] ??
    (showcaseCar
      ? stockImages.cars[showcaseCar.vehicleType as keyof typeof stockImages.cars]
      : undefined) ??
    stockImages.heroCar;
  const showcaseCarPrice = showcaseCar ? formatSearchCarDailyPrice(showcaseCar) : null;
  const showcaseDrivers = featuredDrivers.slice(0, 4);

  function applyQuickRange(range: QuickRange) {
    const next = quickRange(range);
    setFrom(next.from);
    setTo(next.to);
    setActiveRange(range);
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-background text-foreground">
      <AppHeader locale={locale} variant="default" />

      {/* ───────── Hero ───────── */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="aurora-blob -left-24 -top-32 h-[28rem] w-[28rem] bg-[#2f8f5b]" />
          <div
            className="aurora-blob right-[-6rem] top-10 h-[24rem] w-[24rem] bg-[#d4a017]"
            style={{ opacity: 0.28, animationDelay: '-6s' }}
          />
          <div
            className="aurora-blob bottom-[-10rem] left-1/3 h-[26rem] w-[26rem] bg-[#1f8a83]"
            style={{ opacity: 0.35, animationDelay: '-11s' }}
          />
          <div className="hero-grid absolute inset-0" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-ink/60" />
        </div>

        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-x-10 lg:gap-y-6 lg:pb-20 lg:pt-14">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {t('home.liveNow')}
              <span className="text-white/40">·</span>
              <span className="text-white/60">{t('home.heroKicker')}</span>
            </span>

            <h1 className="hero-title mt-5 text-white">
              <span className="block">{t('home.heroLead')}</span>
              <span className="block min-h-[1.2em]" aria-live="polite">
                <span key={wordIndex} className="word-swap text-aurora">
                  {POPULAR_PLACES[wordIndex]}
                </span>
                <span className="text-sun">.</span>
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base text-white/70 sm:text-lg">{t('home.heroTagline')}</p>
          </div>

          <div className="relative z-10 min-w-0 lg:order-last lg:col-span-2">
            <div
              role="tablist"
              aria-label={t('home.quickSearch')}
              className="no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur"
            >
              {intentTabs.map(({ id, label, icon: Icon }) => {
                const active = intent === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setIntent(id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
                      active ? 'bg-white text-ink shadow-lg' : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="relative z-10 mt-3">
              <MarketplaceSearchBar
                location={location}
                from={from}
                to={to}
                searchHref={searchHref}
                onLocationChange={(value) => {
                  setLocation(value);
                  setLatitude(null);
                  setLongitude(null);
                }}
                onPlaceSelected={(place) => {
                  setLocation(place.address);
                  setLatitude(place.latitude);
                  setLongitude(place.longitude);
                }}
                onFromChange={(value) => {
                  setFrom(value);
                  setActiveRange(null);
                }}
                onToChange={(value) => {
                  setTo(value);
                  setActiveRange(null);
                }}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {quickRanges.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyQuickRange(id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                    activeRange === id
                      ? 'border-sun bg-sun text-ink'
                      : 'border-white/15 bg-white/5 text-white/75 hover:border-white/40 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Live showcase: real listings floating over the hero */}
          <div className="relative mx-auto hidden h-[26rem] w-full max-w-md lg:block" aria-hidden>
            <div className="float-slow absolute right-0 top-0 w-[85%]">
              <div className="rotate-[3deg] overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-2 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-white/5">
                  <MediaImage src={showcaseCarPhoto} alt="" fill sizes="380px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
                  <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-extrabold text-white">
                        {showcaseCar ? `${showcaseCar.brand} ${showcaseCar.model}` : t('nav.cars')}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs font-medium text-white/75">
                        <MapPin className="h-3 w-3" />
                        {showcaseCar?.locationText ?? 'Kigali'}
                      </p>
                    </div>
                    {showcaseCarPrice ? (
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-ink">
                        {showcaseCarPrice}
                        <span className="font-semibold text-muted-foreground"> {t('listing.perDay')}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="float-slower absolute bottom-0 left-0 w-[68%]">
              <div className="-rotate-[4deg] rounded-[1.75rem] border border-white/15 bg-white p-4 text-ink shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t('home.showcaseDrivers')}
                </p>
                <div className="mt-3 flex items-center">
                  <div className="flex -space-x-3">
                    {(showcaseDrivers.length > 0
                      ? showcaseDrivers.map((d) => ({ id: d.id, name: d.fullName, src: d.profilePhotoUrl }))
                      : stockImages.drivers.map((src, i) => ({ id: String(i), name: 'Driver', src }))
                    ).map((d) => (
                      <InitialsAvatar key={d.id} name={d.name} src={d.src} size={44} className="!border-white" />
                    ))}
                  </div>
                  <span className="ml-3 flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {t('listing.available')}
                  </span>
                </div>
              </div>
            </div>

            <div className="float-slow absolute left-6 top-24 rounded-2xl bg-sun px-4 py-2.5 text-sm font-extrabold text-ink shadow-xl">
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" strokeWidth={2.5} />
                {t('home.showcaseInstant')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Bento browse ───────── */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20">
        <Eyebrow>{t('home.browseEyebrow')}</Eyebrow>
        <div className="mt-5 grid auto-rows-[10.5rem] grid-cols-2 gap-3 sm:gap-4 lg:auto-rows-[12rem] lg:grid-cols-4">
          <Link
            href={`/${locale}/cars`}
            className="group relative col-span-2 row-span-2 overflow-hidden rounded-[2rem] bg-ink"
          >
            <MediaImage
              src={stockImages.heroCar}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover opacity-80 transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
            <BentoLabel title={t('nav.cars')} desc={t('home.browseCarsDesc')} icon={Car} tone="dark" />
          </Link>

          <Link
            href={`/${locale}/drivers`}
            className="group relative col-span-2 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1f4a3f] to-ink p-5 text-white"
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-hill/40 blur-3xl transition group-hover:bg-hill/60" />
            <div className="absolute right-5 top-5 flex -space-x-3">
              {(showcaseDrivers.length > 0
                ? showcaseDrivers.map((d) => ({ id: d.id, name: d.fullName, src: d.profilePhotoUrl }))
                : stockImages.drivers.map((src, i) => ({ id: String(i), name: 'Driver', src }))
              ).map((d) => (
                <InitialsAvatar key={d.id} name={d.name} src={d.src} size={40} className="!border-ink" />
              ))}
            </div>
            <BentoLabel title={t('nav.drivers')} desc={t('home.browseDriversDesc')} icon={UserRound} tone="dark" />
          </Link>

          <Link
            href={`/${locale}/taxi-drivers`}
            className="group relative overflow-hidden rounded-[2rem] bg-sun p-5 text-ink"
          >
            <Truck
              className="absolute -bottom-4 -right-4 h-28 w-28 text-ink/10 transition duration-500 group-hover:-translate-x-2 group-hover:rotate-[-6deg]"
              strokeWidth={1.5}
            />
            <BentoLabel title={t('nav.taxi')} desc={t('home.browseTaxiDesc')} icon={Truck} tone="light" />
          </Link>

          <Link
            href={`/${locale}/airport`}
            className="group relative overflow-hidden rounded-[2rem] border border-border bg-card p-5 text-ink"
          >
            <Plane
              className="absolute -bottom-3 -right-3 h-28 w-28 text-hill/15 transition duration-500 group-hover:-translate-y-2 group-hover:translate-x-1"
              strokeWidth={1.5}
            />
            <BentoLabel title={t('nav.airport')} desc={t('home.browseAirportDesc')} icon={Plane} tone="light" />
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-border bg-card p-3 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary p-1">
            {popularListingTabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPopularListing(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  popularListing === id ? 'bg-ink text-white shadow' : 'text-foreground/70 hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {POPULAR_PLACES.map((city) => (
              <Link
                key={city}
                href={cityHrefForListing(locale, popularListing, city)}
                className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-ink hover:bg-ink hover:text-white"
              >
                <MapPin className="h-3.5 w-3.5 text-hill transition group-hover:text-sun" />
                {city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Featured cars ───────── */}
      {(featuredLoading || featuredCars.length > 0) && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20">
          <HomeSectionHeading
            index="01"
            title={t('nav.cars')}
            href={`/${locale}/cars`}
            actionLabel={t('home.viewAll')}
          />
          <Rail>
            {featuredLoading && featuredCars.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="aspect-[4/3] bg-muted" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                  </div>
                ))
              : featuredCars.map((car) => (
                  <CarListingCard
                    key={car.id}
                    car={car}
                    locale={locale}
                    favorited={carFavorites.ids.has(car.id)}
                    onFavoriteChange={(next) => carFavorites.setFavorited(car.id, next)}
                    showBookCta
                  />
                ))}
          </Rail>
        </section>
      )}

      {/* ───────── Featured drivers ───────── */}
      {(featuredLoading || featuredDrivers.length > 0) && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20">
          <HomeSectionHeading
            index="02"
            title={t('nav.drivers')}
            href={`/${locale}/drivers`}
            actionLabel={t('home.viewAll')}
          />
          <Rail>
            {featuredLoading && featuredDrivers.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-5">
                    <div className="mx-auto h-20 w-20 rounded-full bg-muted" />
                    <div className="mx-auto mt-4 h-4 w-3/4 rounded bg-muted" />
                  </div>
                ))
              : featuredDrivers.map((driver) => (
                  <DriverListingCard
                    key={driver.id}
                    driver={driver}
                    locale={locale}
                    favorited={driverFavorites.ids.has(driver.id)}
                    onFavoriteChange={(next) => driverFavorites.setFavorited(driver.id, next)}
                    showBookCta
                  />
                ))}
          </Rail>
        </section>
      )}

      {/* ───────── How it works ───────── */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="aurora-blob -right-20 -top-24 h-72 w-72 bg-[#2f8f5b]" style={{ opacity: 0.35 }} aria-hidden />
          <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative">
            <Eyebrow tone="dark">{t('home.howEyebrow')}</Eyebrow>
            <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
              {steps.map(({ title, desc, icon: Icon }, i) => (
                <li key={title} className="relative">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-black leading-none text-white/10" aria-hidden>
                      0{i + 1}
                    </span>
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sun ring-1 ring-white/15">
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    {i < steps.length - 1 ? (
                      <span className="hidden h-px flex-1 bg-gradient-to-r from-white/25 to-transparent md:block" />
                    ) : null}
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold">{title}</h3>
                  <p className="mt-1.5 text-sm text-white/65">{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ───────── Featured taxis ───────── */}
      {(featuredLoading || featuredTaxis.length > 0) && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20">
          <HomeSectionHeading
            index="03"
            title={t('nav.taxi')}
            href={`/${locale}/taxi-drivers`}
            actionLabel={t('home.viewAll')}
          />
          <Rail>
            {featuredLoading && featuredTaxis.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-5">
                    <div className="mx-auto h-20 w-20 rounded-full bg-muted" />
                    <div className="mx-auto mt-4 h-4 w-3/4 rounded bg-muted" />
                  </div>
                ))
              : featuredTaxis.map((taxi) => (
                  <TaxiListingCard key={taxi.id} taxi={taxi} locale={locale} showContactCta />
                ))}
          </Rail>
        </section>
      )}

      {/* ───────── Earn with us ───────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sun via-[#e7b93a] to-[#f2d27a] p-6 text-ink sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/30 blur-3xl" aria-hidden />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <Eyebrow tone="sun">{t('home.listWithUs')}</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                {t('home.earnTitle')}
              </h2>
              <p className="mt-3 max-w-md text-ink/75">{t('home.earnSubtitle')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {supply.map(({ href, label, desc, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col justify-between gap-6 rounded-[1.5rem] bg-ink p-5 text-white transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sun">
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    <ArrowUpRight className="h-5 w-5 text-white/40 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-sun" />
                  </div>
                  <div>
                    <p className="font-extrabold">{label}</p>
                    <p className="mt-1 text-sm text-white/60">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}

function Eyebrow({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'dark' | 'sun' }) {
  const styles =
    tone === 'dark'
      ? 'border-white/15 bg-white/5 text-white/70'
      : tone === 'sun'
        ? 'border-ink/15 bg-ink/5 text-ink/70'
        : 'border-border bg-card text-muted-foreground';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${styles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone === 'sun' ? 'bg-ink' : 'bg-sun'}`} />
      {children}
    </span>
  );
}

function BentoLabel({
  title,
  desc,
  icon: Icon,
  tone,
}: {
  title: string;
  desc: string;
  icon: typeof Car;
  tone: 'dark' | 'light';
}) {
  const dark = tone === 'dark';
  return (
    <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <span
          className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
            dark ? 'bg-white/15 text-white backdrop-blur' : 'bg-ink/10 text-ink'
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <p className={`text-xl font-black tracking-tight sm:text-2xl ${dark ? 'text-white' : 'text-ink'}`}>{title}</p>
        <p className={`mt-0.5 line-clamp-2 text-xs font-medium sm:text-sm ${dark ? 'text-white/70' : 'text-ink/65'}`}>
          {desc}
        </p>
      </div>
      <span
        className={`h-10 w-10 shrink-0 items-center justify-center rounded-full transition group-hover:rotate-[-45deg] ${
          dark ? 'flex bg-white text-ink' : 'hidden bg-ink text-white sm:flex'
        }`}
      >
        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
      </span>
    </div>
  );
}

function HomeSectionHeading({
  index,
  title,
  href,
  actionLabel,
}: {
  index: string;
  title: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-black text-sun">{index}</span>
        <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{title}</h2>
      </div>
      <Link
        href={href}
        className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition hover:border-ink hover:bg-ink hover:text-white"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

/** Swipeable rail on phones, grid from tablet up. */
function Rail({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&>*]:w-[78%] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-auto">
      {children}
    </div>
  );
}
