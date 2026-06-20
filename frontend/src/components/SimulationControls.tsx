import { useState } from 'react';
import type { SimulationOverrides } from '../types';

interface SimulationControlsProps {
  onSimulate: (overrides: SimulationOverrides) => void;
  isLoading: boolean;
}

const SIMULATION_CAUSES = ['construction', 'accident', 'vehicle_breakdown', 'public_event', 'protest'];

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export default function SimulationControls({ onSimulate, isLoading }: SimulationControlsProps) {
  const [localOverrides, setLocalOverrides] = useState<SimulationOverrides>({});

  const hasOverrides =
    localOverrides.requires_road_closure !== undefined ||
    localOverrides.start_hour !== undefined ||
    localOverrides.event_cause !== undefined;

  function handleRun() {
    onSimulate(localOverrides);
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 shadow-lg space-y-4">
      <h2 className="text-white text-sm font-semibold uppercase tracking-wide">Scenario Explorer</h2>

      {/* a) Road Closure toggle */}
      <div className="flex items-center justify-between">
        <label className="text-white text-xs font-medium">Road Closure</label>
        <button
          type="button"
          role="switch"
          aria-checked={localOverrides.requires_road_closure ?? false}
          onClick={() =>
            setLocalOverrides((prev) => ({
              ...prev,
              requires_road_closure: !(prev.requires_road_closure ?? false),
            }))
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            localOverrides.requires_road_closure ? 'bg-red-700' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              localOverrides.requires_road_closure ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* b) Hour slider */}
      <div className="space-y-1.5">
        <label className="block text-white text-xs font-medium">
          Start Hour: {formatHour(localOverrides.start_hour ?? 18)}
        </label>
        <input
          type="range"
          min={0}
          max={23}
          step={1}
          value={localOverrides.start_hour ?? 18}
          onChange={(e) =>
            setLocalOverrides((prev) => ({ ...prev, start_hour: Number(e.target.value) }))
          }
          className="w-full accent-amber-500"
        />
      </div>

      {/* c) Event cause dropdown */}
      <div className="space-y-1.5">
        <label className="block text-white text-xs font-medium">Change to:</label>
        <select
          value={localOverrides.event_cause ?? ''}
          onChange={(e) =>
            setLocalOverrides((prev) => ({
              ...prev,
              event_cause: e.target.value || undefined,
            }))
          }
          className="w-full bg-slate-800 text-slate-100 text-sm rounded-md border border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">No change</option>
          {SIMULATION_CAUSES.map((cause) => (
            <option key={cause} value={cause}>
              {cause.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* d) Run Simulation button */}
      <button
        type="button"
        onClick={handleRun}
        disabled={!hasOverrides || isLoading}
        className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-md transition-colors"
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Running…
          </>
        ) : (
          'Run Simulation'
        )}
      </button>

      {/* e) Helper text */}
      <p className="text-slate-500 text-xs">
        Change event conditions and compare predicted traffic impact.
      </p>
    </div>
  );
}
