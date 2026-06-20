import type { SimulationResponse, CongestionClass } from '../types';
import { SEVERITY_TAILWIND } from '../constants/corridors';

interface DeltaDisplayProps {
  simulation: SimulationResponse | null;
}

interface DeltaRowData {
  key: 'officers' | 'barricades' | 'diversions' | 'signal_overrides';
  label: string;
}

const DELTA_ROWS: DeltaRowData[] = [
  { key: 'officers', label: 'Officers' },
  { key: 'barricades', label: 'Barricades' },
  { key: 'diversions', label: 'Diversions' },
  { key: 'signal_overrides', label: 'Signal Overrides' },
];

/**
 * The backend's delta.congestion_class is a string like "Severe → High".
 * Parse the two sides out; fall back to the base/simulated objects directly
 * if the string isn't in the expected shape (defensive — the badge should
 * never go blank just because the separator changed).
 */
function parseCongestionDelta(
  deltaString: string | undefined,
  fallbackBefore: CongestionClass,
  fallbackAfter: CongestionClass
): { before: string; after: string } {
  if (!deltaString) return { before: fallbackBefore, after: fallbackAfter };
  const parts = deltaString.split('→').map((part) => part.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { before: fallbackBefore, after: fallbackAfter };
  }
  return { before: parts[0], after: parts[1] };
}

function badgeClass(value: string): string {
  return SEVERITY_TAILWIND[value as CongestionClass] ?? 'bg-slate-700 text-slate-200 border border-slate-600';
}

export default function DeltaDisplay({ simulation }: DeltaDisplayProps) {
  if (!simulation) return null;

  const { base, simulated, delta } = simulation;
  const { before, after } = parseCongestionDelta(
    delta.congestion_class,
    base.congestion_class,
    simulated.congestion_class
  );

  const deltaValues = DELTA_ROWS.map((row) => Number(delta[row.key] ?? 0));
  const allImproved = deltaValues.every((value) => value <= 0);

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 shadow-lg space-y-4">
      <h2 className="text-white text-sm font-semibold uppercase tracking-wide">Simulation Results</h2>

      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-bold px-3 py-1.5 rounded-md uppercase ${badgeClass(before)}`}>
          {before}
        </span>
        <span className="text-slate-500">→</span>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-md uppercase ${badgeClass(after)}`}>
          {after}
        </span>
      </div>

      <div className="space-y-2">
        {DELTA_ROWS.map((row) => {
          const value = Number(delta[row.key] ?? 0);
          const isImprovement = value <= 0;
          return (
            <div key={row.key} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{row.label}</span>
              <span
                className={`data-mono font-semibold ${isImprovement ? 'text-green-400' : 'text-red-400'}`}
              >
                {value > 0 ? `+${value}` : value}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-slate-400 text-xs data-mono">
        AI Confidence: {Math.round(base.confidence * 100) / 100} → {Math.round(simulated.confidence * 100) / 100}
      </p>

      {allImproved ? (
        <div className="bg-green-950 border border-green-800 text-green-300 text-sm rounded-md px-3 py-2">
          Intervention reduces peak demand.
        </div>
      ) : (
        <div className="bg-amber-950 border border-amber-800 text-amber-300 text-sm rounded-md px-3 py-2">
          Partial improvement. Additional measures needed.
        </div>
      )}
    </div>
  );
}
