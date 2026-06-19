import type { PredictionResponse } from '../types';
import { SEVERITY_COLORS, SEVERITY_TAILWIND } from '../constants/corridors';

interface PredictionPanelProps {
  prediction: PredictionResponse | null;
  isLoading: boolean;
}

function SkeletonBars() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-32 bg-slate-700 rounded animate-pulse" />
      <div className="h-4 w-full bg-slate-700 rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-slate-700 rounded animate-pulse" />
    </div>
  );
}

export default function PredictionPanel({ prediction, isLoading }: PredictionPanelProps) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 shadow-lg space-y-4">
      <h2 className="text-white text-sm font-semibold uppercase tracking-wide">Prediction</h2>

      {isLoading && <SkeletonBars />}

      {!isLoading && !prediction && (
        <p className="text-slate-400 text-sm">Submit an event to see predictions</p>
      )}

      {!isLoading && prediction && (
        <div className="space-y-4">
          <div
            className={`inline-flex items-center gap-2 font-bold text-2xl px-4 py-2 rounded-md ${SEVERITY_TAILWIND[prediction.congestion_class]}`}
          >
            <span>●</span>
            <span className="uppercase">{prediction.congestion_class}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-xs font-medium">AI Confidence</span>
              <span className="text-white text-sm font-semibold data-mono">
                {Math.round(prediction.confidence * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${prediction.confidence * 100}%`,
                  backgroundColor: SEVERITY_COLORS[prediction.congestion_class],
                }}
              />
            </div>
          </div>

          <p className="text-slate-300 text-sm">
            Est. Duration: {prediction.duration_estimate_range[0]}–{prediction.duration_estimate_range[1]} min
          </p>

          <div className="space-y-1.5">
            <p className="text-slate-300 text-xs font-medium uppercase tracking-wide">Affected Corridors</p>
            <ul className="space-y-1.5">
              {prediction.affected_corridors.map((corridor) => (
                <li key={corridor.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-200">
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: SEVERITY_COLORS[corridor.severity] }}
                    />
                    {corridor.name}
                  </span>
                  <span className="text-slate-400 data-mono">+{corridor.estimated_delay_minutes} min</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
