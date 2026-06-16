import type { PredictionResponse, CongestionClass } from '@/types'
import { SEVERITY_BADGE_CLASS, SEVERITY_COLORS } from '@/constants'

interface Props {
  prediction: PredictionResponse
}

const SEVERITY_ICON: Record<CongestionClass, string> = {
  Low: '🟢', Medium: '🟡', High: '🔴', Severe: '🚨',
}

export function PredictionPanel({ prediction }: Props) {
  const { congestion_class, confidence, duration_class, duration_estimate_range,
    affected_corridors, resources } = prediction

  const [durMin, durMax] = duration_estimate_range

  return (
    <div className="flex flex-col gap-4">

      {/* Congestion Class Badge */}
      <div className="text-center">
        <div
          className={`inline-flex items-center gap-2 px-5 py-2 rounded-full
            border-2 text-lg font-bold ${SEVERITY_BADGE_CLASS[congestion_class]}`}
        >
          {SEVERITY_ICON[congestion_class]} {congestion_class.toUpperCase()} CONGESTION
        </div>
      </div>

      {/* Confidence Bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Model Confidence</span>
          <span className="font-semibold text-gray-700">{Math.round(confidence * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full transition-all duration-700"
            style={{
              width: `${Math.round(confidence * 100)}%`,
              backgroundColor: SEVERITY_COLORS[congestion_class],
            }}
          />
        </div>
      </div>

      {/* Duration */}
      <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase">Estimated Duration</p>
          <p className="text-lg font-bold text-gray-800">{durMin}–{durMax} min</p>
          <p className="text-xs text-gray-400">{duration_class} disruption</p>
        </div>
        <span className="text-3xl">⏱️</span>
      </div>

      {/* Resource Grid */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Recommended Resources
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ResourceCard icon="👮" label="Officers"        value={resources.officers} />
          <ResourceCard icon="🚧" label="Barricades"     value={resources.barricades} />
          <ResourceCard icon="↪️"  label="Diversions"    value={resources.diversions} />
          <ResourceCard icon="🚦" label="Signal Overrides" value={resources.signal_overrides} />
        </div>
        <p className="text-xs text-gray-400 mt-2 italic">{resources.rationale}</p>
      </div>

      {/* Affected Corridors */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Affected Corridors
        </p>
        <div className="flex flex-col gap-1">
          {affected_corridors.map(c => (
            <div
              key={c.name}
              className="flex items-center justify-between text-sm px-2 py-1.5 rounded bg-gray-50"
            >
              <span className="font-medium text-gray-700">{c.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">+{c.estimated_delay_minutes} min</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: SEVERITY_COLORS[c.severity] }}
                >
                  {c.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResourceCard({
  icon, label, value,
}: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2 shadow-sm">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-lg font-bold text-gray-800 leading-none">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  )
}
