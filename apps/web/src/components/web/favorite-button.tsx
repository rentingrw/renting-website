'use client';

import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
import { Heart } from 'lucide-react';
import { useCallback, useEffect, useState, type MouseEvent, type PointerEvent } from 'react';

import {
  addDriverFavorite,
  addFavorite,
  getDriverFavorites,
  getFavorites,
  removeDriverFavorite,
  removeFavorite,
  syncUser,
} from '@/lib/api';

type FavoriteKind = 'car' | 'driver';

const iconButtonClass =
  'rounded-md border border-border bg-card p-1.5 text-brand shadow-sm transition hover:bg-brand-soft disabled:opacity-60';

function shouldRetrySync(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('not found') || message.includes('sync');
}

export function useFavoriteIds(kind: FavoriteKind) {
  const { isSignedIn, getToken } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSignedIn) {
        setIds(new Set());
        return;
      }
      const token = await getToken();
      if (!token) return;
      try {
        if (kind === 'car') {
          const items = await getFavorites(token);
          if (!cancelled) setIds(new Set(items.map((item) => item.carListing.id)));
        } else {
          const items = await getDriverFavorites(token);
          if (!cancelled) setIds(new Set(items.map((item) => item.driverProfile.id)));
        }
      } catch {
        if (!cancelled) setIds(new Set());
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getToken, isSignedIn, kind]);

  const setFavorited = useCallback((id: string, next: boolean) => {
    setIds((current) => {
      const updated = new Set(current);
      if (next) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  }, []);

  return { ids, setFavorited };
}

type FavoriteButtonProps = {
  kind: FavoriteKind;
  id: string;
  favorited: boolean;
  onChanged?: (next: boolean) => void;
  variant?: 'icon' | 'bar';
  className?: string;
};

export function FavoriteButton({
  kind,
  id,
  favorited,
  onChanged,
  variant = 'icon',
  className,
}: FavoriteButtonProps) {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [pending, setPending] = useState(false);
  const [localFavorited, setLocalFavorited] = useState(favorited);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    setAuthReady(true);
  }, []);

  useEffect(() => {
    setLocalFavorited(favorited);
  }, [favorited]);

  function stopCardNavigation(event: MouseEvent | PointerEvent) {
    event.stopPropagation();
  }

  async function persist(next: boolean, token: string) {
    if (kind === 'car') {
      if (next) await addFavorite(token, id);
      else await removeFavorite(token, id);
    } else if (next) {
      await addDriverFavorite(token, id);
    } else {
      await removeDriverFavorite(token, id);
    }
  }

  async function toggle() {
    if (!isSignedIn) return;
    const token = await getToken();
    if (!token) return;

    const next = !localFavorited;
    setLocalFavorited(next);
    onChanged?.(next);
    setPending(true);
    try {
      await persist(next, token);
    } catch (error) {
      if (shouldRetrySync(error) && user) {
        try {
          await syncUser(token, {
            email: user.primaryEmailAddress?.emailAddress ?? '',
            fullName: user.fullName ?? user.firstName ?? 'User',
            primaryRole: 'renter',
            profilePhotoUrl: user.imageUrl ?? undefined,
          });
          await persist(next, token);
          return;
        } catch {
          // fall through to revert
        }
      }
      setLocalFavorited(!next);
      onChanged?.(!next);
    } finally {
      setPending(false);
    }
  }

  const heart = (
    <Heart className={`h-4 w-4 ${localFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
  );

  if (!authReady) {
    return (
      <button
        type="button"
        className={
          className ??
          (variant === 'bar'
            ? 'flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2 text-sm font-semibold text-foreground'
            : iconButtonClass)
        }
        aria-label="Save favorite"
      >
        {variant === 'bar' ? (
          <span className="flex items-center justify-center gap-2">
            {heart}
            Save to Favorites
          </span>
        ) : (
          heart
        )}
      </button>
    );
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          onClick={stopCardNavigation}
          onPointerDown={stopCardNavigation}
          className={
            className ??
            (variant === 'bar'
              ? 'flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2 text-sm font-semibold text-foreground'
              : iconButtonClass)
          }
          aria-label="Sign in to save favorite"
        >
          {variant === 'bar' ? (
            <span className="flex items-center justify-center gap-2">
              {heart}
              Save to Favorites
            </span>
          ) : (
            heart
          )}
        </button>
      </SignInButton>
    );
  }

  if (variant === 'bar') {
    return (
      <button
        type="button"
        onClick={(event) => {
          stopCardNavigation(event);
          void toggle();
        }}
        disabled={pending}
        className={
          className ??
          `flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-sm font-semibold disabled:opacity-60 ${
            localFavorited
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-border bg-card text-foreground'
          }`
        }
        aria-label={localFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {heart}
        {localFavorited ? 'Saved' : 'Save to Favorites'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        stopCardNavigation(event);
        void toggle();
      }}
      onPointerDown={stopCardNavigation}
      disabled={pending}
      className={className ?? iconButtonClass}
      aria-label={localFavorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={localFavorited}
    >
      {heart}
    </button>
  );
}
