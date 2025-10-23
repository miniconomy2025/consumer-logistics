import { TimeManager } from './timeManager';
import { AnalyticsDateRange } from '../types/dtos/analyticsDtos';
import { logger } from '../utils/logger';

export interface DateRangeResult {
  dateFrom: string;
  dateTo: string;
}

/**
 * Service for converting predefined date ranges to actual dates using TimeManager
 * All date calculations use server/application time from TimeManager as the reference point
 */
export class AnalyticsDateRangeService {
  private timeManager: TimeManager;

  constructor() {
    this.timeManager = TimeManager.getInstance();
  }

  /**
   * Convert a predefined range to actual date strings
   * @param range The predefined range identifier
   * @returns Object with dateFrom and dateTo in YYYY-MM-DD format
   */
  public convertRangeToDateStrings(range: AnalyticsDateRange): DateRangeResult {
    const currentTime = this.timeManager.getCurrentTime();
    logger.debug(`Converting range '${range}' using current sim time: ${currentTime.toISOString()}`);

    switch (range) {
      case 'last7days':
        return this.getLast7Days(currentTime);
      
      case 'last30days':
        return this.getLast30Days(currentTime);
      
      case 'currentyear':
        return this.getCurrentYear(currentTime);
      
      case 'alltime':
        return this.getAllTime(currentTime);
      
      default:
        logger.warn(`Unknown range '${range}', defaulting to last30days`);
        return this.getLast30Days(currentTime);
    }
  }

  /**
   * Get date range for the last 7 days
   */
  private getLast7Days(currentTime: Date): DateRangeResult {
    const dateTo = this.formatDate(currentTime);
    const dateFrom = this.formatDate(this.subtractDays(currentTime, 7));
    
    logger.debug(`Last 7 days: ${dateFrom} to ${dateTo}`);
    return { dateFrom, dateTo };
  }

  /**
   * Get date range for the last 30 days
   */
  private getLast30Days(currentTime: Date): DateRangeResult {
    const dateTo = this.formatDate(currentTime);
    const dateFrom = this.formatDate(this.subtractDays(currentTime, 30));
    
    logger.debug(`Last 30 days: ${dateFrom} to ${dateTo}`);
    return { dateFrom, dateTo };
  }

  /**
   * Get date range for the current year
   */
  private getCurrentYear(currentTime: Date): DateRangeResult {
    const year = currentTime.getFullYear();
    const dateFrom = `${year}-01-01`;
    const dateTo = this.formatDate(currentTime);
    
    logger.debug(`Current year: ${dateFrom} to ${dateTo}`);
    return { dateFrom, dateTo };
  }

  /**
   * Get date range for all time (from simulation start to current time)
   */
  private getAllTime(currentTime: Date): DateRangeResult {
    // No date filters applied: fetch across entire dataset
    logger.debug('All time: no date filters applied');
    return { dateFrom: '', dateTo: '' };
  }

  /**
   * Subtract days from a date
   */
  private subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  /**
   * Format date to YYYY-MM-DD string
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get default range when no range is specified
   */
  public getDefaultRange(): AnalyticsDateRange {
    return 'alltime';
  }

  /**
   * Validate if a range string is a valid AnalyticsDateRange
   */
  public isValidRange(range: string): range is AnalyticsDateRange {
    return ['last7days', 'last30days', 'currentyear', 'alltime'].includes(range);
  }

  /**
   * Get comparison date range for growth calculations
   * Returns the same period length but shifted back in time
   */
  public getComparisonRange(range: AnalyticsDateRange): DateRangeResult {
    const currentRange = this.convertRangeToDateStrings(range);

    // Calculate the length of the current range
    const fromDate = new Date(currentRange.dateFrom);
    const toDate = new Date(currentRange.dateTo);
    const rangeLengthDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

    // Shift the range back by its own length to get comparison period
    const comparisonToDate = this.subtractDays(fromDate, 1); // End one day before current range starts
    const comparisonFromDate = this.subtractDays(comparisonToDate, rangeLengthDays - 1);

    const result = {
      dateFrom: this.formatDate(comparisonFromDate),
      dateTo: this.formatDate(comparisonToDate)
    };

    logger.debug(`Comparison range for '${range}': ${result.dateFrom} to ${result.dateTo}`);
    return result;
  }
}
