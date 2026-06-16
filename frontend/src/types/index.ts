// ─── Enums / Literals ─────────────────────────────────────────────────────────

export type EventType = 'planned' | 'unplanned'

export type EventCause =
  | 'vehicle_breakdown'
  | 'accident'
  | 'construction'
  | 'public_event'
  | 'tree_fall'
  | 'water_logging'
  | 'pot_holes'
  | 'road_conditions'
  | 'congestion'
  | 'procession'
  | 'vip_movement'
  | 'protest'
  | 'others'

export type CongestionClass = 'Low' | 'Medium' | 'High' | 'Severe'
export type DurationClass = 'Short' | 'Medium' | 'Long'

export type VehType =
  | 'bmtc_bus'
  | 'heavy_vehicle'
  | 'lcv'
  | 'private_bus'
  | 'private_car'
  | 'truck'
  | 'ksrtc_bus'
  | 'taxi'
  | 'auto'
  | 'Unknown'

// ─── Request types ─────────────────────────────────────────────────────────────

export interface EventInput {
  event_type: EventType
  event_cause: EventCause
  latitude: number
  longitude: number
  requires_road_closure: boolean
  corridor: string
  start_datetime: string      // ISO8601 with timezone
  veh_type?: VehType
}

export interface SimulationOverrides {
  requires_road_closure?: boolean
  event_cause?: EventCause
  start_hour?: number         // 0–23
}

export interface SimulationInput {
  base_event: EventInput
  overrides: SimulationOverrides
}

// ─── Response types ────────────────────────────────────────────────────────────

export interface ResourceRecommendation {
  officers: number
  barricades: number
  diversions: number
  signal_overrides: number
  rationale: string
}

export interface AffectedCorridor {
  name: string
  severity: CongestionClass
  estimated_delay_minutes: number
}

export interface PredictionResponse {
  congestion_class: CongestionClass
  confidence: number
  duration_class: DurationClass
  duration_estimate_range: [number, number]
  affected_corridors: AffectedCorridor[]
  resources: ResourceRecommendation
}

export interface SimulationDelta {
  congestion_class: string          // e.g. "Severe → High"
  officers: number
  barricades: number
  diversions: number
  confidence_change: number
}

export interface SimulationResponse {
  base: PredictionResponse
  simulated: PredictionResponse
  delta: SimulationDelta
  improved: boolean
}

export interface HealthResponse {
  status: string
  models_loaded: boolean
  mock_mode: boolean
  version: string
  environment: string
}

// ─── UI-specific types ─────────────────────────────────────────────────────────

export type TabId = 'predict' | 'simulate'

export interface AppState {
  eventParams: Partial<EventInput>
  prediction: PredictionResponse | null
  simulation: SimulationResponse | null
  isLoading: boolean
  error: string | null
  activeTab: TabId
}
