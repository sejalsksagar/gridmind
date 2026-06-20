import { useState } from 'react';
import MapView from './components/map/MapView';
import EventForm from './components/EventForm';
import Header from './components/Header';
import Toast from './components/Toast';
import PredictionPanel from './components/PredictionPanel';
import RecommendationPanel from './components/RecommendationPanel';
import SimulationControls from './components/SimulationControls';
import DeltaDisplay from './components/DeltaDisplay';
import CorridorOverlay from './components/map/CorridorOverlay';
import HeatmapLayer from './components/map/HeatmapLayer';
import EventMarker from './components/map/EventMarker';
import DiversionOverlay from './components/map/DiversionOverlay';
import {
  predictEvent,
  simulateEvent,
  getCorridorGeoJSON,
  getDiversion,
} from './api/client';
import { DEMO_SCENARIOS } from './constants/demoScenarios';
import type {
  EventParams,
  PredictionResponse,
  SimulationResponse,
  SimulationOverrides,
  HeatPoint,
} from './types';

type ActiveView = 'predict' | 'simulate';

// Hardcoded diversion endpoints for the demo — real corridor-to-route mapping
// would come from the backend, but for the hackathon flow we pick a sensible
// fixed alternate route per corridor.
const DIVERSION_ENDPOINTS: Record<string, { from: [number, number]; to: [number, number] }> = {
  'Tumkur Road': { from: [13.040004, 77.518099], to: [13.066721, 77.470123] },
  'Mysore Road': { from: [12.9352, 77.4905], to: [12.95, 77.51] },
};
const DEFAULT_DIVERSION_ENDPOINT = { from: [12.97, 77.59] as [number, number], to: [12.98, 77.56] as [number, number] };

function App() {
  const [eventParams, setEventParams] = useState<EventParams | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [corridorGeoJSON, setCorridorGeoJSON] = useState<any | null>(null);
  const [diversionRoute, setDiversionRoute] = useState<[number, number][] | null>(null);
  const [mapInstance, setMapInstance] = useState<MapInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('predict');
  const [error, setError] = useState<string | null>(null);
  const [corridorsLoading, setCorridorsLoading] = useState(false);
  const [diversionLoading, setDiversionLoading] = useState(false);

  // The heatmap always reflects whichever prediction is currently "on screen":
  // the base prediction on the Prediction tab, or the simulated (post-override)
  // result on the Simulation tab once one exists. No separate fetch — both
  // PredictionResponse objects already carry heatmap_points inline (v2.1).
  const activeHeatmapPoints: HeatPoint[] =
    activeView === 'simulate' && simulation ? simulation.simulated.heatmap_points : prediction?.heatmap_points ?? [];

  async function handlePredict(params: EventParams) {
  // Clear previous overlays
  setPrediction(null);
setCorridorGeoJSON(null);
console.log('CLEARING DIVERSION');
  setDiversionRoute(null);
  setSimulation(null);

  setEventParams(params);
  setIsLoading(true);
  setError(null);

  try {
    const result = await predictEvent(params);
    setPrediction(result);

    const severityMap = Object.fromEntries(
      result.affected_corridors.map((corridor) => [
        corridor.name,
        corridor.severity,
      ])
    );

    setCorridorsLoading(true);
    const geojson = await getCorridorGeoJSON(severityMap);
    setCorridorGeoJSON(geojson);
    setCorridorsLoading(false);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Prediction failed');
  } finally {
    setIsLoading(false);
    setCorridorsLoading(false);
  }
}

  async function handleSimulate(overrides: SimulationOverrides) {
    if (!eventParams) {
      setError('Submit an event before running a simulation');
      return;
    }
    setIsSimulating(true);
    setError(null);
    try {
      const result = await simulateEvent(eventParams, overrides);
      setSimulation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleActivateDiversion() {
    if (!prediction) return;
    const primaryCorridor = prediction.affected_corridors[0]?.name;
    const endpoint = (primaryCorridor && DIVERSION_ENDPOINTS[primaryCorridor]) || DEFAULT_DIVERSION_ENDPOINT;

    setError(null);
    setDiversionLoading(true);
    try {
      const result = await getDiversion(endpoint.from[0], endpoint.from[1], endpoint.to[0], endpoint.to[1], primaryCorridor);
      setDiversionRoute(result.route_coordinates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diversion route failed');
    } finally {
      setDiversionLoading(false);
    }
  }

  // Recovery button for the live demo: one click resets to the canonical
  // Tumkur Severe scenario and runs the full predict flow, regardless of
  // whatever state the presenter has gotten the form into.
  function handleRunDemo() {
    const demoEvent = DEMO_SCENARIOS[0].event;
    handlePredict(demoEvent);
  }

  const showDiversionButton =
    prediction && (prediction.congestion_class === 'High' || prediction.congestion_class === 'Severe');

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Error toast */}
      {error && <Toast message={error} type="error" onDismiss={() => setError(null)} />}

      {/* Header */}
      <Header hasSevereAlert={prediction?.congestion_class === 'Severe'} onRunDemo={handleRunDemo} />

      {/* Main 3-column area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column — Event Form */}
        <aside className="w-80 flex-shrink-0 bg-navy-900 border-r border-slate-800 overflow-y-auto">
          <div className="p-4">
            <EventForm onSubmit={handlePredict} isLoading={isLoading} />
          </div>
        </aside>

        {/* Center column — Map */}
        <main className="flex-1 relative bg-slate-950">
          <MapView
            onMapReady={setMapInstance}
            corridorsLoading={corridorsLoading}
            diversionLoading={diversionLoading}
          />
          <CorridorOverlay geojson={corridorGeoJSON} mapInstance={mapInstance} />
          <HeatmapLayer points={activeHeatmapPoints} mapInstance={mapInstance} />
          <DiversionOverlay key={diversionRoute ? 'active' : 'none'} routeCoordinates={diversionRoute} mapInstance={mapInstance} />
          <EventMarker
            lat={eventParams?.latitude ?? null}
            lng={eventParams?.longitude ?? null}
            mapInstance={mapInstance}
            label={eventParams?.corridor ?? ''}
          />
        </main>

        {/* Right column — Tabbed Prediction / Simulation */}
        <aside className="w-80 flex-shrink-0 bg-navy-900 border-l border-slate-800 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Tab group */}
            <div className="flex rounded-md bg-slate-800 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveView('predict')}
                className={`flex-1 py-1.5 rounded-md transition-colors ${
                  activeView === 'predict' ? 'bg-slate-700 text-white' : 'text-slate-400'
                }`}
              >
                Prediction
              </button>
              <button
                type="button"
                onClick={() => setActiveView('simulate')}
                className={`flex-1 py-1.5 rounded-md transition-colors ${
                  activeView === 'simulate' ? 'bg-slate-700 text-white' : 'text-slate-400'
                }`}
              >
                Simulation
              </button>
            </div>

            {activeView === 'predict' && (
              <>
                <PredictionPanel prediction={prediction} isLoading={isLoading} />
                <RecommendationPanel resources={prediction?.resources ?? null} />
                {showDiversionButton && (
                  <button
                    type="button"
                    onClick={handleActivateDiversion}
                    className="w-full bg-green-700 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-md transition-colors"
                  >
                    🔀 Activate Diversion Route
                  </button>
                )}
              </>
            )}

            {activeView === 'simulate' && (
              <>
                {prediction ? (
                  <SimulationControls onSimulate={handleSimulate} isLoading={isSimulating} />
                ) : (
                  <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 shadow-lg">
                    <p className="text-slate-400 text-sm">Run a prediction first to enable simulation.</p>
                  </div>
                )}
                <DeltaDisplay simulation={simulation} />
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom strip */}
      <footer className="h-40 flex-shrink-0 bg-navy-900 border-t border-slate-800 p-4">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 h-full shadow-lg flex items-center">
          <p className="text-slate-400 text-sm">
            {eventParams
              ? `Active event: ${eventParams.corridor} — ${eventParams.event_cause.replace(/_/g, ' ')}`
              : 'No active event. Submit the form to begin.'}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
