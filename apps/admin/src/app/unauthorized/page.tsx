'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { adminBtnPrimary, adminBtnSecondary } from '@/components/admin/admin-ui';

export default function UnauthorizedPage() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background bg-hills p-6">
      <div className="admin-panel w-full max-w-md p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Renting.rw</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Access denied</h1>
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          This account does not have admin permissions for the marketplace console.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className={adminBtnSecondary}
          >
            Sign out
          </button>
          <Link
            href={process.env.NEXT_PUBLIC_APP_URL ?? 'https://renting.rw'}
            className={adminBtnPrimary}
          >
            Back to renting.rw
          </Link>
        </div>
      </div>
    </main>
  );
}
