import { useState, useCallback } from 'react'
import type { EventInput, SimulationOverrides, SimulationResponse } from '@/types'
import { simulateEvent } from '@/services/api'

export function useSimulation() {
  const [result, setResult]     = useState<SimulationResponse | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const simulate = useCallback(
    async (baseEvent: EventInput, overrides: SimulationOverrides) => {
      setLoading(true)
      setError(null)
      try {
        const data = await simulateEvent({ base_event: baseEvent, overrides })
        setResult(data)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Simulation failed'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, isLoading, error, simulate, reset }
}
