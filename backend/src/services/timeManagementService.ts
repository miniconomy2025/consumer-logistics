import axios from 'axios';
import { logger } from '../utils/logger';
import { SimulationTime } from '../types/simulation/simulationTime';

/**
 * Detailed synchronization status information
 */
export interface SyncStatus {
  enabled: boolean;
  endpoint: string | null;
  failedAttempts: number;
  maxFailures: number;
}

/**
 * TimeManager - Singleton service for managing simulation time
 * 
 * Provides functionality for:
 * - Running accelerated simulation time (720x real time by default)
 * - Synchronizing with external time sources
 * - Managing simulation lifecycle (start/stop/reset)
 * 
 * Time Scale: 2 minutes real time = 1 simulation day (24 hours)
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
  
  // Configuration constants
  private readonly maxFailedSyncs: number = 3;
  private readonly SIM_DAY_MS = 2 * 60 * 1000; // 2 minutes in ms = 1 sim day
  private readonly SYNC_INTERVAL_MS = 30 * 1000; // Sync every 30 seconds
  private readonly SYNC_TIMEOUT_MS = 5 * 1000; // 5 second timeout for sync requests

  private constructor() {
    // Initialize with current time, will be set properly when startSimulation is called
    const now = new Date();
    this.simulationStart = now;
    this.realStart = now;
    this.simTime = new Date(now);
  }

  /**
   * Get the singleton instance of TimeManager
   * @returns The TimeManager instance
   */
  public static getInstance(): TimeManager {
    if (!TimeManager.instance) {
      TimeManager.instance = new TimeManager();
    }
    return TimeManager.instance;
  }

  /**
   * Check if the simulation is currently running
   * @returns True if simulation is active, false otherwise
   */
  public isSimulationRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Start the simulation with optional parameters
   * @param simulationStartTime - Optional start time for simulation (defaults to current time)
   * @param syncEndpoint - Optional endpoint URL for time synchronization
   */
  public startSimulation(simulationStartTime?: Date, syncEndpoint?: string): void {
    this.stopSimulation();
    this.syncEndpoint = syncEndpoint || null;

    if (simulationStartTime) {
      this.simulationStart = new Date(simulationStartTime);
      this.simTime = new Date(simulationStartTime);
    } else {
      this.simulationStart = new Date();
      this.simTime = new Date(this.simulationStart);
    }

    this.realStart = new Date();
    logger.info(`[TimeManager] Starting simulation at ${this.simulationStart.toISOString()}`);
    this.intervalId = setInterval(() => this.updateSimTime(), 1000);
    this.isRunning = true;

    if (this.syncEndpoint) {
      this.startAutoSync();
    }
  }

  /**
   * Stop the simulation and clear all intervals
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
  }

  /**
   * Reset the simulation to initial state
   */
  public reset(): void {
    this.stopSimulation();
    this.syncEndpoint = null;
    this.failedSyncCount = 0;
    const now = new Date();
    this.simulationStart = now;
    this.realStart = now;
    this.simTime = new Date(now);
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
   * Update simulation time based on elapsed real time
   */
  private updateSimTime(): void {
    const realElapsed = Date.now() - this.realStart.getTime();
    const simElapsedDays = realElapsed / this.SIM_DAY_MS;
    const simElapsedMs = simElapsedDays * 24 * 60 * 60 * 1000;
    this.simTime = new Date(this.simulationStart.getTime() + simElapsedMs);
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
   * Get detailed synchronization status information
   * @returns Object containing sync status details
   */
  public getSyncStatus(): SyncStatus {
    return {
      enabled: this.isSyncEnabled(),
      endpoint: this.syncEndpoint,
      failedAttempts: this.failedSyncCount,
      maxFailures: this.maxFailedSyncs
    };
  }

  /**
   * Reset the synchronization failure counter
   */
  public resetSyncFailureCount(): void {
    const previousCount = this.failedSyncCount;
    this.failedSyncCount = 0;

    if (previousCount > 0) {
      logger.info(`[TimeManager] Sync failure count reset from ${previousCount} to 0`);
    }
  }
}
