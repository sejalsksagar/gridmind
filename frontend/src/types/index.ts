// Core domain types shared across the GridMind frontend.
// These mirror the backend's Pydantic response/request shapes exactly —
// keep field names and casing in sync with app/models/schemas.py.

export type CongestionClass = 'Low' | 'Medium' | 'High' | 'Severe';
export type DurationClass = 'Short' | 'Medium' | 'Long';

export interface EventParams {
  event_type: string;
  event_cause: string;
  latitude: number;
  longitude: number;
  requires_road_closure: boolean;
  corridor: string;
  start_datetime: string;
  veh_type?: string;
}

export interface AffectedCorridor {
  name: string;
  severity: CongestionClass;
  estimated_delay_minutes: number;
}

export interface ResourceRecommendation {
  officers: number;
  barricades: number;
  diversions: number;
  signal_overrides: number;
  rationale: string;
}

export interface PredictionResponse {
  congestion_class: CongestionClass;
  confidence: number;
  duration_class: DurationClass;
  duration_estimate_range: [number, number];
  affected_corridors: AffectedCorridor[];
  resources: ResourceRecommendation;
  heatmap_points: HeatPoint[];
}

export interface SimulationOverrides {
  requires_road_closure?: boolean;
  event_cause?: string;
  start_hour?: number;
}

export interface SimulationResponse {
  base: PredictionResponse;
  simulated: PredictionResponse;
  delta: Record<string, any>;
  improved: boolean;
}

export interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
  severity: string;
}

export interface DiversionResponse {
  route_coordinates: [number, number][];
  total_distance_m: number;
  total_duration_s: number;
  summary: string;
}
