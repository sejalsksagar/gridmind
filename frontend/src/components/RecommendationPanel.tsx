import type { ResourceRecommendation } from '../types';

interface RecommendationPanelProps {
  resources: ResourceRecommendation | null;
}

interface ResourceCardData {
  key: keyof Pick<ResourceRecommendation, 'officers' | 'barricades' | 'diversions' | 'signal_overrides'>;
  icon: string;
  label: string;
}

const RESOURCE_CARDS: ResourceCardData[] = [
  { key: 'officers', icon: '🛡️', label: 'Officers' },
  { key: 'barricades', icon: '🚧', label: 'Barricades' },
  { key: 'diversions', icon: '🔀', label: 'Diversions' },
  { key: 'signal_overrides', icon: '🚦', label: 'Signal Overrides' },
];

function SkeletonCard() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 text-center space-y-2">
      <div className="h-8 w-10 bg-slate-700 rounded animate-pulse mx-auto" />
      <div className="h-3 w-16 bg-slate-700 rounded animate-pulse mx-auto" />
    </div>
  );
}

export default function RecommendationPanel({ resources }: RecommendationPanelProps) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 shadow-lg space-y-4">
      <h2 className="text-white text-sm font-semibold uppercase tracking-wide">Recommended Resources</h2>

      <div className="grid grid-cols-2 gap-3">
        {resources
          ? RESOURCE_CARDS.map((card) => (
              <div key={card.key} className="bg-slate-800 rounded-xl p-4 text-center">
                <div className="text-xl mb-1">{card.icon}</div>
                <div className="text-white text-2xl font-bold data-mono">{resources[card.key]}</div>
                <div className="text-slate-400 text-xs mt-1">{card.label}</div>
              </div>
            ))
          : RESOURCE_CARDS.map((card) => <SkeletonCard key={card.key} />)}
      </div>

      {resources && <p className="text-slate-400 italic text-sm">{resources.rationale}</p>}
    </div>
  );
}
