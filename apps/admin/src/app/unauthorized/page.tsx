'use client';

import { SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">Access Denied - Admin only</h1>
      <p className="text-sm text-muted-foreground">
        Your account does not have admin permissions.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <SignOutButton>
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Sign out
          </button>
        </SignOutButton>
        <Link
          href={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
          className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to main app
        </Link>
      </div>
    </main>
  );
}
