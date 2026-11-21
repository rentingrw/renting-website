'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { buildAdminProfile, type AdminSessionProfile } from '@/lib/admin-session';

type SessionResponse = {
  token: string;
  email?: string;
  role?: string;
};

// Module-level cache so token is fetched once per page load, not per hook mount
let cachedToken: string | null = null;
let cachedProfile: AdminSessionProfile | null = null;

type AuthSnapshot = {
  isLoaded: boolean;
  isSignedIn: boolean;
  profile: AdminSessionProfile | null;
};

let authSnapshot: AuthSnapshot = {
  isLoaded: false,
  isSignedIn: false,
  profile: null,
};

let sessionInitPromise: Promise<void> | null = null;
const authListeners = new Set<() => void>();

function emitAuthChange() {
  for (const listener of authListeners) {
    listener();
  }
}

function applySession(data: SessionResponse) {
  cachedToken = data.token;
  const email = data.email?.trim() ?? '';
  if (email) {
    cachedProfile = buildAdminProfile(email, data.role ?? 'admin');
    authSnapshot.profile = cachedProfile;
  }
}

function setAuthSnapshot(patch: Partial<AuthSnapshot>) {
  authSnapshot = { ...authSnapshot, ...patch };
  emitAuthChange();
}

function subscribeAuth(listener: () => void) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function getAuthSnapshot() {
  return authSnapshot;
}

function ensureSessionInit(): Promise<void> {
  if (sessionInitPromise) return sessionInitPromise;

  sessionInitPromise = (async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = (await res.json()) as SessionResponse;
        applySession(data);
        setAuthSnapshot({ isSignedIn: true, isLoaded: true });
      } else {
        clearAdminSessionCache();
        setAuthSnapshot({ isSignedIn: false, isLoaded: true, profile: null });
      }
    } catch {
      setAuthSnapshot({ isSignedIn: false, isLoaded: true, profile: null });
    }
  })();

  return sessionInitPromise;
}

export function clearAdminSessionCache() {
  cachedToken = null;
  cachedProfile = null;
  sessionInitPromise = null;
  authSnapshot = { isLoaded: false, isSignedIn: false, profile: null };
  emitAuthChange();
}

export function useAuthToken() {
  const { isLoaded, isSignedIn, profile } = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getAuthSnapshot,
  );

  useEffect(() => {
    void ensureSessionInit();
  }, []);

  const fetchToken = useCallback(async (): Promise<string | null> => {
    await ensureSessionInit();
    if (cachedToken) return cachedToken;
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return null;
      const data = (await res.json()) as SessionResponse;
      applySession(data);
      setAuthSnapshot({ isSignedIn: true, isLoaded: true });
      return cachedToken;
    } catch {
      return null;
    }
  }, []);

  return { fetchToken, isLoaded, isSignedIn, profile };
}