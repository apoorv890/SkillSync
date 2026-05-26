import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Centralized API Client with Request Deduplication & Caching
 * Industry-standard solution for optimal API performance
 */

function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).trim().replace(/\/$/, '');
  }
  return '/api';
}

const API_BASE_URL = getApiBaseUrl();

// Global cache for responses
const responseCache = new Map<string, { data: unknown; timestamp: number }>();

// Global pending requests to prevent duplicates
const pendingRequests = new Map<string, Promise<unknown>>();

// Default cache duration: 5 minutes
const DEFAULT_CACHE_TIME = 5 * 60 * 1000;

interface RequestOptions extends RequestInit {
  skipCache?: boolean;
  cacheTime?: number;
  skipAuth?: boolean;
}

/**
 * Generate cache key from URL and options
 */
function getCacheKey(url: string, options?: RequestOptions): string {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Core API request function with deduplication and caching
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    skipCache = false,
    cacheTime = DEFAULT_CACHE_TIME,
    skipAuth = false,
    ...fetchOptions
  } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const method = fetchOptions.method || 'GET';
  const cacheKey = getCacheKey(url, fetchOptions);

  // Only cache GET requests
  const shouldCache = method === 'GET' && !skipCache;

  // Check cache first
  if (shouldCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data as T;
    }
  }

  // Check if request is already pending
  const pending = pendingRequests.get(cacheKey);
  if (pending) {
    return pending as Promise<T>;
  }

  // Add auth token if not skipped
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Create the request promise
  const requestPromise = fetch(url, {
    ...fetchOptions,
    headers,
  })
    .then(async (response) => {
      // Remove from pending requests
      pendingRequests.delete(cacheKey);

      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }))) as Record<string, unknown>;
        const msg =
          (typeof errBody.error === 'string' && errBody.error) ||
          (typeof errBody.message === 'string' && errBody.message) ||
          'Request failed';
        throw new Error(msg);
      }

      const data = await response.json();

      // Cache successful GET requests
      if (shouldCache) {
        responseCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return data as T;
    })
    .catch((error) => {
      // Remove from pending requests on error
      pendingRequests.delete(cacheKey);
      throw error;
    });

  // Store pending request
  pendingRequests.set(cacheKey, requestPromise);

  return requestPromise;
}

/**
 * API Client with typed methods
 */
export const apiClient = {
  // GET request
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  // POST request
  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // PUT request
  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // PATCH request
  patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // DELETE request
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  // Upload file (multipart/form-data)
  upload: <T>(endpoint: string, formData: FormData, options?: RequestOptions) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();

    const headers: HeadersInit = {
      ...options?.headers,
    };

    if (token && !options?.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      method: 'POST',
      headers,
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(
          (typeof error.error === 'string' && error.error) ||
            (typeof error.message === 'string' && error.message) ||
            'Upload failed'
        );
      }
      return response.json() as Promise<T>;
    });
  },

  // Clear all cache
  clearCache: () => {
    responseCache.clear();
    pendingRequests.clear();
  },

  // Clear specific cache entry
  clearCacheEntry: (endpoint: string, options?: RequestOptions) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const cacheKey = getCacheKey(url, options);
    responseCache.delete(cacheKey);
  },

  // Invalidate cache by pattern
  invalidateCache: (pattern: string) => {
    const keysToDelete: string[] = [];
    responseCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => responseCache.delete(key));
  },
};

// Export for backward compatibility
export default apiClient;

/**
 * React Hook for API calls with automatic deduplication and caching
 * Use this hook throughout the application for consistent API handling
 */

interface UseApiOptions {
  enabled?: boolean;
  cacheTime?: number;
  skipCache?: boolean;
  refetchTrigger?: number;
  onSuccess?: (data: unknown) => void;
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
export function useMutation<TData = unknown, TVariables = unknown>(
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
export function useUpload<T = unknown>() {
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

/**
 * API Request Cache and Deduplication Hook
 * Industry-standard solution for preventing duplicate API calls
 * Works with React StrictMode and production builds
 */

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
const globalCache = new Map<string, CacheEntry<unknown>>();
// TODO: renamed from pendingRequests — collides with apiClient pendingRequests in merged module
const hookPendingRequests = new Map<string, Promise<unknown>>();

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
    const pending = hookPendingRequests.get(key);
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
    hookPendingRequests.set(key, requestPromise);

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
      hookPendingRequests.delete(key);
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
  hookPendingRequests.clear();
}

// Utility to clear specific cache entry
export function clearCacheEntry(key: string) {
  globalCache.delete(key);
}
