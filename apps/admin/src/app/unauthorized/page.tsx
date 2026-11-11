'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background bg-hills p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Renting.rw</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Access denied</h1>
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          This account does not have admin permissions for the marketplace console.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-ink transition hover:bg-brand-soft"
          >
            Sign out
          </button>
          <Link
            href={process.env.NEXT_PUBLIC_APP_URL ?? 'https://renting.rw'}
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-hover"
          >
            Back to renting.rw
          </Link>
        </div>
      </div>
    </main>
  );
}
