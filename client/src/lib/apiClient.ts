/**
 * Centralized API Client with Request Deduplication & Caching
 * Industry-standard solution for optimal API performance
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Global cache for responses
const responseCache = new Map<string, { data: unknown; timestamp: number }>();

// Global pending requests to prevent duplicates
const pendingRequests = new Map<string, Promise<unknown>>();

// Default cache duration: 5 minutes
const DEFAULT_CACHE_TIME = 5 * 60 * 1000;

// CSRF token cache
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

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
 * Fetch CSRF token from server
 */
async function getCsrfToken(): Promise<string> {
  // Return cached token if available
  if (csrfToken) {
    return csrfToken;
  }

  // Return existing promise if already fetching
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Fetch new token
  csrfTokenPromise = fetch(`${API_BASE_URL}/csrf-token`, {
    method: 'GET',
    credentials: 'include', // Include cookies for CSRF token
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      const data = await response.json();
      csrfToken = data.csrfToken;
      csrfTokenPromise = null;
      return csrfToken;
    })
    .catch((error) => {
      csrfTokenPromise = null;
      throw error;
    });

  return csrfTokenPromise;
}

/**
 * Clear CSRF token (call after logout or token refresh)
 */
function clearCsrfToken(): void {
  csrfToken = null;
  csrfTokenPromise = null;
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

  // Add CSRF token for state-changing methods
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (isStateChanging) {
    try {
      const token = await getCsrfToken();
      headers['X-CSRF-Token'] = token;
    } catch (error) {
      console.warn('Failed to get CSRF token:', error);
    }
  }

  // Create the request promise
  const requestPromise = fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Include cookies for CSRF token
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

    // Add CSRF token for uploads
    return getCsrfToken()
      .then((csrfToken) => {
        headers['X-CSRF-Token'] = csrfToken;
        return fetch(url, {
          ...options,
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include', // Include cookies for CSRF token
        });
      })
      .then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.error || error.message || 'Upload failed');
      }
      return response.json() as Promise<T>;
    });
  },

  // Clear all cache
  clearCache: () => {
    responseCache.clear();
    pendingRequests.clear();
    clearCsrfToken();
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
