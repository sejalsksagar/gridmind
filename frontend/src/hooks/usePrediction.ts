import { useState, useCallback } from 'react'
import type { EventInput, PredictionResponse } from '@/types'
import { predictEvent } from '@/services/api'

export function usePrediction() {
  const [result, setResult]     = useState<PredictionResponse | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const predict = useCallback(async (params: EventInput) => {
    setLoading(true)
    setError(null)
    try {
      const data = await predictEvent(params)
      setResult(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Prediction failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, isLoading, error, predict, reset }
}
