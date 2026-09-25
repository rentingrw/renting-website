'use client';

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';

import { geocode, type GeocodeResult } from '@/lib/geocoding';

export type MapPinKind = 'car' | 'driver' | 'taxi';

export type MapResult = {
  id: string;
  label: string;
  address: string;
  description?: string | null;
  photo?: string | null;
  priceLabel?: string | null;
  href: string;
  latitude?: number | null;
  longitude?: number | null;
  kind?: MapPinKind;
};

type SearchResultsMapProps = {
  centerHint?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  results: MapResult[];
  activeId: string | null;
  onActiveChange: (id: string) => void;
  emptyLabel: string;
  loadingLabel: string;
  viewDetailsLabel?: string;
  kindLabels?: Partial<Record<MapPinKind, string>>;
  legendLabels?: Partial<Record<MapPinKind, string>>;
};

const KIGALI = { lat: -1.9441, lng: 30.0619 };

const PIN_COLORS: Record<MapPinKind, { fill: string; ring: string }> = {
  car: { fill: '#22c55e', ring: '#166534' },
  driver: { fill: '#3b82f6', ring: '#1e40af' },
  taxi: { fill: '#ef4444', ring: '#991b1b' },
};

const PIN_LETTER: Record<MapPinKind, string> = {
  car: 'C',
  driver: 'D',
  taxi: 'T',
};

const geocodeCache = new Map<string, Promise<GeocodeResult>>();

function geocodeCached(query: string): Promise<GeocodeResult> {
  const key = query.trim().toLowerCase();
  const existing = geocodeCache.get(key);
  if (existing) return existing;
  const pending = geocode(query).catch((err) => {
    geocodeCache.delete(key);
    throw err;
  });
  geocodeCache.set(key, pending);
  return pending;
}

function pinKind(item: MapResult): MapPinKind {
  return item.kind ?? 'car';
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function hashJitter(id: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return {
    lat: ((hash % 17) - 8) * 0.00028,
    lng: (((hash >> 4) % 17) - 8) * 0.00028,
  };
}

function buildPopupHtml(
  item: MapResult,
  viewDetailsLabel: string,
  kindLabels: Partial<Record<MapPinKind, string>>,
): string {
  const kind = pinKind(item);
  const colors = PIN_COLORS[kind];
  const kindName = kindLabels[kind] ?? kind;
  const photoHtml = item.photo
    ? `<img src="${escapeHtml(item.photo)}" alt="" style="width:100%;height:84px;object-fit:cover;border-radius:8px;margin-bottom:8px;" loading="lazy" />`
    : '';
  const shortInfo = item.description || item.priceLabel || '';
  return [
    '<div style="min-width:210px;max-width:240px;font-family:system-ui,sans-serif;">',
    photoHtml,
    `<span style="display:inline-block;background:${colors.fill}1a;color:${colors.ring};font-size:10px;font-weight:800;letter-spacing:.04em;padding:2px 7px;border-radius:99px;margin-bottom:6px;text-transform:uppercase;">${escapeHtml(kindName)}</span>`,
    `<p style="font-weight:800;font-size:14px;color:#111827;margin:0 0 4px;">${escapeHtml(item.label)}</p>`,
    `<p style="font-size:12px;color:#4b5563;margin:0 0 4px;">${escapeHtml(item.address)}</p>`,
    shortInfo
      ? `<p style="font-size:12px;color:#374151;margin:0 0 10px;">${escapeHtml(shortInfo)}</p>`
      : '',
    `<a href="${escapeHtml(item.href)}" style="display:inline-block;background:${colors.fill};color:#fff;font-size:12px;font-weight:700;padding:7px 14px;border-radius:8px;text-decoration:none;">${escapeHtml(viewDetailsLabel)}</a>`,
    '</div>',
  ].join('');
}

export function SearchResultsMap({
  centerHint,
  centerLatitude,
  centerLongitude,
  results,
  activeId,
  onActiveChange,
  emptyLabel,
  loadingLabel,
  viewDetailsLabel = 'View details',
  kindLabels = { car: 'Car', driver: 'Driver', taxi: 'Taxi' },
  legendLabels = { car: 'Cars', driver: 'Drivers', taxi: 'Taxis' },
}: SearchResultsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, { marker: L.Marker; lat: number; lng: number }>>(new Map());
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const handleMapError = useCallback((err: unknown) => {
    setMapError(err instanceof Error ? err.message : 'Map failed to load.');
  }, []);

  const prioritizedResults = useMemo(
    () => [...results].sort((a, b) => (a.id === activeId ? -1 : b.id === activeId ? 1 : 0)),
    [activeId, results],
  );

  const buildIcon = useCallback((item: MapResult, isActive: boolean) => {
    if (typeof window === 'undefined') return undefined;
    const L = window.L as typeof import('leaflet');
    const kind = pinKind(item);
    const colors = PIN_COLORS[kind];
    const size = isActive ? 34 : 26;
    const letter = PIN_LETTER[kind];
    return L.divIcon({
      html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
        <div style="width:${size}px;height:${size}px;background:${colors.fill};border:3px solid ${isActive ? '#ffffff' : colors.ring};border-radius:50%;color:#fff;font-size:${isActive ? 13 : 11}px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.28);">${letter}</div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${colors.fill};margin-top:-1px;"></div>
      </div>`,
      className: 'renting-map-pin',
      iconSize: [size, size + 8],
      iconAnchor: [0, size + 8],
    });
  }, []);

  const addMarker = useCallback(
    (item: MapResult, lat: number, lng: number) => {
      if (!mapRef.current || typeof window === 'undefined') return;
      const L = window.L as typeof import('leaflet');
      const isActive = item.id === activeId;
      const icon = buildIcon(item, isActive);
      const jittered = pinKind(item) === 'car' ? { lat, lng } : { lat: lat + hashJitter(item.id).lat, lng: lng + hashJitter(item.id).lng };
      const marker = L.marker([jittered.lat, jittered.lng], {
        title: item.label,
        zIndexOffset: isActive ? 999 : 0,
        icon,
      })
        .addTo(mapRef.current)
        .bindPopup(buildPopupHtml(item, viewDetailsLabel, kindLabels), { maxWidth: 260 })
        .on('click', () => {
          onActiveChange(item.id);
        });
      markersRef.current.set(item.id, { marker, lat: jittered.lat, lng: jittered.lng });
      if (isActive) marker.openPopup();
      return marker;
    },
    [activeId, buildIcon, kindLabels, onActiveChange, viewDetailsLabel],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let disposed = false;

    async function init() {
      const L = (await import('leaflet')).default;
      if (disposed || !containerRef.current) return;

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, { attributionControl: false }).setView(
        [KIGALI.lat, KIGALI.lng],
        11,
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      mapRef.current = map;
      setMapReady(true);

      if (centerLatitude != null && centerLongitude != null) {
        map.setView([centerLatitude, centerLongitude], 12);
      } else if (centerHint?.trim()) {
        geocodeCached(centerHint)
          .then((r: GeocodeResult) => {
            if (!disposed && mapRef.current) mapRef.current.setView([r.latitude, r.longitude], 12);
          })
          .catch(() => {});
      }
    }
    init().catch(handleMapError);
    return () => {
      disposed = true;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [centerHint, centerLatitude, centerLongitude, handleMapError]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || typeof window === 'undefined') return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();
    if (!prioritizedResults.length) return;

    const bounds: [number, number][] = [];
    let resolved = 0;
    const total = prioritizedResults.length;

    function maybeFitBounds() {
      resolved++;
      if (resolved >= total && mapRef.current && bounds.length > 0) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }

    prioritizedResults.forEach((item) => {
      const lat = item.latitude != null ? Number(item.latitude) : NaN;
      const lng = item.longitude != null ? Number(item.longitude) : NaN;

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        addMarker(item, lat, lng);
        bounds.push([lat, lng]);
        maybeFitBounds();
      } else {
        geocodeCached(item.address)
          .then((r) => {
            if (mapRef.current) {
              addMarker(item, r.latitude, r.longitude);
              bounds.push([r.latitude, r.longitude]);
            }
            maybeFitBounds();
          })
          .catch(() => maybeFitBounds());
      }
    });
  }, [addMarker, mapReady, prioritizedResults]);

  useEffect(() => {
    if (!mapReady || typeof window === 'undefined') return;
    markersRef.current.forEach(({ marker }, id) => {
      const item = results.find((r) => r.id === id);
      if (!item) return;
      const isActive = id === activeId;
      const icon = buildIcon(item, isActive);
      if (icon) marker.setIcon(icon);
      marker.setZIndexOffset(isActive ? 999 : 0);
      if (isActive) {
        marker.openPopup();
        const { lat, lng } = markersRef.current.get(id) ?? {};
        if (lat != null && lng != null && mapRef.current) {
          mapRef.current.panTo([lat, lng], { animate: true });
        }
      }
    });
  }, [activeId, buildIcon, mapReady, results]);

  if (mapError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-red-600">
        {mapError}
      </div>
    );
  }

  const visibleKinds = new Set(results.map((item) => pinKind(item)));

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {!mapReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-sm text-neutral-600">
          {loadingLabel}
        </div>
      ) : null}
      {mapReady && !results.length ? (
        <div className="absolute bottom-4 left-1/2 z-[400] -translate-x-1/2 rounded-lg bg-white/95 px-4 py-2 text-xs text-neutral-600 shadow-md">
          {emptyLabel}
        </div>
      ) : null}
      {mapReady && results.length ? (
        <div className="absolute bottom-4 left-4 z-[400] flex flex-col gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-neutral-800 shadow-md">
          {(['car', 'driver', 'taxi'] as MapPinKind[])
            .filter((kind) => visibleKinds.has(kind))
            .map((kind) => (
              <span key={kind} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: PIN_COLORS[kind].fill }}
                />
                {legendLabels[kind] ?? kind}
              </span>
            ))}
        </div>
      ) : null}
    </>
  );
}
