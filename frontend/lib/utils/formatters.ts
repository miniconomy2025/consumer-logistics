// Utility functions for formatting data

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format currency values
 */
export function formatCurrency(
  amount: number,
  decimals?: number,
  currency: string = 'ZAR',
  locale: string = 'en-ZA'
): string {
  // Handle overloaded parameters
  let actualDecimals = 2;
  let actualCurrency = currency;
  let actualLocale = locale;

  if (typeof decimals === 'string') {
    // Old signature: formatCurrency(amount, currency, locale)
    actualCurrency = decimals;
    actualLocale = currency;
    actualDecimals = 2;
  } else if (typeof decimals === 'number') {
    // New signature: formatCurrency(amount, decimals, currency, locale)
    actualDecimals = decimals;
  }

  return new Intl.NumberFormat(actualLocale, {
    style: 'currency',
    currency: actualCurrency,
    minimumFractionDigits: actualDecimals,
    maximumFractionDigits: actualDecimals,
  }).format(amount);
}

/**
 * Format large currency values with abbreviations
 */
export function formatCurrencyCompact(
  amount: number,
  currency: string = 'ZAR',
  locale: string = 'en-ZA'
): string {
  if (amount >= 1000000) {
    return `${formatCurrency(amount / 1000000, currency, locale).replace(/[^\d.,\s\w]/g, '')}M ${currency}`;
  } else if (amount >= 1000) {
    return `${formatCurrency(amount / 1000, currency, locale).replace(/[^\d.,\s\w]/g, '')}K ${currency}`;
  }
  return formatCurrency(amount, currency, locale);
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format numbers with thousand separators
 */
export function formatNumber(
  value: number,
  decimals?: number | string,
  locale: string = 'en-ZA',
  options?: Intl.NumberFormatOptions
): string {
  // Handle overloaded parameters
  let actualDecimals: number | undefined;
  let actualLocale = locale;
  let actualOptions = options;

  if (typeof decimals === 'string') {
    // Old signature: formatNumber(value, locale, options)
    actualLocale = decimals;
    actualOptions = locale as Intl.NumberFormatOptions;
  } else if (typeof decimals === 'number') {
    // New signature: formatNumber(value, decimals, locale, options)
    actualDecimals = decimals;
  }

  const formatOptions: Intl.NumberFormatOptions = {
    ...actualOptions,
  };

  if (actualDecimals !== undefined) {
    formatOptions.minimumFractionDigits = actualDecimals;
    formatOptions.maximumFractionDigits = actualDecimals;
  }

  return new Intl.NumberFormat(actualLocale, formatOptions).format(value);
}

/**
 * Format percentages
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = 'en-ZA'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format growth values with + or - sign
 */
export function formatGrowth(value: number, decimals: number = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Calculate growth rate between two values
 */
export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export function formatNumberCompact(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format dates for display
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
  locale: string = 'en-ZA'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
}

/**
 * Format date for API (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format relative time (e.g., "2 hours ago")
 * Note: This function should be used client-side only to prevent hydration mismatches
 */
export function formatRelativeTime(
  date: string | Date,
  locale: string = 'en-ZA',
  baseDate?: Date
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = baseDate || new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
}

/**
 * Format time duration (e.g., "2h 30m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

// ============================================================================
// STATUS FORMATTING
// ============================================================================

/**
 * Get status color based on status name
 */
export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'completed':
    case 'delivered':
    case 'active':
    case 'success':
      return 'text-green-600 bg-green-100';
    case 'pending':
    case 'in progress':
    case 'processing':
      return 'text-yellow-600 bg-yellow-100';
    case 'cancelled':
    case 'failed':
    case 'error':
      return 'text-red-600 bg-red-100';
    case 'inactive':
    case 'paused':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-blue-600 bg-blue-100';
  }
}

/**
 * Get growth color based on value
 */
export function getGrowthColor(growth: number): string {
  if (growth > 0) {
    return 'text-green-600';
  } else if (growth < 0) {
    return 'text-red-600';
  }
  return 'text-gray-600';
}

// ============================================================================
// CHART DATA FORMATTING
// ============================================================================

/**
 * Format data for chart tooltips
 */
export function formatChartTooltip(value: number, name: string): [string, string] {
  let formattedValue: string;
  
  if (name.toLowerCase().includes('revenue') || name.toLowerCase().includes('cost')) {
    formattedValue = formatCurrency(value);
  } else if (name.toLowerCase().includes('rate') || name.toLowerCase().includes('percentage')) {
    formattedValue = formatPercentage(value);
  } else {
    formattedValue = formatNumber(value);
  }
  
  return [formattedValue, name];
}

/**
 * Format chart axis labels
 */
export function formatChartAxisLabel(value: number, type: 'currency' | 'number' | 'percentage' = 'number'): string {
  switch (type) {
    case 'currency':
      return formatCurrencyCompact(value);
    case 'percentage':
      return formatPercentage(value);
    case 'number':
    default:
      return formatNumberCompact(value);
  }
}

// ============================================================================
// TABLE FORMATTING
// ============================================================================

/**
 * Format table cell values based on column type
 */
export function formatTableCell(
  value: any,
  type: 'currency' | 'number' | 'percentage' | 'date' | 'status' | 'text' = 'text'
): string {
  if (value === null || value === undefined) {
    return '-';
  }
  
  switch (type) {
    case 'currency':
      return formatCurrency(Number(value));
    case 'number':
      return formatNumber(Number(value));
    case 'percentage':
      return formatPercentage(Number(value));
    case 'date':
      return formatDate(value);
    case 'status':
      return String(value);
    case 'text':
    default:
      return String(value);
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a value is a valid number
 */
export function isValidNumber(value: any): boolean {
  return !isNaN(Number(value)) && isFinite(Number(value));
}

/**
 * Check if a value is a valid date
 */
export function isValidDate(value: any): boolean {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Safely parse number with fallback
 */
export function safeParseNumber(value: any, fallback: number = 0): number {
  const parsed = Number(value);
  return isValidNumber(parsed) ? parsed : fallback;
}

/**
 * Safely parse date with fallback
 * Note: Should be used client-side only to prevent hydration mismatches
 */
export function safeParseDate(value: any, fallback?: Date): Date {
  if (isValidDate(value)) {
    return new Date(value);
  }
  return fallback || new Date();
}
