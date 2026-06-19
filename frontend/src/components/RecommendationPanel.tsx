import { useRef, useEffect } from 'react';
import type { ResourceRecommendation } from '../types';
import ResourceCard from './ResourceCard';
import Skeleton from './Skeleton';

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

export default function RecommendationPanel({ resources }: RecommendationPanelProps) {
  // Track the previous resources object so ResourceCard can animate between
  // the old and new counts whenever a new prediction or simulation lands.
  const previousResourcesRef = useRef<ResourceRecommendation | null>(null);

  useEffect(() => {
    previousResourcesRef.current = resources;
  }, [resources]);

  const previousResources = previousResourcesRef.current;

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 shadow-lg space-y-4">
      <h2 className="text-white text-sm font-semibold uppercase tracking-wide">Recommended Resources</h2>

      <div className="grid grid-cols-2 gap-3">
        {resources
          ? RESOURCE_CARDS.map((card) => (
              <ResourceCard
                key={card.key}
                icon={card.icon}
                label={card.label}
                value={resources[card.key]}
                previousValue={previousResources?.[card.key]}
              />
            ))
          : RESOURCE_CARDS.map((card) => (
              <div key={card.key} className="bg-slate-800 rounded-xl p-4">
                <Skeleton lines={2} />
              </div>
            ))}
      </div>

      {resources && <p className="text-slate-400 italic text-sm">{resources.rationale}</p>}
    </div>
  );
}
