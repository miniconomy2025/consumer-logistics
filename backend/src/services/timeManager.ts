import { logger } from '../utils/logger';
import axios from 'axios';

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
 * console.log('New simulation day started:', simTime);
 * });
 *
 * // Start simulation
 * timeManager.startSimulation(new Date('2050-01-01T00:00:00Z'));
 * ```
 */
export class TimeManager {
    private static instance: TimeManager;

    // Time tracking properties
    private simulationStart: Date; // The in-simulation time when the current simulation period started
    private realStart: Date;       // The real-world time when the current simulation period started
    private simTime: Date;         // The current calculated simulation time

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
    private lastSimDateString: string | null = null; // Tracks the last day for midnight alerts to prevent multiple triggers

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
        this.stopSimulation(); // Stop any existing simulation before starting a new one
        this.syncEndpoint = syncEndpoint || null;

        if (simulationStartTime) {
            this.simulationStart = new Date(simulationStartTime);
            this.simTime = new Date(simulationStartTime);
        } else {
            this.simulationStart = new Date(this.DEFAULT_SIM_START_DATE);
            this.simTime = new Date(this.DEFAULT_SIM_START_DATE);
        }

        this.realStart = new Date();
        // Reset for event tracking to ensure midnight event fires on first day
        this.lastSimDateString = null; 

        logger.info(`[TimeManager] Starting simulation at ${this.simulationStart.toISOString()}`);
        logger.info(`[TimeManager] Update interval: ${checkIntervalMillis}ms`);

        this.intervalId = setInterval(() => this.updateAndCheckSimTime(), checkIntervalMillis);
        this.isRunning = true;

        if (this.syncEndpoint) {
            this.setupAutoSync();
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
        this.lastSimDateString = null; // Reset for event tracking

        // Reset to default simulation start time
        this.simulationStart = new Date(this.DEFAULT_SIM_START_DATE);
        this.realStart = new Date();
        this.simTime = new Date(this.DEFAULT_SIM_START_DATE);

        logger.info('[TimeManager] Reset to default initial state');
    }

    /**
     * Gets the current simulation time. This is the primary method other services should use.
     * The `simTime` property is continuously updated by `updateAndCheckSimTime`.
     * @returns The current Date object in simulation time.
     */
    public getCurrentTime(): Date {
        return new Date(this.simTime); // Return a copy to prevent external modification
    }

    /**
     * Sets the simulation time manually. This overrides the automatic progression.
     * When manual time is set, the simulation's progression "jumps" to this time.
     * The internal clock will continue from this new point.
     *
     * @param newTime The new simulation time to set.
     */
    public setSimulationTime(newTime: Date): void {
        this.simTime = new Date(newTime);
        this.simulationStart = new Date(newTime); // Anchor the simulation start to this new time
        this.realStart = new Date(); // Reset real-world start to now
        this.lastSimDateString = null; // Reset for event tracking
        logger.info(`[TimeManager] Simulation time manually set to: ${newTime.toISOString()}`);
    }

    /**
     * Gets the simulation's initial start time for the current running period.
     * @returns The simulation start Date object.
     */
    public getSimulationStartTime(): Date {
        return new Date(this.simulationStart);
    }

    /**
     * Gets the simulation speed multiplier.
     * @returns How many times faster the simulation runs compared to real time.
     */
    public getSimulationSpeed(): number {
        const simDayMillis = 24 * 60 * 60 * 1000; // 1 simulation day in milliseconds
        return simDayMillis / this.SIM_DAY_MS;
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
        const currentSimTime = new Date(this.simTime); // Use a copy
        const hours = currentSimTime.getUTCHours();
        const minutes = currentSimTime.getUTCMinutes();
        const currentDateStr = currentSimTime.toISOString().split('T')[0]; //YYYY-MM-DD

        // Initialize lastSimDateString on first run or after reset/manual set
        if (this.lastSimDateString === null) {
            this.lastSimDateString = currentDateStr;
        }

        // Trigger midnight event (00:00) once per simulation day
        // This condition ensures it fires only when the date part changes AND it's midnight
         if (currentDateStr !== this.lastSimDateString && hours === 0)
            {
            this.lastSimDateString = currentDateStr; // Update the last triggered day
            logger.info(`[TimeManager] MIDNIGHT (00:00:00) in simulation: ${currentSimTime.toISOString()}`);
            this.onMidnightCallbacks.forEach(callback => {
                try {
                    callback(new Date(currentSimTime)); // Pass a copy of the time
                } catch (error) {
                    logger.error('[TimeManager] Error in midnight callback:', error);
                }
            });
        }

        // Trigger pre-midnight event (23:59)
        if (hours === 23 && minutes === 59) {
            logger.debug(`[TimeManager] PRE-MIDNIGHT (23:59:XX) in simulation: ${currentSimTime.toISOString()}`);
            this.onBeforeMidnightCallbacks.forEach(callback => {
                try {
                    callback(new Date(currentSimTime)); // Pass a copy of the time
                } catch (error) {
                    logger.error('[TimeManager] Error in pre-midnight callback:', error);
                }
            });
        }
    }

    /**
     * Initiates a one-time synchronization of the simulation time with an external endpoint.
     * If auto-sync is enabled, this will also update the base time.
     *
     * @param endpoint The URL of the external time synchronization service.
     * @throws {Error} If the sync fails or response data is invalid.
     */
    public async syncTime(endpoint: string): Promise<void> {
        try {
            logger.info(`[TimeManager] Attempting to sync time with endpoint: ${endpoint}`);
            const response = await axios.get(endpoint, { timeout: this.SYNC_TIMEOUT_MS });
            const { currentSimTime } = response.data;

            if (currentSimTime) {
                const newSimTime = new Date(currentSimTime);
                // When syncing, we set the simulationStart to the synced time
                // and reset the realStart to "now", effectively aligning the simulation clock
                // with the synced time from this real-world moment.
                this.simulationStart = newSimTime;
                this.realStart = new Date();
                this.simTime = newSimTime; // Update current simTime immediately
                this.lastSimDateString = newSimTime.toISOString().split('T')[0]; // Update for event tracking

                // Reset failed sync count on successful sync
                this.failedSyncCount = 0;
                this.lastSuccessfulSyncTime = new Date();
                logger.info(`[TimeManager] Sync successful. Simulation time updated to ${newSimTime.toISOString()}`);
            } else {
                throw new Error('Invalid response data from simulation time endpoint');
            }
        } catch (error: any) {
            this.failedSyncCount++;
            logger.error(`[TimeManager] Failed to sync time (attempt ${this.failedSyncCount}/${this.maxFailedSyncs}):`, error.message || error);

            if (this.failedSyncCount >= this.maxFailedSyncs) {
                logger.warn(`[TimeManager] Max sync failures reached (${this.maxFailedSyncs}). Disabling auto-sync.`);
                if (this.syncIntervalId) {
                    clearInterval(this.syncIntervalId);
                    this.syncIntervalId = null;
                }
                this.syncEndpoint = null; // Clear endpoint to prevent re-enabling without explicit action
            }
            throw new Error(`Failed to sync simulation time: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Gets the current sync endpoint URL.
     * @returns The sync endpoint URL or null if not configured.
     */
    public getSyncEndpoint(): string | null {
        return this.syncEndpoint;
    }

    /**
     * Checks if automatic time synchronization is currently enabled.
     * @returns True if auto-sync is active, false otherwise.
     */
    public isSyncEnabled(): boolean {
        return this.syncEndpoint !== null && this.failedSyncCount < this.maxFailedSyncs;
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
        if (this.syncEndpoint && !this.isSyncEnabled()) { // Re-enable if endpoint exists and it's currently disabled
            this.setupAutoSync();
            logger.info(`[TimeManager] Sync failure count reset from ${previousCount} to 0. Auto-sync re-enabled.`);
        } else {
            logger.info(`[TimeManager] Sync failure count reset from ${previousCount} to 0`);
        }
    }

    /**
     * Sets up automatic synchronization with the configured endpoint.
     * This method is called internally when `syncEndpoint` is provided in `startSimulation`
     * or when `resetSyncFailureCount` is called and conditions are met.
     * @private
     */
    private setupAutoSync(): void {
        if (!this.syncEndpoint || this.syncIntervalId) return; // Prevent duplicate intervals

        this.syncIntervalId = setInterval(async () => {
            if (this.isSyncEnabled() && this.syncEndpoint) { // Double check enabled state before sync
                try {
                    await this.syncTime(this.syncEndpoint);
                } catch (error) {
                    // Error is already logged within syncTime method
                }
            } else {
                // If sync becomes disabled during operation, clear the interval
                if (this.syncIntervalId) {
                    clearInterval(this.syncIntervalId);
                    this.syncIntervalId = null;
                    logger.info('[TimeManager] Auto-sync interval cleared due to disabled sync.');
                }
            }
        }, this.SYNC_INTERVAL_MS);
        logger.info(`[TimeManager] Auto-sync enabled for endpoint ${this.syncEndpoint}, syncing every ${this.SYNC_INTERVAL_MS / 1000} real seconds.`);
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
     * console.log('New simulation day started:', simTime.toISOString());
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
     * console.log('Day ending soon:', simTime.toISOString());
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
