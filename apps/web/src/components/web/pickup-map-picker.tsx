'use client';

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';

import { geocode, reverseGeocode } from '@/lib/geocoding';

type PickupMapPickerProps = {
  address: string;
  onAddressChange: (address: string) => void;
  loadingLabel: string;
  hintLabel: string;
};

const KIGALI = { lat: -1.9441, lng: 30.0619 };

export function PickupMapPicker({ address, onAddressChange, loadingLabel, hintLabel }: PickupMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAddressFromCoords = useCallback(
    (lat: number, lng: number) => {
      reverseGeocode(lat, lng)
        .then((r) => onAddressChange(r.displayName))
        .catch(() => {});
    },
    [onAddressChange],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let disposed = false;

    async function init() {
      const L = (await import('leaflet')).default;
      if (disposed || !containerRef.current) return;

      // Fix default marker icon paths (broken by webpack/bundlers)
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, { attributionControl: false }).setView(
        [KIGALI.lat, KIGALI.lng],
        12,
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      const marker = L.marker([KIGALI.lat, KIGALI.lng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        updateAddressFromCoords(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        updateAddressFromCoords(e.latlng.lat, e.latlng.lng);
      });

      markerRef.current = marker;
      mapRef.current = map;
      setReady(true);
    }
    init().catch((err) => {
      if (!disposed) setError(err instanceof Error ? err.message : 'Map failed to load.');
    });
    return () => {
      disposed = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [updateAddressFromCoords]);

  useEffect(() => {
    if (!ready || !address.trim() || !markerRef.current || !mapRef.current) return;
    geocode(address)
      .then((r) => {
        if (markerRef.current && mapRef.current) {
          markerRef.current.setLatLng([r.latitude, r.longitude]);
          mapRef.current.setView([r.latitude, r.longitude], 14);
        }
      })
      .catch(() => {});
  }, [address, ready]);

  if (error) {
    return <div className="rounded-md border p-3 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="h-44 w-full rounded-md border" />
      {!ready ? (
        <p className="text-xs text-muted-foreground">{loadingLabel}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{hintLabel}</p>
      )}
    </div>
  );
}
