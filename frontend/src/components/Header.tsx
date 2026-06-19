import { useState, useEffect } from 'react';

interface HeaderProps {
  hasSevereAlert: boolean;
  onRunDemo: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function Header({ hasSevereAlert, onRunDemo }: HeaderProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className={`h-14 flex-shrink-0 bg-navy-900 flex items-center justify-between px-5 border-b ${
        hasSevereAlert ? 'border-b-2 border-red-600' : 'border-slate-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">🚦</span>
        <h1 className="text-white font-bold text-base tracking-tight">GridMind</h1>
        <span className="text-slate-400 text-sm">AI Traffic Command Center</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-slate-400 text-xs font-medium data-mono uppercase tracking-wide">
            Live
          </span>
        </div>
        <button
          type="button"
          onClick={onRunDemo}
          className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
        >
          ⚡ Run Demo
        </button>
        <span className="text-slate-300 text-sm data-mono tabular-nums">{formatTime(now)}</span>
      </div>
    </header>
  );
}
