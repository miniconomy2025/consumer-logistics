// Chart utility functions and configurations

import { formatCurrency, formatNumber, formatPercentage } from './formatters';

// ============================================================================
// CHART COLORS
// ============================================================================

export const chartColors = {
  primary: '#64748b',
  secondary: '#6b7280',
  accent: '#78716c',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  neutral: '#71717a',
};

export const chartColorPalette = [
  '#64748b',
  '#6b7280',
  '#78716c',
  '#71717a',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

// ============================================================================
// CHART CONFIGURATIONS
// ============================================================================

/**
 * Default chart margins
 */
export const defaultMargins = {
  top: 20,
  right: 30,
  left: 20,
  bottom: 5,
};

/**
 * Responsive chart dimensions
 */
export const responsiveChartConfig = {
  width: '100%',
  height: 300,
  margin: defaultMargins,
};

/**
 * Default tooltip configuration
 */
export const defaultTooltipConfig = {
  contentStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  labelStyle: {
    color: '#374151',
    fontWeight: 'bold',
  },
  itemStyle: {
    color: '#6b7280',
  },
};

// ============================================================================
// CHART DATA TRANSFORMERS
// ============================================================================

/**
 * Transform API data for line charts
 */
export function transformLineChartData<T extends Record<string, any>>(
  data: T[],
  xKey: keyof T,
  yKey: keyof T,
  nameKey?: keyof T
): Array<{ x: string | number; y: number; name?: string }> {
  return data.map(item => ({
    x: item[xKey],
    y: Number(item[yKey]) || 0,
    ...(nameKey && { name: item[nameKey] }),
  }));
}

/**
 * Transform API data for pie charts
 */
export function transformPieChartData<T extends Record<string, any>>(
  data: T[],
  nameKey: keyof T,
  valueKey: keyof T
): Array<{ name: string; value: number; percentage: number }> {
  const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);
  
  return data.map(item => {
    const value = Number(item[valueKey]) || 0;
    return {
      name: String(item[nameKey]),
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    };
  });
}

/**
 * Transform API data for bar charts
 */
export function transformBarChartData<T extends Record<string, any>>(
  data: T[],
  categoryKey: keyof T,
  valueKeys: (keyof T)[]
): Array<Record<string, string | number>> {
  return data.map(item => {
    const result: Record<string, string | number> = {
      category: String(item[categoryKey]),
    };
    
    valueKeys.forEach(key => {
      result[String(key)] = Number(item[key]) || 0;
    });
    
    return result;
  });
}

/**
 * Transform API data for area charts
 */
export function transformAreaChartData<T extends Record<string, any>>(
  data: T[],
  xKey: keyof T,
  yKeys: (keyof T)[]
): Array<Record<string, string | number>> {
  return data.map(item => {
    const result: Record<string, string | number> = {
      x: String(item[xKey]),
    };
    
    yKeys.forEach(key => {
      result[String(key)] = Number(item[key]) || 0;
    });
    
    return result;
  });
}

// ============================================================================
// CHART FORMATTERS
// ============================================================================

/**
 * Format chart tooltip values
 */
export function formatTooltipValue(
  value: number,
  type: 'currency' | 'number' | 'percentage' = 'number'
): string {
  switch (type) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      return formatPercentage(value);
    case 'number':
    default:
      return formatNumber(value);
  }
}

/**
 * Format chart axis labels
 */
export function formatAxisLabel(
  value: number,
  type: 'currency' | 'number' | 'percentage' = 'number'
): string {
  switch (type) {
    case 'currency':
      if (value >= 1000000) {
        return `R${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `R${(value / 1000).toFixed(1)}K`;
      }
      return `R${value}`;
    case 'percentage':
      return `${value}%`;
    case 'number':
    default:
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toString();
  }
}

// ============================================================================
// CHART HELPERS
// ============================================================================

/**
 * Get color for chart data point
 */
export function getChartColor(index: number): string {
  return chartColorPalette[index % chartColorPalette.length];
}

/**
 * Generate gradient colors for charts
 */
export function generateGradientColors(baseColor: string, steps: number): string[] {
  // This is a simplified version - in a real app you might use a color manipulation library
  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    const opacity = 0.3 + (0.7 * i) / (steps - 1);
    colors.push(`${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);
  }
  return colors;
}

/**
 * Calculate chart dimensions based on container
 */
export function calculateChartDimensions(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number = 16 / 9
): { width: number; height: number } {
  const calculatedHeight = containerWidth / aspectRatio;
  
  if (calculatedHeight <= containerHeight) {
    return { width: containerWidth, height: calculatedHeight };
  } else {
    return { width: containerHeight * aspectRatio, height: containerHeight };
  }
}

/**
 * Get trend direction from data
 */
export function getTrendDirection(data: number[]): 'up' | 'down' | 'stable' {
  if (data.length < 2) return 'stable';
  
  const first = data[0];
  const last = data[data.length - 1];
  const threshold = 0.05; // 5% threshold for stability
  
  const change = (last - first) / first;
  
  if (Math.abs(change) < threshold) return 'stable';
  return change > 0 ? 'up' : 'down';
}

/**
 * Calculate moving average for trend lines
 */
export function calculateMovingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const end = i + 1;
    const slice = data.slice(start, end);
    const average = slice.reduce((sum, val) => sum + val, 0) / slice.length;
    result.push(average);
  }
  
  return result;
}

// ============================================================================
// CHART ANIMATIONS
// ============================================================================

/**
 * Default animation configuration for charts
 */
export const defaultAnimationConfig = {
  animationBegin: 0,
  animationDuration: 800,
  animationEasing: 'ease-out' as const,
};

/**
 * Staggered animation configuration for multiple elements
 */
export function getStaggeredAnimationConfig(index: number, total: number) {
  return {
    ...defaultAnimationConfig,
    animationBegin: (index / total) * 200, // Stagger by 200ms
  };
}

// ============================================================================
// CHART ACCESSIBILITY
// ============================================================================

/**
 * Generate accessible chart descriptions
 */
export function generateChartDescription(
  type: 'line' | 'bar' | 'pie' | 'area',
  title: string,
  dataPoints: number,
  trend?: 'up' | 'down' | 'stable'
): string {
  let description = `${type} chart titled "${title}" with ${dataPoints} data points.`;
  
  if (trend) {
    const trendText = trend === 'up' ? 'increasing' : trend === 'down' ? 'decreasing' : 'stable';
    description += ` The overall trend is ${trendText}.`;
  }
  
  return description;
}

/**
 * Generate ARIA labels for chart elements
 */
export function generateAriaLabel(
  type: 'data-point' | 'axis' | 'legend',
  value?: string | number,
  context?: string
): string {
  switch (type) {
    case 'data-point':
      return `Data point: ${context} - ${value}`;
    case 'axis':
      return `${context} axis: ${value}`;
    case 'legend':
      return `Legend item: ${value}`;
    default:
      return String(value || '');
  }
}
