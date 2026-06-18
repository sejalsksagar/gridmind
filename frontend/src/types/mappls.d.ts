// Minimal type shim for the MapmyIndia (mappls) global object.
// The SDK is loaded via a CDN <script> tag in index.html — there is no npm package,
// so TypeScript has no way to know this global exists without this declaration.
// Extend the option/return shapes here as more SDK features are used.

interface MapInstance {
  setCenter(latlng: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
  remove(): void;
  addListener?(event: string, handler: (e: any) => void): void;
}

interface PolylineInstance {
  setMap(m: MapInstance | null): void;
}

interface MarkerInstance {
  setMap(m: MapInstance | null): void;
}

interface HeatmapInstance {
  setMap(m: MapInstance | null): void;
}

declare const mappls: {
  Map: new (
    container: string | HTMLElement,
    options: {
      center: [number, number];
      zoom: number;
      zoomControl?: boolean;
      search?: boolean;
    }
  ) => MapInstance;

  Polyline: new (options: {
    map: MapInstance;
    path: Array<{ lat: number; lng: number }>;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    lineStyle?: string; // 'dashed' for diversion routes
  }) => PolylineInstance;

  Marker: new (options: {
    map: MapInstance;
    position: { lat: number; lng: number };
    icon?: string;
    draggable?: boolean;
    popupHtml?: string;
  }) => MarkerInstance;

  HeatmapLayer: new (options: {
    map: MapInstance;
    data: Array<{ lat: number; lng: number; weight: number }>;
    radius?: number;
    opacity?: number;
    gradient?: Record<string, string>;
  }) => HeatmapInstance;

  LatLng: new (lat: number, lng: number) => { lat: number; lng: number };
};
