import { useState } from 'react';
import type { EventParams } from '../types';
import { CORRIDORS, EVENT_CAUSES, DEMO_EVENT, getCorridorCoordinates } from '../constants/corridors';

interface EventFormProps {
  onSubmit: (params: EventParams) => void;
  isLoading: boolean;
}

function toLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function EventForm({ onSubmit, isLoading }: EventFormProps) {
  const [eventCause, setEventCause] = useState(DEMO_EVENT.event_cause);
  const [corridor, setCorridor] = useState(DEMO_EVENT.corridor);
  const [requiresRoadClosure, setRequiresRoadClosure] = useState(DEMO_EVENT.requires_road_closure);
  const [startDatetime, setStartDatetime] = useState('2024-06-01T18:00');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { latitude, longitude } = getCorridorCoordinates(corridor);

    const params: EventParams = {
      event_type: 'unplanned',
      event_cause: eventCause,
      latitude,
      longitude,
      requires_road_closure: requiresRoadClosure,
      corridor,
      // datetime-local has no timezone offset — assume IST, matching the rest of the system.
      start_datetime: `${startDatetime}:00+05:30`,
    };

    onSubmit(params);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 rounded-lg border border-slate-800 p-4 shadow-lg space-y-4">
      <h2 className="text-white text-sm font-semibold uppercase tracking-wide">Event Details</h2>

      <div className="space-y-1.5">
        <label className="block text-white text-xs font-medium">Event Cause</label>
        <select
          value={eventCause}
          onChange={(e) => setEventCause(e.target.value)}
          className="w-full bg-slate-800 text-slate-100 text-sm rounded-md border border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {EVENT_CAUSES.map((cause) => (
            <option key={cause} value={cause}>
              {toLabel(cause)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-white text-xs font-medium">Corridor</label>
        <select
          value={corridor}
          onChange={(e) => setCorridor(e.target.value)}
          className="w-full bg-slate-800 text-slate-100 text-sm rounded-md border border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {CORRIDORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-white text-xs font-medium">Start Time</label>
        <input
          type="datetime-local"
          value={startDatetime}
          onChange={(e) => setStartDatetime(e.target.value)}
          className="w-full bg-slate-800 text-slate-100 text-sm rounded-md border border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="text-white text-xs font-medium">Requires Road Closure</label>
        <button
          type="button"
          role="switch"
          aria-checked={requiresRoadClosure}
          onClick={() => setRequiresRoadClosure((prev) => !prev)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            requiresRoadClosure ? 'bg-red-700' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              requiresRoadClosure ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-md transition-colors"
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Analyzing…
          </>
        ) : (
          'Analyze Impact'
        )}
      </button>
    </form>
  );
}
