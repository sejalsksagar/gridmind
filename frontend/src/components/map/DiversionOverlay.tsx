import { useEffect, useRef } from 'react';

interface DiversionOverlayProps {
  routeCoordinates: [number, number][] | null;
  mapInstance: MapInstance | null;
}

export default function DiversionOverlay({ routeCoordinates, mapInstance }: DiversionOverlayProps) {
  const polylineRef = useRef<PolylineInstance | null>(null);
  const markerRef = useRef<MarkerInstance | null>(null);

  useEffect(() => {
    if (!mapInstance || !routeCoordinates || routeCoordinates.length === 0) return;

    const path = routeCoordinates.map(([lat, lng]) => ({ lat, lng }));

    const polyline = new mappls.Polyline({
      map: mapInstance,
      path,
      strokeColor: '#16A34A',
      strokeOpacity: 0.9,
      strokeWeight: 5,
      lineStyle: 'dashed',
    });
    polylineRef.current = polyline;

    const midIndex = Math.floor(path.length / 2);
    const marker = new mappls.Marker({
      map: mapInstance,
      position: path[midIndex],
      popupHtml: '🔀 Diversion Route Active',
    });
    markerRef.current = marker;

    return () => {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  }, [routeCoordinates, mapInstance]);

  return null;
}
