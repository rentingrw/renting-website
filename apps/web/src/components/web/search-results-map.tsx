'use client';

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';

import { geocode, type GeocodeResult } from '@/lib/geocoding';

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
  kind?: 'car' | 'driver';
};

type SearchResultsMapProps = {
  centerHint: string;
  centerLatitude?: number;
  centerLongitude?: number;
  results: MapResult[];
  activeId: string | null;
  onActiveChange: (id: string) => void;
  emptyLabel: string;
  loadingLabel: string;
};

const KIGALI = { lat: -1.9441, lng: 30.0619 };

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function buildPopupHtml(item: MapResult): string {
  const photoHtml = item.photo
    ? `<img src="${escapeHtml(item.photo)}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:8px;" loading="lazy" />`
    : '';
  const kindBadge = item.kind
    ? `<span style="display:inline-block;background:${item.kind === 'car' ? '#ccfbf1' : '#e0f2fe'};color:${item.kind === 'car' ? '#0f766e' : '#0369a1'};font-size:10px;font-weight:600;padding:2px 6px;border-radius:99px;margin-bottom:6px;text-transform:uppercase;">${item.kind === 'car' ? 'Car' : 'Driver'}</span>`
    : '';
  return [
    '<div style="min-width:200px;max-width:220px;font-family:system-ui,sans-serif;">',
    photoHtml,
    kindBadge,
    `<p style="font-weight:700;font-size:14px;color:#111827;margin:0 0 2px;">${escapeHtml(item.label)}</p>`,
    `<p style="font-size:12px;color:#6b7280;margin:0 0 4px;">${escapeHtml(item.address)}</p>`,
    item.priceLabel
      ? `<p style="font-size:13px;font-weight:600;color:#0d9488;margin:0 0 8px;">${escapeHtml(item.priceLabel)}</p>`
      : '',
    `<a href="${escapeHtml(item.href)}" style="display:inline-block;background:#0d9488;color:#fff;font-size:12px;font-weight:600;padding:6px 14px;border-radius:6px;text-decoration:none;">View listing</a>`,
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

  const buildIcon = useCallback(
    (item: MapResult, isActive: boolean) => {
      if (typeof window === 'undefined') return undefined;
      const L = window.L as typeof import('leaflet');
      const bg = isActive ? '#0d9488' : '#ffffff';
      const border = item.kind === 'driver' ? '#0369a1' : '#0d9488';
      const color = isActive ? '#ffffff' : (item.kind === 'driver' ? '#0369a1' : '#0d9488');
      const label = item.priceLabel ?? item.label.slice(0, 10);
      return L.divIcon({
        html: `<div style="background:${bg};border:2px solid ${border};color:${color};border-radius:20px;padding:4px 10px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.18);cursor:pointer;">${escapeHtml(label)}</div>`,
        className: '',
        iconSize: undefined,
        iconAnchor: [0, 0],
      });
    },
    [],
  );

  const addMarker = useCallback(
    (item: MapResult, lat: number, lng: number) => {
      if (!mapRef.current || typeof window === 'undefined') return;
      const L = window.L as typeof import('leaflet');
      const isActive = item.id === activeId;
      const icon = buildIcon(item, isActive);
      const marker = L.marker([lat, lng], {
        title: item.label,
        zIndexOffset: isActive ? 999 : 0,
        icon,
      })
        .addTo(mapRef.current)
        .bindPopup(buildPopupHtml(item), { maxWidth: 240 })
        .on('click', () => {
          onActiveChange(item.id);
        });
      markersRef.current.set(item.id, { marker, lat, lng });
      if (isActive) marker.openPopup();
      return marker;
    },
    [activeId, buildIcon, onActiveChange],
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
      } else if (centerHint.trim()) {
        geocode(centerHint)
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
        geocode(item.address)
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

  // Update active marker icon + pan to it
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

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {!mapReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-sm text-gray-600">
          {loadingLabel}
        </div>
      ) : null}
      {mapReady && !results.length ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-white/95 px-4 py-2 text-xs text-gray-600 shadow-md">
          {emptyLabel}
        </div>
      ) : null}
    </>
  );
}
