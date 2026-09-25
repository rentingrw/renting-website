'use client';

import { Locate, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type AddressInputProps = {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (place: { address: string; latitude: number; longitude: number }) => void;
  placeholder?: string;
  className?: string;
  dark?: boolean;
  showLocateMe?: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type AutocompleteResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

type MenuRect = {
  top: number;
  left: number;
  width: number;
};

async function reverseGeocode(lat: number, lon: number): Promise<AutocompleteResult | null> {
  try {
    const res = await fetch(
      `${API_BASE}/geocode/reverse?lat=${lat}&lon=${lon}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    return (await res.json()) as AutocompleteResult;
  } catch {
    return null;
  }
}

async function searchAutocomplete(q: string): Promise<AutocompleteResult[]> {
  if (!q.trim() || q.length < 2) return [];
  try {
    const res = await fetch(
      `${API_BASE}/geocode/autocomplete?q=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return [];
    return (await res.json()) as AutocompleteResult[];
  } catch {
    return [];
  }
}

function samePlace(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function AddressInput({
  value,
  onChange,
  onPlaceSelected,
  placeholder,
  className,
  dark,
  showLocateMe = false,
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<MenuRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typedSinceFocusRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuRect = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setMenuRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 220),
    });
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setSuggestions([]);
  }, []);

  const fetchSuggestions = useCallback((query: string) => {
    if (!typedSinceFocusRef.current) {
      closeMenu();
      return;
    }
    if (!query.trim() || query.length < 2) {
      closeMenu();
      return;
    }
    searchAutocomplete(query)
      .then((results) => {
        if (!typedSinceFocusRef.current) {
          closeMenu();
          return;
        }
        const next = results.filter((item) => !samePlace(item.displayName, query));
        setSuggestions(next);
        setOpen(next.length > 0);
        if (next.length > 0) updateMenuRect();
      })
      .catch(() => {
        closeMenu();
      });
  }, [closeMenu, updateMenuRect]);

  useEffect(() => {
    if (!focused || !typedSinceFocusRef.current) {
      closeMenu();
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      fetchSuggestions(value);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, focused, fetchSuggestions, closeMenu]);

  useEffect(() => {
    if (!open) return;
    updateMenuRect();
    function handleViewportChange() {
      updateMenuRect();
    }
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [open, updateMenuRect]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setFocused(false);
      typedSinceFocusRef.current = false;
      closeMenu();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeMenu]);

  const handleSelect = useCallback(
    (r: AutocompleteResult) => {
      typedSinceFocusRef.current = false;
      onChange(r.displayName);
      closeMenu();
      setFocused(false);
      inputRef.current?.blur();
      if (onPlaceSelected) {
        onPlaceSelected({ address: r.displayName, latitude: r.latitude, longitude: r.longitude });
      }
    },
    [onChange, onPlaceSelected, closeMenu],
  );

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocateError('Geolocation not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        if (result) {
          typedSinceFocusRef.current = false;
          onChange(result.displayName);
          closeMenu();
          if (onPlaceSelected) {
            onPlaceSelected({ address: result.displayName, latitude: result.latitude, longitude: result.longitude });
          }
        } else {
          setLocateError('Could not determine your address. Try typing it.');
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocateError('Location access denied. Please allow it in browser settings.');
        } else {
          setLocateError('Could not get your location. Try typing it.');
        }
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }, [onChange, onPlaceSelected, closeMenu]);

  const showMenu = mounted && open && focused && suggestions.length > 0 && menuRect;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            typedSinceFocusRef.current = true;
            onChange(e.target.value);
          }}
          onFocus={() => {
            typedSinceFocusRef.current = false;
            setFocused(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`${className ?? ''} ${showLocateMe ? 'pr-9' : ''}`}
        />
        {showLocateMe && (
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            title="Use my current location"
            className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors ${
              dark
                ? 'text-zinc-400 hover:text-foreground disabled:opacity-40'
                : 'text-muted-foreground hover:text-brand disabled:opacity-40'
            }`}
          >
            {locating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Locate className="h-4 w-4" />
            }
          </button>
        )}
      </div>
      {locateError && (
        <p className={`mt-1 text-xs ${dark ? 'text-red-400' : 'text-red-600'}`}>{locateError}</p>
      )}
      {showMenu
        ? createPortal(
            <ul
              ref={listRef}
              role="listbox"
              className="fixed z-[10000] max-h-56 overflow-auto rounded-xl border border-border bg-white py-1 shadow-card"
              style={{
                top: menuRect.top,
                left: menuRect.left,
                width: menuRect.width,
              }}
            >
              {suggestions.map((r, i) => (
                <li key={`${r.displayName}-${i}`} role="option">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-foreground/80 hover:bg-muted hover:text-foreground"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(r)}
                  >
                    {r.displayName}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
