import MapView from './components/map/MapView';
import EventForm from './components/EventForm';
import { usePrediction } from './hooks/usePrediction';

function App() {
  const { predict, isLoading, result } = usePrediction();

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <header className="h-14 flex-shrink-0 bg-navy-900 border-b border-slate-800 flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚦</span>
          <h1 className="text-white font-semibold text-base tracking-tight">
            GridMind — AI Traffic Command Center
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-slate-400 text-xs font-medium data-mono uppercase tracking-wide">
            Live
          </span>
        </div>
      </header>

      {/* Main 3-column area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left column — Event Form */}
        <aside className="w-80 flex-shrink-0 bg-navy-900 border-r border-slate-800 overflow-y-auto">
          <div className="p-4">
            <EventForm onSubmit={predict} isLoading={isLoading} />
          </div>
        </aside>

        {/* Center column — Map */}
        <main className="flex-1 relative bg-slate-950">
          <MapView />
        </main>

        {/* Right column — Prediction */}
        <aside className="w-80 flex-shrink-0 bg-navy-900 border-l border-slate-800 overflow-y-auto">
          <div className="p-4">
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 shadow-lg">
              {result ? (
                <pre className="text-slate-300 text-xs whitespace-pre-wrap data-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <p className="text-slate-300 text-sm">Prediction — Day 1</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom strip — Simulation Controls */}
      <footer className="h-40 flex-shrink-0 bg-navy-900 border-t border-slate-800 p-4">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 h-full shadow-lg">
          <p className="text-slate-300 text-sm">Simulation Controls — Day 1</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
