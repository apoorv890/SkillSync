/**
 * API Request Cache and Deduplication Hook
 * Industry-standard solution for preventing duplicate API calls
 * Works with React StrictMode and production builds
 */

import { useEffect, useRef, useState } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface RequestState<T> {
  loading: boolean;
  data: T | null;
  error: Error | null;
}

// Global cache shared across all component instances
const globalCache = new Map<string, CacheEntry<any>>();
// Global pending requests to prevent duplicate fetches
const pendingRequests = new Map<string, Promise<any>>();

const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    cacheTime?: number;
    enabled?: boolean;
    refetchTrigger?: number;
  } = {}
): RequestState<T> & { refetch: () => Promise<void> } {
  const {
    cacheTime = DEFAULT_CACHE_TIME,
    enabled = true,
    refetchTrigger = 0,
  } = options;

  const [state, setState] = useState<RequestState<T>>({
    loading: true,
    data: null,
    error: null,
  });

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = async () => {
    // Check cache first
    const cached = globalCache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      if (isMountedRef.current) {
        setState({
          loading: false,
          data: cached.data,
          error: null,
        });
      }
      return;
    }

    // Check if request is already pending
    const pending = pendingRequests.get(key);
    if (pending) {
      try {
        const data = await pending;
        if (isMountedRef.current) {
          setState({
            loading: false,
            data,
            error: null,
          });
        }
      } catch (error) {
        if (isMountedRef.current) {
          setState({
            loading: false,
            data: null,
            error: error as Error,
          });
        }
      }
      return;
    }

    // Create new request
    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, loading: true }));
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    const requestPromise = fetcher();
    pendingRequests.set(key, requestPromise);

    try {
      const data = await requestPromise;

      // Update cache
      globalCache.set(key, {
        data,
        timestamp: Date.now(),
      });

      if (isMountedRef.current) {
        setState({
          loading: false,
          data,
          error: null,
        });
      }
    } catch (error) {
      if (isMountedRef.current) {
        setState({
          loading: false,
          data: null,
          error: error as Error,
        });
      }
    } finally {
      pendingRequests.delete(key);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [key, enabled, refetchTrigger]);

  const refetch = async () => {
    // Clear cache for this key
    globalCache.delete(key);
    await fetchData();
  };

  return {
    ...state,
    refetch,
  };
}

// Utility to clear all cache
export function clearApiCache() {
  globalCache.clear();
  pendingRequests.clear();
}

// Utility to clear specific cache entry
export function clearCacheEntry(key: string) {
  globalCache.delete(key);
}
