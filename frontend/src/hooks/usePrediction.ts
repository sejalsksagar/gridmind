import { useState, useCallback } from 'react';
import type { EventParams, PredictionResponse } from '../types';
import { predictEvent } from '../api/client';

export function usePrediction() {
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(async (params: EventParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await predictEvent(params);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { predict, isLoading, error, result };
}
