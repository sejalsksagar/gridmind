import { useEffect, useRef } from 'react';
import type { HeatPoint } from '../../types';

interface HeatmapLayerProps {
  points: HeatPoint[] | null;
  mapInstance: MapInstance | null;
}

export default function HeatmapLayer({ points, mapInstance }: HeatmapLayerProps) {
  const heatmapRef = useRef<HeatmapInstance | null>(null);

  useEffect(() => {
    if (!mapInstance || !points || points.length === 0) return;

    const heatmap = new mappls.HeatmapLayer({
      map: mapInstance,
      data: points,
      radius: 30,
      opacity: 0.7,
    });

    heatmapRef.current = heatmap;

    return () => {
  (heatmapRef.current as any)?.remove?.();
  heatmapRef.current = null;
};
  }, [points, mapInstance]);

  return null;
}
