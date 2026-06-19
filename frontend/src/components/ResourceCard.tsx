import { useState, useEffect, useRef } from 'react';

interface ResourceCardProps {
  icon: string;
  label: string;
  value: number;
  previousValue?: number;
}

const ANIMATION_DURATION_MS = 600;

export default function ResourceCard({ icon, label, value, previousValue }: ResourceCardProps) {
  const [displayValue, setDisplayValue] = useState(previousValue ?? value);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = previousValue ?? value;
    if (startValue === value) {
      setDisplayValue(value);
      return;
    }

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      const current = Math.round(startValue + (value - startValue) * progress);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const diff = previousValue !== undefined ? value - previousValue : 0;

  return (
    <div className="bg-slate-800 rounded-xl p-4 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-white text-2xl font-bold data-mono">{displayValue}</div>
      <div className="text-slate-400 text-xs mt-1">{label}</div>
      {diff !== 0 && (
        <div className={`text-xs font-semibold mt-1 data-mono ${diff < 0 ? 'text-green-400' : 'text-red-400'}`}>
          {diff < 0 ? `▼ ${diff}` : `▲ +${diff}`}
        </div>
      )}
    </div>
  );
}
