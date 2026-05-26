'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

import { getMe, syncUser } from '@/lib/api';

export function UserSync() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const synced = useRef(false);

  useEffect(() => {
    if (!isSignedIn || !user || synced.current) return;

    async function ensureUserExists() {
      try {
        const token = await getToken();
        if (!token) return;

        const me = await getMe(token);
        if (me) {
          synced.current = true;
          return;
        }

        await syncUser(token, {
          email: user!.primaryEmailAddress?.emailAddress ?? '',
          fullName: user!.fullName ?? user!.firstName ?? 'User',
          primaryRole: 'renter',
          profilePhotoUrl: user!.imageUrl ?? undefined,
        });
        synced.current = true;
      } catch {
        // silently ignore — booking dialog handles sync errors
      }
    }

    void ensureUserExists();
  }, [isSignedIn, user, getToken]);

  return null;
}
