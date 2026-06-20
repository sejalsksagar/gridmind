import { useEffect, useRef } from 'react';
import { useMapmyIndia } from '../../hooks/useMapmyIndia';
import { SEVERITY_COLORS } from '../../constants/corridors';
import type { CongestionClass } from '../../types';

interface MapViewProps {
  onMapReady?: (map: MapInstance) => void;
  corridorsLoading?: boolean;
  diversionLoading?: boolean;
}

const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 11;
const LEGEND_ORDER: CongestionClass[] = ['Low', 'Medium', 'High', 'Severe'];

export default function MapView({
  onMapReady,
  corridorsLoading = false,
  diversionLoading = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);
  const { mapReady } = useMapmyIndia();

  useEffect(() => {
    if (!mapReady || !containerRef.current || mapInstanceRef.current) return;

    const map = new mappls.Map(containerRef.current, {
      center: BENGALURU_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      search: false,
    });

    mapInstanceRef.current = map;
    onMapReady?.(map);

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  return (
    <div className="relative w-full h-full bg-slate-950">
      <div id="map-container" ref={containerRef} className="w-full h-full" />

      {!mapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-3">
          <div className="w-full h-full absolute inset-0 bg-slate-900 animate-pulse" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-2 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm data-mono">Loading basemap…</p>
          </div>
        </div>
      )}

      {mapReady && (
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {corridorsLoading && (
            <span className="bg-slate-900/80 text-slate-300 text-xs px-2 py-1 rounded">
              Loading corridors...
            </span>
          )}
          {diversionLoading && (
            <span className="bg-slate-900/80 text-slate-300 text-xs px-2 py-1 rounded">
              Loading diversion...
            </span>
          )}
        </div>
      )}

      {mapReady && (
        <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur p-3 rounded-lg shadow-lg">
          <div className="flex flex-col gap-1.5">
            {LEGEND_ORDER.map((severity) => (
              <div key={severity} className="flex items-center gap-2">
                <span
                  className="inline-block w-4 h-0.5 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLORS[severity] }}
                />
                <span className="text-slate-300 text-xs">{severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
