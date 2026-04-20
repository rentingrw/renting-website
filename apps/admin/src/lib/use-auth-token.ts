'use client';

import { useCallback, useEffect, useState } from 'react';

// Module-level cache so token is fetched once per page load, not per hook mount
let cachedToken: string | null = null;

export function useAuthToken() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json() as { token: string };
          cachedToken = data.token;
          if (!cancelled) setIsSignedIn(true);
        } else {
          cachedToken = null;
          if (!cancelled) setIsSignedIn(false);
        }
      } catch {
        if (!cancelled) setIsSignedIn(false);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }
    void init();
    return () => { cancelled = true; };
  }, []);

  const fetchToken = useCallback(async (): Promise<string | null> => {
    if (cachedToken) return cachedToken;
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return null;
      const data = await res.json() as { token: string };
      cachedToken = data.token;
      return cachedToken;
    } catch {
      return null;
    }
  }, []);

  return { fetchToken, isLoaded, isSignedIn };
}
