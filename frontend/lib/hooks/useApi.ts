import React, { useState, useEffect, useCallback } from 'react';
import { getErrorMessage } from '../api/client';
export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  // When background = true, keeps previous data and doesn't toggle loading
  refetch: (background?: boolean) => Promise<void>;
}

/**
 * Generic hook for API calls
 */
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: React.DependencyList = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (background: boolean = false) => {
    try {
      if (!background) {
        setLoading(true);
      }
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
