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
  _currency: string = 'Ð',
  locale: string = 'en-ZA'
): string {
  // Handle overloaded parameters
  let actualDecimals = 2;
  let actualLocale = locale;

  if (typeof decimals === 'string') {
    // Old signature: formatCurrency(amount, currency, locale)
    actualLocale = decimals;
    actualDecimals = 2;
  } else if (typeof decimals === 'number') {
    // New signature: formatCurrency(amount, decimals, currency, locale)
    actualDecimals = decimals;
  }

  // Format as a number and prepend with Ð
  const formatted = new Intl.NumberFormat(actualLocale, {
    minimumFractionDigits: actualDecimals,
    maximumFractionDigits: actualDecimals,
  }).format(amount);

  return `Ð${formatted}`;
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







// ============================================================================
// STATUS FORMATTING
// ============================================================================



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
