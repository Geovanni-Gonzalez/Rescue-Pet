import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons broken by webpack/vite bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Costa Rica bounding box
const CR_BOUNDS = { minLat: 8.0, maxLat: 11.2, minLng: -85.9, maxLng: -82.6 };

function isOutsideCR(lat: number, lng: number): boolean {
  return lat < CR_BOUNDS.minLat || lat > CR_BOUNDS.maxLat || lng < CR_BOUNDS.minLng || lng > CR_BOUNDS.maxLng;
}

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ latitude, longitude, onLocationChange }: LocationPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const defaultCenter: [number, number] = latitude && longitude
    ? [latitude, longitude]
    : [9.93, -84.08]; // San José, Costa Rica

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(defaultCenter, latitude ? 13 : 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (latitude && longitude) {
      const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onLocationChange(Math.round(pos.lat * 1e6) / 1e6, Math.round(pos.lng * 1e6) / 1e6);
      });
      markerRef.current = marker;
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const roundedLat = Math.round(lat * 1e6) / 1e6;
      const roundedLng = Math.round(lng * 1e6) / 1e6;

      if (markerRef.current) {
        markerRef.current.setLatLng([roundedLat, roundedLng]);
      } else {
        const marker = L.marker([roundedLat, roundedLng], { draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onLocationChange(Math.round(pos.lat * 1e6) / 1e6, Math.round(pos.lng * 1e6) / 1e6);
        });
        markerRef.current = marker;
      }
      onLocationChange(roundedLat, roundedLng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker when props change externally
  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const marker = L.marker([latitude, longitude], { draggable: true }).addTo(mapRef.current);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onLocationChange(Math.round(pos.lat * 1e6) / 1e6, Math.round(pos.lng * 1e6) / 1e6);
      });
      markerRef.current = marker;
    }
  }, [latitude, longitude, onLocationChange]);

  const isOutside = latitude && longitude ? isOutsideCR(latitude, longitude) : false;

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full rounded-md border border-border overflow-hidden"
        style={{ height: '260px' }}
      />
      {isOutside && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          ⚠️ Las coordenadas parecen estar fuera de Costa Rica.
        </p>
      )}
      <p className="text-xs text-muted-foreground">Haz clic en el mapa para colocar el marcador de rescate.</p>
    </div>
  );
}
