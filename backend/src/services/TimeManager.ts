import axios from 'axios';
import { logger } from '../utils/logger';

type SimulationTime = {
  currentSimTime: Date;
};

export class TimeManager {
  private static instance: TimeManager;
  private simulationStart: Date;
  private realStart: Date;
  private simTime: Date;
  private intervalId: NodeJS.Timeout | null = null;
  private syncIntervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private syncEndpoint: string | null = null;
  private failedSyncCount: number = 0;
  private maxFailedSyncs: number = 3;
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

  public static getInstance(): TimeManager {
    if (!TimeManager.instance) {
      TimeManager.instance = new TimeManager();
    }
    return TimeManager.instance;
  }

  public isSimulationRunning(): boolean {
    return this.isRunning;
  }

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

  private updateSimTime(): void {
    const realElapsed = Date.now() - this.realStart.getTime();
    const simElapsedDays = realElapsed / this.SIM_DAY_MS;
    const simElapsedMs = simElapsedDays * 24 * 60 * 60 * 1000;
    this.simTime = new Date(this.simulationStart.getTime() + simElapsedMs);
  }

  public getCurrentTime(): Date {
    return new Date(this.simTime);
  }

  public getSimulationStartTime(): Date {
    return new Date(this.simulationStart);
  }

  public getRealStartTime(): Date {
    return new Date(this.realStart);
  }

  public getSimulationSpeed(): number {
    // Returns how many simulated hours per real hour
    return (24 * 60 * 60 * 1000) / this.SIM_DAY_MS;
  }

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

  public setSimulationTime(newSimTime: Date): void {
    this.simTime = new Date(newSimTime);
    this.simulationStart = new Date(newSimTime);
    this.realStart = new Date();
  }

  public reset(): void {
    this.stopSimulation();
    this.syncEndpoint = null;
    this.failedSyncCount = 0;
    const now = new Date();
    this.simulationStart = now;
    this.realStart = now;
    this.simTime = new Date(now);
  }

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

  public getSyncEndpoint(): string | null {
    return this.syncEndpoint;
  }

  public isSyncEnabled(): boolean {
    return this.syncEndpoint !== null && this.syncIntervalId !== null;
  }

  public getSyncStatus(): { 
    enabled: boolean; 
    endpoint: string | null; 
    failedAttempts: number; 
    maxFailures: number;
  } {
    return {
      enabled: this.isSyncEnabled(),
      endpoint: this.syncEndpoint,
      failedAttempts: this.failedSyncCount,
      maxFailures: this.maxFailedSyncs
    };
  }

  public resetSyncFailureCount(): void {
    const previousCount = this.failedSyncCount;
    this.failedSyncCount = 0;
    
    if (previousCount > 0) {
      logger.info(`[TimeManager] Sync failure count reset from ${previousCount} to 0`);
    }
  }
}
