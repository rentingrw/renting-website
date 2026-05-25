'use client';

import { Locate, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    searchAutocomplete(query)
      .then((results) => {
        setSuggestions(results);
        setOpen(results.length > 0);
      })
      .catch(() => {
        setSuggestions([]);
        setOpen(false);
      });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      fetchSuggestions(value);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (r: AutocompleteResult) => {
      onChange(r.displayName);
      setOpen(false);
      setSuggestions([]);
      if (onPlaceSelected) {
        onPlaceSelected({ address: r.displayName, latitude: r.latitude, longitude: r.longitude });
      }
    },
    [onChange, onPlaceSelected],
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
          onChange(result.displayName);
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
  }, [onChange, onPlaceSelected]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
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
                ? 'text-zinc-400 hover:text-white disabled:opacity-40'
                : 'text-neutral-400 hover:text-teal-600 disabled:opacity-40'
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
      {open && suggestions.length > 0 ? (
        <ul
          className={`absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-auto rounded-md border shadow-lg ${
            dark ? 'border-zinc-700 bg-zinc-800' : 'bg-background'
          }`}
        >
          {suggestions.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm ${
                  dark ? 'text-white hover:bg-zinc-700' : 'hover:bg-muted'
                }`}
                onClick={() => handleSelect(r)}
              >
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
