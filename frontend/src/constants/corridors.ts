import type { CongestionClass, EventParams } from '../types';

export const SEVERITY_COLORS: Record<CongestionClass, string> = {
  Low: '#22C55E',
  Medium: '#F59E0B',
  High: '#EF4444',
  Severe: '#7F1D1D',
};

export const SEVERITY_TAILWIND: Record<CongestionClass, string> = {
  Low: 'bg-green-100 text-green-800 border border-green-300',
  Medium: 'bg-amber-100 text-amber-800 border border-amber-300',
  High: 'bg-red-100 text-red-800 border border-red-300',
  Severe: 'bg-red-950 text-white border border-red-900',
};

export const CORRIDORS = [
  'Tumkur Road',
  'Mysore Road',
  'Hosur Road',
  'Bellary Road 1',
  'Bellary Road 2',
  'ORR East 1',
  'ORR East 2',
  'ORR North 1',
  'ORR North 2',
  'Old Madras Road',
  'Magadi Road',
  'Bannerghatta Road',
  'West of Chord Road',
  'Non-corridor',
];

export const EVENT_CAUSES = [
  'vehicle_breakdown',
  'accident',
  'construction',
  'public_event',
  'tree_fall',
  'water_logging',
  'pot_holes',
  'road_conditions',
  'congestion',
  'procession',
  'vip_movement',
  'protest',
  'others',
];

// Lat/lon lookup for the corridors with known coordinates. Anything not listed
// here (including "Non-corridor") falls back to the Bengaluru city-center point.
export const CORRIDOR_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'Tumkur Road': { latitude: 13.040004, longitude: 77.518099 },
  'Mysore Road': { latitude: 12.9352, longitude: 77.4905 },
  'Hosur Road': { latitude: 12.8704, longitude: 77.6345 },
  'Bellary Road 1': { latitude: 13.0681, longitude: 77.58 },
};

export const DEFAULT_COORDINATES = { latitude: 12.9716, longitude: 77.5946 };

export function getCorridorCoordinates(corridor: string): { latitude: number; longitude: number } {
  return CORRIDOR_COORDINATES[corridor] ?? DEFAULT_COORDINATES;
}

export const DEMO_EVENT: EventParams = {
  event_type: 'unplanned',
  event_cause: 'construction',
  latitude: 13.040004,
  longitude: 77.518099,
  requires_road_closure: true,
  corridor: 'Tumkur Road',
  start_datetime: '2024-06-01T18:00:00+05:30',
};
