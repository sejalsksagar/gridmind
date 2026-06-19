import type { CongestionClass } from '../types';

interface SeverityBadgeProps {
  severity: CongestionClass;
  size?: 'sm' | 'md' | 'lg';
}

const SEVERITY_STYLES: Record<CongestionClass, { container: string; dot: string; pulsing: boolean }> = {
  Severe: { container: 'bg-red-950 text-white', dot: 'bg-red-500', pulsing: true },
  High: { container: 'bg-red-100 text-red-800', dot: 'bg-red-600', pulsing: false },
  Medium: { container: 'bg-amber-100 text-amber-800', dot: 'bg-amber-600', pulsing: false },
  Low: { container: 'bg-green-100 text-green-800', dot: 'bg-green-600', pulsing: false },
};

const SIZE_STYLES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-xs px-2 py-1',
  md: 'text-base px-4 py-2',
  lg: 'text-2xl px-6 py-3',
};

export default function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const styles = SEVERITY_STYLES[severity];

  return (
    <span
      className={`inline-flex items-center gap-2 font-bold uppercase rounded-md ${styles.container} ${SIZE_STYLES[size]}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {styles.pulsing && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${styles.dot} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${styles.dot}`} />
      </span>
      {severity}
    </span>
  );
}
