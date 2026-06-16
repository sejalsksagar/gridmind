import { useState } from 'react'
import type { EventInput, EventCause, VehType } from '@/types'
import { CORRIDORS, EVENT_CAUSES, VEH_TYPES } from '@/constants'

interface Props {
  onSubmit: (params: EventInput) => void
  isLoading: boolean
}

const DEFAULT_FORM: EventInput = {
  event_type:            'unplanned',
  event_cause:           'construction',
  latitude:              13.040004,
  longitude:             77.518099,
  requires_road_closure: true,
  corridor:              'Tumkur Road',
  start_datetime:        '2024-06-01T18:00:00+05:30',
  veh_type:              'Unknown',
}

export function EventForm({ onSubmit, isLoading }: Props) {
  const [form, setForm] = useState<EventInput>(DEFAULT_FORM)

  const set = <K extends keyof EventInput>(key: K, val: EventInput[K]) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Event Type */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Event Type
        </label>
        <div className="flex gap-2">
          {(['planned', 'unplanned'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => set('event_type', t)}
              className={`flex-1 py-1.5 rounded text-sm font-medium border transition-colors
                ${form.event_type === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Event Cause */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Event Cause
        </label>
        <select
          value={form.event_cause}
          onChange={e => set('event_cause', e.target.value as EventCause)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {EVENT_CAUSES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Corridor */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Corridor
        </label>
        <select
          value={form.corridor}
          onChange={e => set('corridor', e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Start Time */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Start Time (IST)
        </label>
        <input
          type="datetime-local"
          value={form.start_datetime.slice(0, 16)}
          onChange={e => set('start_datetime', e.target.value + ':00+05:30')}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Road Closure */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-500 uppercase">
          Road Closure
        </label>
        <button
          type="button"
          onClick={() => set('requires_road_closure', !form.requires_road_closure)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${form.requires_road_closure ? 'bg-red-500' : 'bg-gray-300'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
              ${form.requires_road_closure ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {/* Vehicle Type */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Vehicle Type <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </label>
        <select
          value={form.veh_type ?? 'Unknown'}
          onChange={e => set('veh_type', e.target.value as VehType)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {VEH_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                   text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
      >
        {isLoading ? '⏳ Predicting…' : '🔮 Predict Impact'}
      </button>
    </form>
  )
}
