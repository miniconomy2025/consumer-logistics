// API Client Configuration and Base HTTP Client

import { ErrorResponse } from '../types/api';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Custom API Error Class
export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: Record<string, unknown>;
  public requestId?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

// HTTP Client Configuration
interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: Record<string, unknown> | string | FormData;
  params?: Record<string, string | number | boolean | undefined>;
}

// Helper function to filter out undefined values
function filterParams(params?: Record<string, string | number | boolean | undefined>): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;

  const filtered: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      filtered[key] = value;
    }
  });

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

// Build URL with query parameters
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);

  const filteredParams = filterParams(params);
  if (filteredParams) {
    Object.entries(filteredParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

// Main HTTP Client Function
export async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = { method: 'GET' }
): Promise<T> {
  const { method, headers = {}, body, params } = config;
  
  // Build URL with query parameters
  const url = buildUrl(endpoint, params);
  
  // Default headers
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Merge headers
  const finalHeaders = { ...defaultHeaders, ...headers };
  
  // Build fetch options
  const fetchOptions: RequestInit = {
    method,
    headers: finalHeaders,
  };
  
  // Add body for non-GET requests
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }
  
  try {
    console.log(`[API] ${method} ${url}`);
    
    const response = await fetch(url, fetchOptions);
    
    // Handle non-JSON responses (like 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }
    
    // Parse response
    let responseData: unknown;
    try {
      responseData = await response.json();
    } catch {
      throw new ApiError(
        'Invalid JSON response from server',
        response.status,
        'INVALID_RESPONSE'
      );
    }
    
    // Handle error responses
    if (!response.ok) {
      const errorResponse = responseData as ErrorResponse;
      throw new ApiError(
        errorResponse.message || `HTTP ${response.status}`,
        response.status,
        errorResponse.code,
        errorResponse.details,
        errorResponse.requestId
      );
    }
    
    return responseData as T;
    
  } catch (error) {
    // Handle network errors
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        'Network error - unable to connect to server',
        0,
        'NETWORK_ERROR'
      );
    }
    
    // Handle other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

// Convenience methods for different HTTP methods
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: Record<string, unknown> | string | FormData, params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<T>(endpoint, { method: 'POST', body, params }),

  put: <T>(endpoint: string, body?: Record<string, unknown> | string | FormData, params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<T>(endpoint, { method: 'PUT', body, params }),

  patch: <T>(endpoint: string, body?: Record<string, unknown> | string | FormData, params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body, params }),

  delete: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<T>(endpoint, { method: 'DELETE', params }),
};

// Health check function
export async function checkApiHealth(): Promise<{ status: string; message: string; timestamp: string; uptime: number }> {
  return api.get('/health');
}

// Request interceptor for adding authentication headers (if needed in future)
export function setAuthToken(token: string) {
  // This can be implemented when authentication is added
  console.log('Auth token set:', token);
}

// Response interceptor for handling common response patterns
export function handleApiResponse<T>(response: T): T {
  // This can be extended for common response transformations
  return response;
}

// Utility function to handle API errors in components
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

// Utility function to check if error is a specific type
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

// Utility function to check if error is a network error
export function isNetworkError(error: unknown): boolean {
  return isApiError(error) && error.code === 'NETWORK_ERROR';
}

// Utility function to check if error is a validation error
export function isValidationError(error: unknown): boolean {
  return isApiError(error) && error.status === 400;
}

// Utility function to check if error is a not found error
export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}

// Utility function to check if error is a server error
export function isServerError(error: unknown): boolean {
  return isApiError(error) && error.status >= 500;
}
