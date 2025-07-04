/**
 * API utility functions for safe data transformation and validation
 */

/**
 * Safely transforms data with a fallback value
 * @param data - The data to transform
 * @param fallback - The fallback value if data is invalid
 * @returns The transformed data or fallback
 */
export function safeTransform<T>(data: unknown, fallback: T): T {
  if (data === null || data === undefined) {
    return fallback;
  }
  
  // If data is an object, merge with fallback to ensure all required properties exist
  if (typeof data === 'object' && typeof fallback === 'object' && !Array.isArray(data)) {
    return { ...fallback, ...data } as T;
  }
  
  return data as T;
}

/**
 * Ensures the input is an array, returns fallback if not
 * @param data - The data to check
 * @param fallback - The fallback array if data is not an array
 * @returns An array
 */
export function ensureArray<T>(data: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  return fallback;
}

/**
 * Safely gets a nested property from an object
 * @param obj - The object to get the property from
 * @param path - The path to the property (e.g., 'user.profile.name')
 * @param fallback - The fallback value if property doesn't exist
 * @returns The property value or fallback
 */
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  if (!obj || typeof obj !== 'object') {
    return fallback;
  }
  
  const keys = path.split('.');
  let current: any = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return fallback;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : fallback;
}

/**
 * Validates that an object has required properties
 * @param obj - The object to validate
 * @param requiredProps - Array of required property names
 * @returns True if all required properties exist
 */
export function hasRequiredProps(obj: unknown, requiredProps: string[]): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  return requiredProps.every(prop => prop in obj);
}

/**
 * Sanitizes string input by removing potentially harmful characters
 * @param input - The string to sanitize
 * @returns The sanitized string
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially harmful characters but keep basic punctuation
  return input.replace(/[<>\"'&]/g, '').trim();
}

/**
 * Formats API error messages for display
 * @param error - The error object
 * @returns A user-friendly error message
 */
export function formatApiError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    
    // Check for common error message properties
    if (errorObj.message) {
      return errorObj.message;
    }
    
    if (errorObj.error) {
      return typeof errorObj.error === 'string' ? errorObj.error : 'An error occurred';
    }
    
    if (errorObj.details) {
      return errorObj.details;
    }
  }
  
  return 'An unexpected error occurred';
}

/**
 * Validates and normalizes pagination parameters
 * @param params - The pagination parameters
 * @returns Normalized pagination parameters
 */
export function normalizePaginationParams(params: {
  page?: number;
  limit?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}): {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  // Ensure sortOrder is always valid
  const normalizedSortOrder = params.sortOrder?.toLowerCase();
  const validSortOrder = normalizedSortOrder === 'asc' || normalizedSortOrder === 'desc'
    ? normalizedSortOrder
    : 'desc';

  return {
    page: Math.max(1, params.page || 1),
    pageSize: Math.min(100, Math.max(1, params.pageSize || params.limit || 10)),
    sortBy: sanitizeString(params.sortBy) || 'pickupDate',
    sortOrder: validSortOrder,
  };
}
