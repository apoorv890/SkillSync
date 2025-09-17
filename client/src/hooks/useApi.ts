/**
 * React Hook for API calls with automatic deduplication and caching
 * Use this hook throughout the application for consistent API handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../lib/apiClient';

interface UseApiOptions {
  enabled?: boolean;
  cacheTime?: number;
  skipCache?: boolean;
  refetchTrigger?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for GET requests with automatic caching and deduplication
 */
export function useApi<T>(
  endpoint: string,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const {
    enabled = true,
    cacheTime = 5 * 60 * 1000,
    skipCache = false,
    refetchTrigger = 0,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const result = await apiClient.get<T>(endpoint, {
        cacheTime,
        skipCache,
      });

      if (isMountedRef.current) {
        setData(result);
        setError(null);
        onSuccess?.(result);
      }
    } catch (err) {
      const error = err as Error;
      if (isMountedRef.current) {
        setError(error);
        onError?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint, enabled, cacheTime, skipCache, onSuccess, onError]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData, refetchTrigger]);

  const refetch = useCallback(async () => {
    apiClient.clearCacheEntry(endpoint);
    await fetchData();
  }, [endpoint, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for mutations (POST, PUT, PATCH, DELETE)
 */
export function useMutation<TData = any, TVariables = any>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(
    async (variables?: TVariables): Promise<TData> => {
      try {
        setLoading(true);
        setError(null);

        let result: TData;

        switch (method) {
          case 'POST':
            result = await apiClient.post<TData>(endpoint, variables);
            break;
          case 'PUT':
            result = await apiClient.put<TData>(endpoint, variables);
            break;
          case 'PATCH':
            result = await apiClient.patch<TData>(endpoint, variables);
            break;
          case 'DELETE':
            result = await apiClient.delete<TData>(endpoint);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        if (isMountedRef.current) {
          setError(null);
        }

        return result;
      } catch (err) {
        const error = err as Error;
        if (isMountedRef.current) {
          setError(error);
        }
        throw error;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [endpoint, method]
  );

  return {
    mutate,
    loading,
    error,
  };
}

/**
 * Hook for file uploads
 */
export function useUpload<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const upload = useCallback(
    async (endpoint: string, formData: FormData): Promise<T> => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        const result = await apiClient.upload<T>(endpoint, formData);

        if (isMountedRef.current) {
          setProgress(100);
          setError(null);
        }

        return result;
      } catch (err) {
        const error = err as Error;
        if (isMountedRef.current) {
          setError(error);
        }
        throw error;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  return {
    upload,
    loading,
    error,
    progress,
  };
}
