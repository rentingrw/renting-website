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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">Access Denied</h1>
      <p className="text-sm text-muted-foreground">
        Your account does not have admin permissions.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Sign out
        </button>
        <Link
          href={process.env.NEXT_PUBLIC_APP_URL ?? 'https://renting.rw'}
          className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to renting.rw
        </Link>
      </div>
    </main>
  );
}
