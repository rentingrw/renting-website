'use client';

import { useCallback, useEffect, useState } from 'react';

import { buildAdminProfile, type AdminSessionProfile } from '@/lib/admin-session';

type SessionResponse = {
  token: string;
  email?: string;
  role?: string;
};

// Module-level cache so token is fetched once per page load, not per hook mount
let cachedToken: string | null = null;
let cachedProfile: AdminSessionProfile | null = null;

function applySession(data: SessionResponse) {
  cachedToken = data.token;
  const email = data.email?.trim() ?? '';
  if (email) {
    cachedProfile = buildAdminProfile(email, data.role ?? 'admin');
  }
}

export function clearAdminSessionCache() {
  cachedToken = null;
  cachedProfile = null;
}

export function useAuthToken() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [profile, setProfile] = useState<AdminSessionProfile | null>(cachedProfile);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = (await res.json()) as SessionResponse;
          applySession(data);
          if (!cancelled) {
            setIsSignedIn(true);
            setProfile(cachedProfile);
          }
        } else {
          clearAdminSessionCache();
          if (!cancelled) {
            setIsSignedIn(false);
            setProfile(null);
          }
        }
      } catch {
        if (!cancelled) {
          setIsSignedIn(false);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchToken = useCallback(async (): Promise<string | null> => {
    if (cachedToken) return cachedToken;
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return null;
      const data = (await res.json()) as SessionResponse;
      applySession(data);
      setProfile(cachedProfile);
      return cachedToken;
    } catch {
      return null;
    }
  }, []);

  return { fetchToken, isLoaded, isSignedIn, profile };
}
