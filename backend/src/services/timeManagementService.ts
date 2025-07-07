import axios from 'axios';
import { logger } from '../utils/logger';
import { SimulationTime } from '../types/simulation/simulationTime';

/**
 * Type definition for time event callback functions
 */
type TimeCallback = (simTime: Date) => void;

/**
 * Detailed synchronization status information
 */
export interface SyncStatus {
  enabled: boolean;
  endpoint: string | null;
  failedAttempts: number;
  maxFailures: number;
  lastSyncTime?: Date;
}

/**
 * TimeManager - Singleton service for managing simulation time
 *
 * Provides comprehensive functionality for:
 * - Running accelerated simulation time (720x real time by default)
 * - Synchronizing with external time sources with resilient failure handling
 * - Managing simulation lifecycle (start/stop/reset)
 * - Event-driven time notifications (midnight, pre-midnight callbacks)
 * - Real-world time mapping utilities for pickup/delivery scheduling
 *
 * Time Scale: 2 minutes real time = 1 simulation day (24 hours)
 *
 * @example
 * ```typescript
 * const timeManager = TimeManager.getInstance();
 *
 * // Register for midnight events
 * timeManager.onMidnight((simTime) => {
 *   console.log('New simulation day started:', simTime);
 * });
 *
 * // Start simulation
 * timeManager.startSimulation(new Date('2050-01-01T00:00:00Z'));
 * ```
 */
export class TimeManager {
  private static instance: TimeManager;

  // Time tracking properties
  private simulationStart: Date;
  private realStart: Date;
  private simTime: Date;

  // Interval management
  private intervalId: NodeJS.Timeout | null = null;
  private syncIntervalId: NodeJS.Timeout | null = null;

  // State management
  private isRunning: boolean = false;
  private syncEndpoint: string | null = null;
  private failedSyncCount: number = 0;
  private lastSuccessfulSyncTime: Date | null = null;

  // Event system
  private onMidnightCallbacks: TimeCallback[] = [];
  private onBeforeMidnightCallbacks: TimeCallback[] = [];
  private lastSimDateString: string | null = null;

  // Configuration constants
  private readonly maxFailedSyncs: number = 3;
  private readonly SIM_DAY_MS = 2 * 60 * 1000; // 2 minutes in ms = 1 sim day
  private readonly SYNC_INTERVAL_MS = 30 * 1000; // Sync every 30 seconds
  private readonly SYNC_TIMEOUT_MS = 5 * 1000; // 5 second timeout for sync requests
  private readonly DEFAULT_SIM_START_DATE = new Date('2050-01-01T00:00:00.000Z');

  /**
   * Private constructor to enforce Singleton pattern.
   * Initializes TimeManager with default simulation start date.
   */
  private constructor() {
    // Initialize with default simulation start time
    this.simulationStart = new Date(this.DEFAULT_SIM_START_DATE);
    this.realStart = new Date();
    this.simTime = new Date(this.DEFAULT_SIM_START_DATE);

    logger.info(`[TimeManager] Initialized with default simulation start: ${this.DEFAULT_SIM_START_DATE.toISOString()}`);
    logger.info(`[TimeManager] Time scale: ${this.SIM_DAY_MS / 1000 / 60} real minutes = 1 simulation day`);
  }

  /**
   * Gets the singleton instance of TimeManager.
   * @returns The TimeManager instance
   */
  public static getInstance(): TimeManager {
    if (!TimeManager.instance) {
      TimeManager.instance = new TimeManager();
    }
    return TimeManager.instance;
  }

  /**
   * Checks if the simulation is currently running.
   * @returns True if simulation is active, false otherwise
   */
  public isSimulationRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Starts the simulation with optional parameters.
   * Stops any existing simulation before starting a new one.
   *
   * @param simulationStartTime Optional start time for simulation (defaults to DEFAULT_SIM_START_DATE)
   * @param syncEndpoint Optional endpoint URL for time synchronization
   * @param checkIntervalMillis The real-world interval in milliseconds to check and update simulation time (default: 1000ms)
   */
  public startSimulation(simulationStartTime?: Date, syncEndpoint?: string, checkIntervalMillis: number = 1000): void {
    this.stopSimulation();
    this.syncEndpoint = syncEndpoint || null;

    if (simulationStartTime) {
      this.simulationStart = new Date(simulationStartTime);
      this.simTime = new Date(simulationStartTime);
    } else {
      this.simulationStart = new Date(this.DEFAULT_SIM_START_DATE);
      this.simTime = new Date(this.DEFAULT_SIM_START_DATE);
    }

    this.realStart = new Date();
    this.lastSimDateString = null; // Reset for event tracking

    logger.info(`[TimeManager] Starting simulation at ${this.simulationStart.toISOString()}`);
    logger.info(`[TimeManager] Update interval: ${checkIntervalMillis}ms`);

    this.intervalId = setInterval(() => this.updateAndCheckSimTime(), checkIntervalMillis);
    this.isRunning = true;

    if (this.syncEndpoint) {
      this.startAutoSync();
    }
  }

  /**
   * Stops the simulation and clears all intervals.
   */
  public stopSimulation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    this.isRunning = false;
    logger.info('[TimeManager] Simulation stopped');
  }

  /**
   * Resets the TimeManager to its initial state, stopping the simulation and clearing all settings.
   * The simulation will restart from DEFAULT_SIM_START_DATE when startSimulation is next called.
   */
  public reset(): void {
    this.stopSimulation();
    this.syncEndpoint = null;
    this.failedSyncCount = 0;
    this.lastSuccessfulSyncTime = null;
    this.lastSimDateString = null;

    // Reset to default simulation start time
    this.simulationStart = new Date(this.DEFAULT_SIM_START_DATE);
    this.realStart = new Date();
    this.simTime = new Date(this.DEFAULT_SIM_START_DATE);

    logger.info('[TimeManager] Reset to default initial state');
  }

  /**
   * Get the current simulation time
   * @returns A copy of the current simulation time
   */
  public getCurrentTime(): Date {
    return new Date(this.simTime);
  }

  /**
   * Get the simulation start time
   * @returns A copy of the simulation start time
   */
  public getSimulationStartTime(): Date {
    return new Date(this.simulationStart);
  }

  /**
   * Get the real-world start time of the simulation
   * @returns A copy of the real start time
   */
  public getRealStartTime(): Date {
    return new Date(this.realStart);
  }

  /**
   * Get the simulation speed multiplier
   * @returns Number of simulated hours per real hour (720x by default)
   */
  public getSimulationSpeed(): number {
    // Returns how many simulated hours per real hour
    return (24 * 60 * 60 * 1000) / this.SIM_DAY_MS;
  }

  /**
   * Manually set the simulation time
   * @param newSimTime - The new simulation time to set
   */
  public setSimulationTime(newSimTime: Date): void {
    this.simTime = new Date(newSimTime);
    this.simulationStart = new Date(newSimTime);
    this.realStart = new Date();
  }

  /**
   * Updates simulation time based on elapsed real time and triggers time-based events.
   * This is the "heartbeat" of the simulation clock.
   * @private
   */
  private updateAndCheckSimTime(): void {
    // Update simulation time
    const realElapsed = Date.now() - this.realStart.getTime();
    const simElapsedDays = realElapsed / this.SIM_DAY_MS;
    const simElapsedMs = simElapsedDays * 24 * 60 * 60 * 1000;
    this.simTime = new Date(this.simulationStart.getTime() + simElapsedMs);

    // Check for time-based events
    this.checkAndTriggerTimeEvents();
  }

  /**
   * Checks current simulation time and triggers appropriate time-based events.
   * @private
   */
  private checkAndTriggerTimeEvents(): void {
    const currentSimTime = new Date(this.simTime);
    const hours = currentSimTime.getUTCHours();
    const minutes = currentSimTime.getUTCMinutes();
    const currentDateStr = currentSimTime.toISOString().split('T')[0];

    // Initialize lastSimDateString on first run
    if (this.lastSimDateString === null) {
      this.lastSimDateString = currentDateStr;
    }

    // Trigger midnight event (00:00) once per simulation day
    if (hours === 0 && minutes === 0 && this.lastSimDateString !== currentDateStr) {
      this.lastSimDateString = currentDateStr;
      logger.info(`[TimeManager] MIDNIGHT (00:00:00) in simulation: ${currentSimTime.toISOString()}`);
      this.onMidnightCallbacks.forEach(callback => {
        try {
          callback(new Date(currentSimTime));
        } catch (error) {
          logger.error('[TimeManager] Error in midnight callback:', error);
        }
      });
    }

    // Trigger pre-midnight event (23:59)
    if (hours === 23 && minutes === 59) {
      this.onBeforeMidnightCallbacks.forEach(callback => {
        try {
          callback(new Date(currentSimTime));
        } catch (error) {
          logger.error('[TimeManager] Error in pre-midnight callback:', error);
        }
      });
    }
  }

  /**
   * Synchronize simulation time with an external endpoint
   * @param endpointUrl - The URL to fetch simulation time from
   * @throws Error if synchronization fails
   */
  public async syncTime(endpointUrl: string): Promise<void> {
    try {
      const response = await axios.get<SimulationTime>(endpointUrl, {
        timeout: this.SYNC_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.data && response.data.currentSimTime) {
        const newSimTime = new Date(response.data.currentSimTime);
        
        if (isNaN(newSimTime.getTime())) {
          logger.error(`[TimeManager] Invalid date received from endpoint: ${response.data.currentSimTime}`);
          throw new Error('Invalid date received from endpoint');
        }
        
        this.simTime = newSimTime;
        this.simulationStart = newSimTime;
        this.realStart = new Date();
        
        // Reset failed sync count on successful sync
        this.failedSyncCount = 0;
        this.lastSuccessfulSyncTime = new Date();
        logger.info(`[TimeManager] Sync successful. Simulation time updated to ${newSimTime.toISOString()}`);
      } else {
        throw new Error('Invalid response data from simulation time endpoint');
      }
    } catch (error) {
      let errorMessage = 'Unknown error';
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = `Request timeout after ${this.SYNC_TIMEOUT_MS}ms`;
        } else if (error.response) {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        } else if (error.request) {
          errorMessage = 'No response from server (network error)';
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new Error(`Failed to sync simulation time: ${errorMessage}`);
    }
  }

  /**
   * Start automatic synchronization with the configured endpoint
   */
  private startAutoSync(): void {
    if (!this.syncEndpoint) return;

    this.syncIntervalId = setInterval(async () => {
      try {
        await this.syncTime(this.syncEndpoint!);
        logger.info(`[TimeManager] Auto-synced with ${this.syncEndpoint} at ${new Date().toISOString()}`);
      } catch (error) {
        this.failedSyncCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`[TimeManager] Auto-sync failed (${this.failedSyncCount} total failures): ${errorMessage}`);
        logger.warn(`[TimeManager] Continuing with current time. Will retry in ${this.SYNC_INTERVAL_MS / 1000} seconds.`);
        // Don't stop auto-sync, just continue with current time and try again next interval
      }
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Get the current sync endpoint URL
   * @returns The sync endpoint URL or null if not set
   */
  public getSyncEndpoint(): string | null {
    return this.syncEndpoint;
  }

  /**
   * Check if auto-sync is currently enabled
   * @returns True if auto-sync is active, false otherwise
   */
  public isSyncEnabled(): boolean {
    return this.syncEndpoint !== null && this.syncIntervalId !== null;
  }

  /**
   * Gets detailed synchronization status information.
   * @returns Object containing sync status details
   */
  public getSyncStatus(): SyncStatus {
    return {
      enabled: this.isSyncEnabled(),
      endpoint: this.syncEndpoint,
      failedAttempts: this.failedSyncCount,
      maxFailures: this.maxFailedSyncs,
      lastSyncTime: this.lastSuccessfulSyncTime ? new Date(this.lastSuccessfulSyncTime) : undefined
    };
  }

  /**
   * Resets the synchronization failure counter and re-enables auto-sync if configured.
   * Useful for recovering from temporary sync issues.
   */
  public resetSyncFailureCount(): void {
    const previousCount = this.failedSyncCount;
    this.failedSyncCount = 0;

    if (previousCount > 0) {
      logger.info(`[TimeManager] Sync failure count reset from ${previousCount} to 0`);
    }
  }

  // ========================================
  // Event System Methods
  // ========================================

  /**
   * Registers a callback to be fired when the simulation time hits 00:00:00 (midnight).
   * The callback receives a copy of the current simulation time.
   *
   * @param callback The function to execute at midnight
   * @example
   * ```typescript
   * timeManager.onMidnight((simTime) => {
   *   console.log('New simulation day started:', simTime.toISOString());
   * });
   * ```
   */
  public onMidnight(callback: TimeCallback): void {
    this.onMidnightCallbacks.push(callback);
  }

  /**
   * Registers a callback to be fired when the simulation time hits 23:59:XX (just before midnight).
   * The callback receives a copy of the current simulation time.
   *
   * @param callback The function to execute before midnight
   * @example
   * ```typescript
   * timeManager.onBeforeMidnight((simTime) => {
   *   console.log('Day ending soon:', simTime.toISOString());
   * });
   * ```
   */
  public onBeforeMidnight(callback: TimeCallback): void {
    this.onBeforeMidnightCallbacks.push(callback);
  }

  // ========================================
  // Utility Methods for Real-World Time Mapping
  // ========================================

  /**
   * Converts a simulation date to the corresponding real-world timestamp.
   * This method is useful for correlating simulation events back to real-world observation times.
   *
   * @param simDate The simulation date to convert
   * @returns The corresponding real-world timestamp
   */
  public getRealWorldTimestampFromSimulationDate(simDate: Date): Date {
    const simMillisSinceSimStart = simDate.getTime() - this.simulationStart.getTime();
    const simDaysRatio = simMillisSinceSimStart / (24 * 60 * 60 * 1000);
    const realWorldMillisSinceStart = simDaysRatio * this.SIM_DAY_MS;

    return new Date(this.realStart.getTime() + realWorldMillisSinceStart);
  }

  /**
   * Calculates the real-world timestamp for a simulated pickup time (beginning of the simulated day).
   *
   * @param simDate The simulated date for pickup
   * @returns The real-world timestamp corresponding to the start of that simulated day
   */
  public getRealWorldPickupTimestamp(simDate: Date): Date {
    const simDateAtMidnight = new Date(Date.UTC(
      simDate.getUTCFullYear(),
      simDate.getUTCMonth(),
      simDate.getUTCDate(),
      0, 0, 0, 0
    ));
    return this.getRealWorldTimestampFromSimulationDate(simDateAtMidnight);
  }

  /**
   * Calculates the real-world timestamp for a simulated delivery time (end of the simulated day).
   *
   * @param simDate The simulated date for delivery
   * @returns The real-world timestamp corresponding to the end of that simulated day
   */
  public getRealWorldDeliveryTimestamp(simDate: Date): Date {
    const simDateAtEndOfDay = new Date(Date.UTC(
      simDate.getUTCFullYear(),
      simDate.getUTCMonth(),
      simDate.getUTCDate(),
      23, 59, 59, 999
    ));
    return this.getRealWorldTimestampFromSimulationDate(simDateAtEndOfDay);
  }
}
