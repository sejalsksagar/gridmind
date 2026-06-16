import type { CongestionClass, EventCause, VehType } from '@/types'

export const SEVERITY_COLORS: Record<CongestionClass, string> = {
  Low:    '#22C55E',
  Medium: '#F59E0B',
  High:   '#EF4444',
  Severe: '#7F1D1D',
}

export const SEVERITY_BADGE_CLASS: Record<CongestionClass, string> = {
  Low:    'bg-green-100 text-green-800 border-green-300',
  Medium: 'bg-amber-100 text-amber-800 border-amber-300',
  High:   'bg-red-100 text-red-800 border-red-300',
  Severe: 'bg-red-900 text-white border-red-900',
}

export const SEVERITY_LINE_WEIGHT: Record<CongestionClass, number> = {
  Low: 3, Medium: 5, High: 7, Severe: 10,
}

export const CORRIDORS: string[] = [
  'Tumkur Road',
  'Mysore Road',
  'Hosur Road',
  'Bellary Road 1',
  'Bellary Road 2',
  'ORR East 1',
  'ORR East 2',
  'ORR North 1',
  'ORR North 2',
  'ORR West 1',
  'Old Madras Road',
  'Magadi Road',
  'Bannerghatta Road',
  'Kanakapura Road',
  'Non-corridor',
]

export const EVENT_CAUSES: { value: EventCause; label: string }[] = [
  { value: 'vehicle_breakdown', label: 'Vehicle Breakdown' },
  { value: 'accident',          label: 'Accident' },
  { value: 'construction',      label: 'Construction' },
  { value: 'public_event',      label: 'Public Event' },
  { value: 'tree_fall',         label: 'Tree Fall' },
  { value: 'water_logging',     label: 'Water Logging' },
  { value: 'pot_holes',         label: 'Pot Holes' },
  { value: 'road_conditions',   label: 'Road Conditions' },
  { value: 'congestion',        label: 'Congestion' },
  { value: 'procession',        label: 'Procession' },
  { value: 'vip_movement',      label: 'VIP Movement' },
  { value: 'protest',           label: 'Protest' },
  { value: 'others',            label: 'Others' },
]

export const VEH_TYPES: { value: VehType; label: string }[] = [
  { value: 'Unknown',        label: 'Unknown / Not Applicable' },
  { value: 'private_car',    label: 'Private Car' },
  { value: 'auto',           label: 'Auto Rickshaw' },
  { value: 'bmtc_bus',       label: 'BMTC Bus' },
  { value: 'ksrtc_bus',      label: 'KSRTC Bus' },
  { value: 'heavy_vehicle',  label: 'Heavy Vehicle' },
  { value: 'truck',          label: 'Truck' },
  { value: 'lcv',            label: 'LCV' },
  { value: 'private_bus',    label: 'Private Bus' },
  { value: 'taxi',           label: 'Taxi / Cab' },
]

// Bengaluru map defaults
export const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946]
export const BENGALURU_ZOOM = 11
