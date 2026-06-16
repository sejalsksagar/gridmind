import type { CongestionClass } from '@/types'
import { SEVERITY_BADGE_CLASS } from '@/constants'

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }[size]
  return (
    <svg className={`animate-spin ${s} text-blue-500`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

export function SeverityBadge({ severity }: { severity: CongestionClass }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${SEVERITY_BADGE_CLASS[severity]}`}>
      {severity}
    </span>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  title, children, className = '',
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{title}</h2>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center text-gray-400">
      <span className="text-4xl mb-2">🗺️</span>
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 flex gap-2">
      <span>⚠️</span>
      <span>{message}</span>
    </div>
  )
}

// ─── Live Status Dot ──────────────────────────────────────────────────────────

export function LiveDot({ online }: { online: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
      <span className={online ? 'text-green-600' : 'text-gray-500'}>
        {online ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}
