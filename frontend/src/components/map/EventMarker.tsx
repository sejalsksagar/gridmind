import { useEffect, useRef } from 'react';

interface EventMarkerProps {
  lat: number | null;
  lng: number | null;
  mapInstance: MapInstance | null;
  label: string;
}

export default function EventMarker({ lat, lng, mapInstance, label }: EventMarkerProps) {
  const markerRef = useRef<MarkerInstance | null>(null);

  useEffect(() => {
    if (!mapInstance || lat === null || lng === null) return;

    const marker = new mappls.Marker({
      map: mapInstance,
      position: { lat, lng },
      popupHtml: label,
    });

    markerRef.current = marker;

    return () => {
      (markerRef.current as any)?.remove?.();
      markerRef.current = null;
    };
  }, [lat, lng, mapInstance, label]);

  return null;
}
