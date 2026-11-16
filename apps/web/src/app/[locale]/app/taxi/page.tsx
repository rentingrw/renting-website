'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DashboardHeader } from '@/components/web/dashboard-header';
import { DashboardNav, resolveDashboardNavKey } from '@/components/web/dashboard-nav';
import { isSupportedLocale, type SupportedLocale } from '@/i18n/routing';
import { MarketplaceVisibilityControl, marketplaceVisibilityFromTaxiStatus } from '@/components/web/marketplace-visibility-control';
import {
  getMe,
  getTaxiDriverMe,
  setTaxiDriverStatus,
  type MeResponse,
  type TaxiDriverMe,
  type TaxiMarketplaceStatus,
} from '@/lib/api';
import { useTranslations } from 'next-intl';

export default function TaxiDashboardPage() {
  const tVis = useTranslations('web.app.marketplaceVisibility');
  const { getToken } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  const rawLocale = Array.isArray(params.locale) ? params.locale[0] : params.locale;
  const locale: SupportedLocale = isSupportedLocale(rawLocale ?? '') ? (rawLocale as SupportedLocale) : 'en';

  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [taxi, setTaxi] = useState<TaxiDriverMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const [me, taxiProfile] = await Promise.all([getMe(token), getTaxiDriverMe(token)]);
      setProfile(me);
      setTaxi(taxiProfile);
      setLoading(false);
    })();
  }, [getToken]);

  async function changeStatus(next: TaxiMarketplaceStatus) {
    const token = await getToken();
    if (!token || !taxi) return;
    setBusy(true);
    setMsg(null);
    try {
      const updated = await setTaxiDriverStatus(token, next);
      setTaxi(updated);
      setMsg('Status updated.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not update status.');
    } finally {
      setBusy(false);
    }
  }

  const marketplaceStatus = taxi ? marketplaceVisibilityFromTaxiStatus(taxi.status) : null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader locale={locale} />
      {profile ? (
        <DashboardNav
          locale={locale}
          roles={profile.roles}
          hasTaxiProfile={profile.hasTaxiProfile}
          hasDriverProfile={profile.hasDriverProfile}
          active={resolveDashboardNavKey(pathname, null, null, 'taxi')}
        />
      ) : null}

      <main className="mx-auto max-w-lg space-y-6 p-4 md:p-8">
        <div>
          <h1 className="text-xl font-bold text-foreground">My taxi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Control visibility in taxi search.</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !taxi ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">You have not registered as a taxi driver yet.</p>
            <Link
              href={`/${locale}/onboard/taxi`}
              className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              Register as taxi
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold text-foreground">{taxi.fullName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{taxi.workLocationText ?? taxi.city}</p>
              <p className="mt-2 text-xs text-muted-foreground capitalize">Current: {taxi.status.replace(/_/g, ' ')}</p>
            </div>

            {marketplaceStatus ? (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{tVis('sectionTitle')}</p>
                <p className="text-xs text-muted-foreground">{tVis('hint')}</p>
                <MarketplaceVisibilityControl
                  value={marketplaceStatus}
                  disabled={busy}
                  onChange={(next) => void changeStatus(next as TaxiMarketplaceStatus)}
                />
                {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Visibility controls appear once your taxi profile is active in search.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/${locale}/onboard/taxi`}
                className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Edit profile
              </Link>
              <Link
                href={`/${locale}/taxi-drivers/${taxi.id}`}
                className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                View public page
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
