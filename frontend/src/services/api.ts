import axios from 'axios'
import type {
  EventInput, PredictionResponse,
  SimulationInput, SimulationResponse,
  HealthResponse,
} from '@/types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const USE_MOCK  = import.meta.env.VITE_USE_MOCK === 'true'

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// ─── Mock responses (used when VITE_USE_MOCK=true or API is unreachable) ──────

const MOCK_PREDICTION: PredictionResponse = {
  congestion_class: 'Severe',
  confidence: 0.91,
  duration_class: 'Long',
  duration_estimate_range: [120, 240],
  affected_corridors: [
    { name: 'Tumkur Road',    severity: 'Severe', estimated_delay_minutes: 45 },
    { name: 'Bellary Road 1', severity: 'High',   estimated_delay_minutes: 20 },
    { name: 'Magadi Road',    severity: 'Medium',  estimated_delay_minutes: 15 },
  ],
  resources: {
    officers: 18, barricades: 5, diversions: 2, signal_overrides: 3,
    rationale: 'Severe congestion. Maximum deployment with immediate diversions and corridor closures.',
  },
}

const MOCK_SIMULATION: SimulationResponse = {
  base: MOCK_PREDICTION,
  simulated: {
    ...MOCK_PREDICTION,
    congestion_class: 'High',
    confidence: 0.83,
    resources: { officers: 10, barricades: 3, diversions: 1, signal_overrides: 2,
      rationale: 'Significant corridor impact. Diversion route activation advised.' },
  },
  delta: {
    congestion_class: 'Severe → High',
    officers: -8, barricades: -2, diversions: -1, confidence_change: -0.08,
  },
  improved: true,
}

// ─── API calls ─────────────────────────────────────────────────────────────────

export async function predictEvent(params: EventInput): Promise<PredictionResponse> {
  if (USE_MOCK) {
    await delay(600)
    return MOCK_PREDICTION
  }
  const { data } = await api.post<PredictionResponse>('/predict', params)
  return data
}

export async function simulateEvent(payload: SimulationInput): Promise<SimulationResponse> {
  if (USE_MOCK) {
    await delay(800)
    return MOCK_SIMULATION
  }
  const { data } = await api.post<SimulationResponse>('/simulate', payload)
  return data
}

export async function getCorridorGeoJSON(
  corridors?: string[],
  severity?: string,
): Promise<GeoJSON.FeatureCollection> {
  const params: Record<string, string> = {}
  if (corridors?.length) params.corridors = corridors.join(',')
  if (severity)          params.severity  = severity
  const { data } = await api.get('/map/corridors', { params })
  return data
}

export async function getColoredCorridors(
  affectedCorridors: { name: string; severity: string; estimated_delay_minutes: number }[],
): Promise<GeoJSON.FeatureCollection> {
  const { data } = await api.post('/map/corridors/colored', affectedCorridors)
  return data
}

export async function getCorridorList(): Promise<string[]> {
  const { data } = await api.get<{ corridors: string[] }>('/map/corridors/list')
  return data.corridors
}

export async function checkHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health')
  return data
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
