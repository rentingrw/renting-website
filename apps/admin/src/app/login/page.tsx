'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminBtnPrimary, adminInput } from '@/components/admin/admin-ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'Login failed.');
        return;
      }
      router.push('/en');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-[44%] overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="aurora-blob -left-20 -top-16 h-72 w-72 bg-[#2f8f5b]" style={{ opacity: 0.4 }} />
          <div className="aurora-blob bottom-0 right-0 h-64 w-64 bg-[#d4a017]" style={{ opacity: 0.2 }} />
          <div className="admin-sidebar-grid absolute inset-0 opacity-90" />
        </div>
        <div className="relative">
          <p className="text-3xl font-black tracking-tight">
            Renting<span className="text-sun">.rw</span>
          </p>
          <span className="mt-3 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
            Admin portal
          </span>
        </div>
        <div className="relative max-w-sm">
          <p className="text-2xl font-black leading-snug">Run the marketplace from one desk.</p>
          <p className="mt-3 text-sm font-medium text-white/70">
            Cars, drivers, taxi, bookings, disputes, banners, and careers — same look and tools as renting.rw.
          </p>
        </div>
        <p className="relative text-xs text-white/40">CARIRWA LTD · Internal use only</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <p className="text-2xl font-black tracking-tight text-ink">
              Renting<span className="text-sun">.rw</span>
            </p>
            <span className="mt-2 inline-block rounded-full bg-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              Admin
            </span>
          </div>

          <div className="admin-panel p-8">
            <p className="mb-6 text-sm font-semibold text-muted-foreground">Sign in with your admin credentials</p>

            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-bold text-ink">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`h-11 ${adminInput}`}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-bold text-ink">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`h-11 ${adminInput}`}
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              <button type="submit" disabled={loading} className={`mt-2 h-11 w-full ${adminBtnPrimary}`}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
