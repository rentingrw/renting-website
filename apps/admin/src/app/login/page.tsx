'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
        const body = await res.json().catch(() => ({})) as { message?: string };
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">renting.rw</h1>
          <span className="mt-1 inline-block rounded bg-amber-400 px-2 py-0.5 text-xs font-black uppercase text-neutral-900 border border-amber-600">
            Admin Portal
          </span>
        </div>

        <div className="border-2 border-neutral-900 bg-white rounded-md shadow-brutal p-8">
          <p className="mb-6 text-sm font-semibold text-neutral-600">Sign in with your admin credentials</p>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-bold text-neutral-900">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded border-2 border-neutral-900 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-bold text-neutral-900">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded border-2 border-neutral-900 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {error ? (
              <div className="border-2 border-red-700 bg-red-50 p-3 text-sm font-semibold text-red-700 rounded shadow-brutal-red">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded border-2 border-neutral-900 bg-neutral-900 text-sm font-black text-white shadow-brutal transition-all hover:translate-x-px hover:translate-y-px hover:shadow-brutal-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
