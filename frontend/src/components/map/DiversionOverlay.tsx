import { useEffect, useRef } from 'react';

interface DiversionOverlayProps {
  routeCoordinates: [number, number][] | null;
  mapInstance: MapInstance | null;
}

export default function DiversionOverlay({ routeCoordinates, mapInstance }: DiversionOverlayProps) {
  const polylineRef = useRef<PolylineInstance | null>(null);
  const markerRef = useRef<MarkerInstance | null>(null);

  useEffect(() => {
  (polylineRef.current as any)?.remove?.();
  polylineRef.current = null;

  (markerRef.current as any)?.remove?.();
  markerRef.current = null;

  if (!mapInstance || !routeCoordinates?.length) {
    return;
  }

  const path = routeCoordinates.map(([lat, lng]) => ({
    lat,
    lng,
  }), [routeCoordinates, mapInstance]);

  const polyline = new mappls.Polyline({
    map: mapInstance,
    path,
    strokeColor: '#16A34A',
    strokeOpacity: 0.9,
    strokeWeight: 5,
    lineStyle: 'dashed', // remove if SDK complains
  });

  console.log('Created polyline:', polyline);

polylineRef.current = polyline;

console.log('Ref after assignment:', polylineRef.current);

  const destination = path[path.length - 1];

  const marker = new mappls.Marker({
    map: mapInstance,
    position: destination,
    popupHtml: `
      <div>
        <strong>🔀 Suggested Diversion</strong>
        <br/>
        Alternate route to bypass congestion
      </div>
    `,
  });

  markerRef.current = marker;

  return () => {
    console.log('Diversion effect:', routeCoordinates);
    (polylineRef.current as any)?.remove?.();
    polylineRef.current = null;
    console.log('Removing polyline', polylineRef.current);
    (markerRef.current as any)?.remove?.();
    markerRef.current = null;
  };
}, [routeCoordinates, mapInstance]);

return null;
}
