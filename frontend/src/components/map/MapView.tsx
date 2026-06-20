import { useEffect, useRef } from "react";

export default function MapView({ onMapReady }: any) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      console.log("checking sdk...", window.mappls);

      if (window.mappls && mapRef.current) {
        clearInterval(timer);

        const map = new window.mappls.Map(mapRef.current, {
          center: [12.9716, 77.5946],
          zoom: 11,
        });

        onMapReady?.(map);

        console.log("MAP CREATED");
      }
    }, 500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}