import { useEffect, useRef } from 'react';

interface CorridorOverlayProps {
  geojson: any | null;
  mapInstance: MapInstance | null;
}

export default function CorridorOverlay({ geojson, mapInstance }: CorridorOverlayProps) {
  const polylinesRef = useRef<PolylineInstance[]>([]);

  useEffect(() => {
    if (!geojson || !mapInstance) return;

    const polylines: PolylineInstance[] = [];

    for (const feature of geojson.features ?? []) {
      // GeoJSON LineString coordinates are [lng, lat] — swap to {lat, lng} for the SDK.
      const path = (feature.geometry?.coordinates ?? []).map(
        ([lng, lat]: [number, number]) => ({ lat, lng })
      );

      const polyline = new mappls.Polyline({
        map: mapInstance,
        path,
        strokeColor: feature.properties?.color,
        strokeOpacity: feature.properties?.opacity,
        strokeWeight: feature.properties?.weight,
      });

      polylines.push(polyline);
    }

    polylinesRef.current = polylines;

    return () => {
      for (const polyline of polylinesRef.current) {
        polyline.setMap(null);
      }
      polylinesRef.current = [];
    };
  }, [geojson, mapInstance]);

  return null;
}
