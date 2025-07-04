// Custom React Hooks for API Data Fetching

import React, { useState, useEffect, useCallback } from 'react';
import { getErrorMessage } from '../api/client';

// ============================================================================
// GENERIC API HOOK
// ============================================================================

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
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

// ============================================================================
// MUTATION HOOK
// ============================================================================

export interface UseMutationState<T, V = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
  mutate: (variables?: V) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for API mutations (POST, PUT, DELETE)
 */
export function useMutation<T, V = unknown>(
  mutationFn: (variables: V) => Promise<T>
): UseMutationState<T, V> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (variables?: V): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await mutationFn(variables as V);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [mutationFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    mutate,
    reset,
  };
}

// ============================================================================
// PAGINATED DATA HOOK
// ============================================================================

export interface UsePaginatedApiState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for paginated API calls
 */
export function usePaginatedApi<T>(
  apiCall: (page: number, limit: number) => Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>,
  limit: number = 10,
  dependencies: React.DependencyList = []
): UsePaginatedApiState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall(page, limit);
      setData(result.data);
      setTotalPages(result.pagination.totalPages);
      setHasNext(result.pagination.hasNext);
      setHasPrev(result.pagination.hasPrev);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, ...dependencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const nextPage = useCallback(() => {
    if (hasNext) {
      setPage(prev => prev + 1);
    }
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) {
      setPage(prev => prev - 1);
    }
  }, [hasPrev]);

  return {
    data,
    loading,
    error,
    page,
    totalPages,
    hasNext,
    hasPrev,
    setPage,
    nextPage,
    prevPage,
    refetch: fetchData,
  };
}

// ============================================================================
// SEARCH HOOK
// ============================================================================

export interface UseSearchState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  query: string;
  setQuery: (query: string) => void;
  search: (searchQuery: string) => Promise<void>;
  clear: () => void;
}

/**
 * Hook for search functionality
 */
export function useSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  debounceMs: number = 300
): UseSearchState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setData([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const results = await searchFn(searchQuery);
      setData(results);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [searchFn]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, search, debounceMs]);

  const clear = useCallback(() => {
    setQuery('');
    setData([]);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    query,
    setQuery,
    search,
    clear,
  };
}

// ============================================================================
// OPTIMISTIC UPDATE HOOK
// ============================================================================

export interface UseOptimisticState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  optimisticAdd: (item: T) => void;
  optimisticUpdate: (id: string | number, updates: Partial<T>) => void;
  optimisticRemove: (id: string | number) => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for optimistic updates
 */
export function useOptimistic<T extends { id?: string | number }>(
  fetchFn: () => Promise<T[]>,
  dependencies: React.DependencyList = []
): UseOptimisticState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const optimisticAdd = useCallback((item: T) => {
    setData(prev => [...prev, item]);
  }, []);

  const optimisticUpdate = useCallback((id: string | number, updates: Partial<T>) => {
    setData(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const optimisticRemove = useCallback((id: string | number) => {
    setData(prev => prev.filter(item => item.id !== id));
  }, []);

  return {
    data,
    loading,
    error,
    optimisticAdd,
    optimisticUpdate,
    optimisticRemove,
    refetch: fetchData,
  };
}
