import { useState, useEffect, useCallback } from 'react'
import { EventForm } from './components/EventForm'
import { PredictionPanel } from './components/PredictionPanel'
import { SimulationControls } from './components/SimulationControls'
import { MapView } from './components/map/MapView'
import { Card, EmptyState, ErrorBanner, LiveDot, Spinner } from './components/ui'
import { usePrediction } from './hooks/usePrediction'
import { useSimulation } from './hooks/useSimulation'
import { getColoredCorridors, checkHealth } from './services/api'
import type { EventInput, SimulationOverrides } from './types'

export default function App() {
  const [currentEvent, setCurrentEvent]   = useState<EventInput | null>(null)
  const [corridorGeo,  setCorridorGeo]    = useState<GeoJSON.FeatureCollection | null>(null)
  const [activeTab,    setActiveTab]      = useState<'predict' | 'simulate'>('predict')
  const [apiOnline,    setApiOnline]      = useState<boolean | null>(null)

  const { result: prediction, isLoading: predLoading, error: predError, predict } = usePrediction()
  const { result: simulation, isLoading: simLoading,  error: simError,  simulate } = useSimulation()

  // Health check on mount
  useEffect(() => {
    checkHealth()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false))
  }, [])

  // Fetch colored GeoJSON whenever prediction changes
  useEffect(() => {
    if (!prediction) return
    getColoredCorridors(prediction.affected_corridors)
      .then(setCorridorGeo)
      .catch(() => setCorridorGeo(null))
  }, [prediction])

  const handlePredict = useCallback(async (params: EventInput) => {
    setCurrentEvent(params)
    await predict(params)
    setActiveTab('predict')
  }, [predict])

  const handleSimulate = useCallback(async (overrides: SimulationOverrides) => {
    if (!currentEvent) return
    await simulate(currentEvent, overrides)
    setActiveTab('simulate')
  }, [currentEvent, simulate])

  const isAnyLoading = predLoading || simLoading

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚦</span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">GridMind</h1>
            <p className="text-xs text-gray-400">AI Traffic Command Center · Bengaluru</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {apiOnline !== null && <LiveDot online={apiOnline} />}
          {isAnyLoading && <Spinner size="sm" />}
        </div>
      </header>

      {/* ── Main Grid ── */}
      <main className="flex-1 grid grid-cols-[320px_1fr_320px] gap-3 p-3 min-h-0">

        {/* ─ Left: Event Form ─ */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          <Card title="🗓 Event Details">
            <EventForm onSubmit={handlePredict} isLoading={predLoading} />
          </Card>

          {/* Simulation Controls */}
          <Card title="⚙️ Simulation">
            {currentEvent
              ? (
                <SimulationControls
                  onSimulate={handleSimulate}
                  isLoading={simLoading}
                  result={simulation}
                />
              )
              : <EmptyState message="Run a prediction first to enable simulation." />
            }
            {simError && <ErrorBanner message={simError} />}
          </Card>
        </div>

        {/* ─ Center: Map ─ */}
        <div className="relative rounded-xl overflow-hidden shadow-md border border-gray-200"
             style={{ minHeight: '520px' }}>
          <MapView
            affectedCorridors={prediction?.affected_corridors ?? []}
            eventLat={currentEvent?.latitude}
            eventLon={currentEvent?.longitude}
            geoJSON={corridorGeo}
          />
          {isAnyLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-[2000]">
              <div className="bg-white rounded-lg shadow-lg px-6 py-4 flex items-center gap-3">
                <Spinner size="md" />
                <span className="text-sm font-medium text-gray-700">Running AI inference…</span>
              </div>
            </div>
          )}
        </div>

        {/* ─ Right: Results ─ */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">

          {/* Tab Switcher */}
          {(prediction || simulation) && (
            <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
              {(['predict', 'simulate'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  disabled={tab === 'simulate' && !simulation}
                  className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide transition-colors
                    ${activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                >
                  {tab === 'predict' ? '🔮 Prediction' : '🔄 Simulation'}
                </button>
              ))}
            </div>
          )}

          {/* Prediction Results */}
          {activeTab === 'predict' && (
            <Card title="Prediction Results" className="flex-1">
              {predError && <ErrorBanner message={predError} />}
              {predLoading && (
                <div className="flex justify-center py-8"><Spinner size="lg" /></div>
              )}
              {prediction && !predLoading && (
                <PredictionPanel prediction={prediction} />
              )}
              {!prediction && !predLoading && !predError && (
                <EmptyState message="Fill in the event details and click Predict Impact." />
              )}
            </Card>
          )}

          {/* Simulation Results */}
          {activeTab === 'simulate' && simulation && (
            <>
              <Card title="Before (Base)">
                <PredictionPanel prediction={simulation.base} />
              </Card>
              <Card title="After (Simulated)">
                <PredictionPanel prediction={simulation.simulated} />
              </Card>
            </>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-500 text-xs px-6 py-2 flex justify-between">
        <span>GridMind v1.0 · Gridlock Hackathon 2.0</span>
        <span>Data: Bengaluru Traffic Event Dataset · Model: LightGBM</span>
      </footer>
    </div>
  )
}
