import type { EventParams } from '../types';
import { getCorridorCoordinates } from './corridors';

export interface DemoScenario {
  name: string;
  event: EventParams;
  description: string;
}

function buildEvent(
  corridor: string,
  eventCause: string,
  timeOfDay: string,
  requiresRoadClosure: boolean
): EventParams {
  const { latitude, longitude } = getCorridorCoordinates(corridor);
  return {
    event_type: 'unplanned',
    event_cause: eventCause,
    latitude,
    longitude,
    requires_road_closure: requiresRoadClosure,
    corridor,
    start_datetime: `2024-06-01T${timeOfDay}:00+05:30`,
  };
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    name: 'Tumkur Severe',
    event: buildEvent('Tumkur Road', 'construction', '18:00', true),
    description:
      'A peak-hour road closure on a major corridor — shows the model escalating to its highest severity with maximum resource deployment.',
  },
  {
    name: 'Hosur High',
    event: buildEvent('Hosur Road', 'accident', '08:30', false),
    description:
      'A morning-peak accident without a closure — shows high-severity classification driven by timing and corridor importance alone.',
  },
  {
    name: 'Mysore Medium',
    event: buildEvent('Mysore Road', 'vehicle_breakdown', '14:00', false),
    description:
      'An off-peak breakdown with no closure — shows the model correctly de-escalating severity when conditions are less disruptive.',
  },
  {
    name: 'Minor Low',
    event: buildEvent('Non-corridor', 'pot_holes', '14:00', false),
    description:
      'A minor off-corridor issue — shows the model assigning minimal resources when an event has little citywide impact.',
  },
  {
    name: 'Simulation: Tumkur Closure Lifted',
    event: buildEvent('Tumkur Road', 'construction', '18:00', true),
    description:
      'Starts from the Tumkur Severe scenario, then simulates lifting the road closure — shows the before/after delta in severity and resource needs.',
  },
];
