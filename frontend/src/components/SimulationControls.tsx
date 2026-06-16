import { useState } from 'react'
import type { SimulationOverrides, SimulationResponse, EventCause } from '@/types'
import { EVENT_CAUSES, SEVERITY_COLORS } from '@/constants'

interface Props {
  onSimulate: (overrides: SimulationOverrides) => void
  isLoading: boolean
  result: SimulationResponse | null
}

export function SimulationControls({ onSimulate, isLoading, result }: Props) {
  const [roadClosure, setRoadClosure]   = useState<boolean>(false)
  const [startHour,   setStartHour]     = useState<number>(10)
  const [eventCause,  setEventCause]    = useState<EventCause | ''>('')

  const handleSimulate = () => {
    const overrides: SimulationOverrides = {
      requires_road_closure: roadClosure,
      start_hour:            startHour,
    }
    if (eventCause) overrides.event_cause = eventCause
    onSimulate(overrides)
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
        ⚙️ What-If Simulation
      </h3>

      {/* Road Closure Toggle */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
        <span className="text-sm font-medium text-gray-700">Road Closure</span>
        <button
          type="button"
          onClick={() => setRoadClosure(v => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${roadClosure ? 'bg-red-500' : 'bg-gray-300'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
              ${roadClosure ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {/* Hour Slider */}
      <div className="bg-gray-50 rounded-lg px-3 py-2.5">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Start Hour</span>
          <span className="text-sm font-bold text-blue-600">
            {String(startHour).padStart(2, '0')}:00
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={23}
          value={startHour}
          onChange={e => setStartHour(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>12 AM</span>
          <span className="text-amber-500 font-medium">Peak: 8–11 AM, 5–8 PM</span>
          <span>11 PM</span>
        </div>
      </div>

      {/* Event Cause Override */}
      <div className="bg-gray-50 rounded-lg px-3 py-2.5">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Event Cause Override
        </label>
        <select
          value={eventCause}
          onChange={e => setEventCause(e.target.value as EventCause | '')}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">— Keep original —</option>
          {EVENT_CAUSES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Run Button */}
      <button
        onClick={handleSimulate}
        disabled={isLoading}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400
                   text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
      >
        {isLoading ? '⏳ Simulating…' : '🔄 Run Simulation'}
      </button>

      {/* Delta Results */}
      {result && <DeltaDisplay result={result} />}
    </div>
  )
}

function DeltaDisplay({ result }: { result: SimulationResponse }) {
  const { delta, improved, base, simulated } = result

  return (
    <div className={`rounded-lg border-2 p-3 ${improved ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{improved ? '✅' : '⚠️'}</span>
        <span className={`text-sm font-bold ${improved ? 'text-green-700' : 'text-red-700'}`}>
          {delta.congestion_class}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <DeltaRow label="Officers"   base={base.resources.officers}    sim={simulated.resources.officers} />
        <DeltaRow label="Barricades" base={base.resources.barricades}  sim={simulated.resources.barricades} />
        <DeltaRow label="Diversions" base={base.resources.diversions}  sim={simulated.resources.diversions} />
        <DeltaRow
          label="Confidence"
          base={Math.round(base.confidence * 100)}
          sim={Math.round(simulated.confidence * 100)}
          unit="%"
        />
      </div>

      <div className="mt-2 flex gap-2">
        <SeverityChip label="Before" severity={base.congestion_class} />
        <span className="text-gray-400 self-center">→</span>
        <SeverityChip label="After"  severity={simulated.congestion_class} />
      </div>
    </div>
  )
}

function DeltaRow({
  label, base, sim, unit = '',
}: { label: string; base: number; sim: number; unit?: string }) {
  const diff = sim - base
  const color = diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-500' : 'text-gray-500'
  const sign  = diff > 0 ? '+' : ''
  return (
    <div className="flex justify-between text-xs bg-white rounded px-2 py-1">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${color}`}>
        {base}{unit} → {sim}{unit}
        <span className="ml-1 opacity-70">({sign}{diff}{unit})</span>
      </span>
    </div>
  )
}

function SeverityChip({ label, severity }: { label: string; severity: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-gray-400">{label}</span>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
        style={{ backgroundColor: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ?? '#9CA3AF' }}
      >
        {severity}
      </span>
    </div>
  )
}
