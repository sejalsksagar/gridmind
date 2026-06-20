import { useEffect, useRef } from "react";

const MAP_CONTAINER_ID = "mappls-map-container";

export default function MapView({ onMapReady }: any) {
  const mapRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const mappls = (window as any).mappls;

      if (
        initialized.current ||
        !mappls ||
        !mapRef.current
      ) {
        return;
      }

      initialized.current = true;
      clearInterval(timer);

      const map = new mappls.Map(MAP_CONTAINER_ID, {
        center: [12.9716, 77.5946],
        zoom: 11,
      });

      onMapReady?.(map);
    }, 500);

    return () => clearInterval(timer);
  }, [onMapReady]);

  return (
    <div
      id={MAP_CONTAINER_ID}
      ref={mapRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}