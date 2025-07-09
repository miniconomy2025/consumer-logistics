import { ErrorResponse } from '../types/api';

const API_BASE_URL = 'http://consumer-logistics-env.eba-nicq2ju3.af-south-1.elasticbeanstalk.com/api';

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

export async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = { method: 'GET' }
): Promise<T> {
  const { method, headers = {}, body, params } = config;
  
  const url = buildUrl(endpoint, params);
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  const finalHeaders = { ...defaultHeaders, ...headers };
  
  const fetchOptions: RequestInit = {
    method,
    headers: finalHeaders,
  };
  
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, fetchOptions);
    
    if (response.status === 204) {
      return {} as T;
    }
    
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
    
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    );
  }
}

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

export async function checkApiHealth(): Promise<{ status: string; message: string; timestamp: string; uptime: number }> {
  return api.get('/health');
}

export function handleApiResponse<T>(response: T): T {
  return response;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isNetworkError(error: unknown): boolean {
  return isApiError(error) && error.code === 'NETWORK_ERROR';
}

export function isValidationError(error: unknown): boolean {
  return isApiError(error) && error.status === 400;
}

export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}

export function isServerError(error: unknown): boolean {
  return isApiError(error) && error.status >= 500;
}
