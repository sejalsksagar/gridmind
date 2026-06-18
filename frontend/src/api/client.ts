import type {
  EventParams,
  SimulationOverrides,
  PredictionResponse,
  SimulationResponse,
  HeatpointsResponse,
  DiversionResponse,
} from '../types';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Day 1: the real backend isn't wired up yet, so every function below returns
// hardcoded mock data shaped exactly like the real API contracts. Flip this to
// false once /predict, /simulate, etc. are live (Day 3 integration).
export const USE_MOCK = true;

// ─── Mock fixtures ──────────────────────────────────────────────────────────

const MOCK_PREDICTION: PredictionResponse = {
  congestion_class: 'Severe',
  confidence: 0.91,
  duration_class: 'Long',
  duration_estimate_range: [120, 240],
  affected_corridors: [
    { name: 'Tumkur Road', severity: 'Severe', estimated_delay_minutes: 45 },
    { name: 'Bellary Road 1', severity: 'High', estimated_delay_minutes: 20 },
  ],
  resources: {
    officers: 18,
    barricades: 5,
    diversions: 2,
    signal_overrides: 3,
    rationale: 'Severe congestion. Maximum deployment required.',
  },
};

const MOCK_SIMULATED_PREDICTION: PredictionResponse = {
  congestion_class: 'High',
  confidence: 0.77,
  duration_class: 'Medium',
  duration_estimate_range: [30, 120],
  affected_corridors: [
    { name: 'Tumkur Road', severity: 'High', estimated_delay_minutes: 30 },
    { name: 'Bellary Road 1', severity: 'Medium', estimated_delay_minutes: 10 },
  ],
  resources: {
    officers: 10,
    barricades: 3,
    diversions: 1,
    signal_overrides: 2,
    rationale: 'Moderate congestion. Barricade and signal adjustment recommended.',
  },
};

const MOCK_SIMULATION: SimulationResponse = {
  base: MOCK_PREDICTION,
  simulated: MOCK_SIMULATED_PREDICTION,
  delta: {
    congestion_class: 'Severe → High',
    officers: -8,
    barricades: -2,
    diversions: -1,
    signal_overrides: -1,
    confidence_change: -0.14,
  },
};

const MOCK_HEATPOINTS: HeatpointsResponse = {
  points: [
    { lat: 13.040004, lng: 77.518099, weight: 1.0 },
    { lat: 12.971599, lng: 77.594563, weight: 0.5 },
    { lat: 12.934518, lng: 77.626579, weight: 0.75 },
  ],
  total: 3,
};

const MOCK_DIVERSION: DiversionResponse = {
  route_coordinates: [
    [13.040004, 77.518099],
    [13.045, 77.512],
    [13.066721, 77.470123],
  ],
  total_distance_m: 4800,
  total_duration_s: 720,
  summary: 'Via Magadi Road — 4.8 km, ~12 min',
};

const MOCK_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Tumkur Road',
        severity: 'Severe',
        color: '#7F1D1D',
        opacity: 0.85,
        weight: 6,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.5181, 13.04],
          [77.505, 13.065],
          [77.49, 13.1],
        ],
      },
    },
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── API functions ──────────────────────────────────────────────────────────

export async function predictEvent(params: EventParams): Promise<PredictionResponse> {
  if (USE_MOCK) return MOCK_PREDICTION;
  return request<PredictionResponse>('/api/v1/predict', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function simulateEvent(
  base: EventParams,
  overrides: SimulationOverrides
): Promise<SimulationResponse> {
  if (USE_MOCK) return MOCK_SIMULATION;
  return request<SimulationResponse>('/api/v1/simulate', {
    method: 'POST',
    body: JSON.stringify({ base_event: base, overrides }),
  });
}

export async function getCorridorGeoJSON(
  severityMap?: Record<string, string>
): Promise<typeof MOCK_GEOJSON> {
  if (USE_MOCK) return MOCK_GEOJSON;
  const query = severityMap ? `?severity_map=${encodeURIComponent(JSON.stringify(severityMap))}` : '';
  return request(`/api/v1/corridors/geojson${query}`);
}

export async function getHeatpoints(severity?: string): Promise<HeatpointsResponse> {
  if (USE_MOCK) return MOCK_HEATPOINTS;
  const query = severity ? `?severity=${encodeURIComponent(severity)}` : '';
  return request<HeatpointsResponse>(`/api/v1/heatpoints${query}`);
}

export async function getDiversion(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<DiversionResponse> {
  if (USE_MOCK) return MOCK_DIVERSION;
  return request<DiversionResponse>('/api/v1/diversion', {
    method: 'POST',
    body: JSON.stringify({ from_lat: fromLat, from_lng: fromLng, to_lat: toLat, to_lng: toLng }),
  });
}
