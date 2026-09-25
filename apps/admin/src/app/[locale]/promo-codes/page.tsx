'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createAdminPromoCode,
  deleteAdminPromoCode,
  listAdminPromoCodes,
  updateAdminPromoCode,
  type AdminPromoCode,
} from '@/lib/api';
import { useAuthToken } from '@/lib/use-auth-token';
import { TableRowSkeleton } from '@/components/ui/skeleton';

const AUTH_ERROR_MSG = 'Session not ready. Please refresh the page or sign out and sign in again.';
const inputClass = 'h-9 rounded border-2 border-neutral-900 bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400';

export default function AdminPromoCodesPage() {
  const { fetchToken, isLoaded, isSignedIn } = useAuthToken();
  const [items, setItems] = useState<AdminPromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [kind, setKind] = useState('');
  const [discountPercent, setDiscountPercent] = useState('100');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      setItems(await listAdminPromoCodes(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load promo codes.');
    } finally {
      setLoading(false);
    }
  }, [fetchToken, isLoaded, isSignedIn]);

  useEffect(() => { void load(); }, [load]);

  const onCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      const percent = Number(discountPercent);
      await createAdminPromoCode(token, {
        code,
        ...(kind ? { kind: kind as 'hoster' | 'driver' | 'taxi' } : {}),
        discountPercent: Number.isFinite(percent) ? percent : 100,
        ...(maxRedemptions ? { maxRedemptions: Number(maxRedemptions) } : {}),
      });
      setCode('');
      setMaxRedemptions('');
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create promo code.');
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (item: AdminPromoCode) => {
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await updateAdminPromoCode(token, item.id, { isActive: !item.isActive });
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update promo code.');
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this promo code?')) return;
    try {
      const token = await fetchToken();
      if (!token) throw new Error(AUTH_ERROR_MSG);
      await deleteAdminPromoCode(token, id);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete promo code.');
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Promo codes</h1>
        <p className="text-sm font-medium text-neutral-500">
          Full waiver is 100 percent. Codes work for hoster, driver, and taxi plans.
        </p>
      </header>

      <section className="rounded-md border-2 border-neutral-900 bg-white p-4 shadow-brutal">
        <div className="grid gap-2 md:grid-cols-5">
          <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" />
          <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">All providers</option>
            <option value="hoster">Hoster</option>
            <option value="driver">Driver</option>
            <option value="taxi">Taxi</option>
          </select>
          <input className={inputClass} value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="Percent (100 = free)" />
          <input className={inputClass} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="Max uses (optional)" />
          <button
            type="button"
            disabled={saving || !code.trim()}
            onClick={() => void onCreate()}
            className="h-9 rounded border-2 border-neutral-900 bg-amber-400 px-4 text-sm font-black text-neutral-900 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded border-2 border-red-700 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-md border-2 border-neutral-900 bg-white shadow-brutal">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="bg-neutral-900 text-white">
              <th className="px-4 py-3 text-xs font-black uppercase">Code</th>
              <th className="px-4 py-3 text-xs font-black uppercase">Kind</th>
              <th className="px-4 py-3 text-xs font-black uppercase">Discount</th>
              <th className="px-4 py-3 text-xs font-black uppercase">Uses</th>
              <th className="px-4 py-3 text-xs font-black uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-black uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center font-semibold text-neutral-400" colSpan={6}>
                  No promo codes yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-neutral-200">
                  <td className="px-4 py-3 font-black">{item.code}</td>
                  <td className="px-4 py-3">{item.kind ?? 'all'}</td>
                  <td className="px-4 py-3">
                    {item.discountPercent != null ? `${item.discountPercent}%` : `${item.discountRwf ?? 0} RWF`}
                  </td>
                  <td className="px-4 py-3">
                    {item.redemptionCount}{item.maxRedemptions != null ? ` / ${item.maxRedemptions}` : ''}
                  </td>
                  <td className="px-4 py-3">{item.isActive ? 'active' : 'off'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button type="button" className="font-bold underline" onClick={() => void onToggle(item)}>
                      {item.isActive ? 'Turn off' : 'Turn on'}
                    </button>
                    <button type="button" className="font-bold text-red-700 underline" onClick={() => void onDelete(item.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
