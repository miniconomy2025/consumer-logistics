import { Router } from 'express';
import { SimulationResetService } from '../services/simulationResetService';
import { logger } from '../utils/logger';
import { TimeManager } from '../services/timeManager'; // Import TimeManager

const router = Router();
const timeManager = TimeManager.getInstance(); // Get the singleton instance

router.post('/start', async (req, res) => {
    logger.info('Received request to start simulation environment reset and optionally TimeManager clock.');
    try {
        await SimulationResetService.resetAndMigrateDatabase();

        // Optionally restart TimeManager's clock after a full reset
        // This is separate from the `ENABLE_TIME_MANAGER_CLOCK` env var in server.ts
        // This ensures if you call /api/simulation/start, the clock *also* restarts
        // if you want it to automatically progress after a reset.
        const { startTime, syncEndpoint, checkIntervalMillis } = req.body; // Allow setting these via request body for convenience
        timeManager.reset(); // Ensure TimeManager is clean before starting
        timeManager.startSimulation(
            startTime ? new Date(startTime) : undefined,
            syncEndpoint || undefined,
            checkIntervalMillis || 1000
        );

        res.status(200).json({ message: 'Simulation environment reset and started successfully.' });
    } catch (err: any) {
        logger.error('Failed to start simulation environment:', err);
        res.status(500).json({ message: `Failed to start simulation environment: ${err.message || 'Unknown error'}` });
    }
});

router.post('/set-time', (req, res) => {
    try {
        const { newTime } = req.body;
        if (!newTime || isNaN(new Date(newTime).getTime())) {
            return res.status(400).json({ message: 'Invalid newTime provided. Must be a valid date string.' });
        }
        timeManager.setSimulationTime(new Date(newTime));
        res.status(200).json({ message: `Simulation time manually set to: ${timeManager.getCurrentTime().toISOString()}` });
    } catch (error: any) {
        logger.error('Failed to set simulation time manually:', error);
        res.status(500).json({ message: `Failed to set simulation time: ${error.message || 'Unknown error'}` });
    }
});

router.get('/current-time', (req, res) => {
    try {
        const currentTime = timeManager.getCurrentTime();
        res.status(200).json({ currentSimTime: currentTime.toISOString() });
    } catch (error: any) {
        logger.error('Failed to get current simulation time:', error);
        res.status(500).json({ message: `Failed to get current simulation time: ${error.message || 'Unknown error'}` });
    }
});

router.post('/stop-clock', (req, res) => {
    try {
        timeManager.stopSimulation();
        res.status(200).json({ message: 'TimeManager internal clock stopped.' });
    } catch (error: any) {
        logger.error('Failed to stop TimeManager clock:', error);
        res.status(500).json({ message: `Failed to stop TimeManager clock: ${error.message || 'Unknown error'}` });
    }
});

router.post('/start-clock', (req, res) => {
    try {
        const { startTime, syncEndpoint, checkIntervalMillis } = req.body;
        timeManager.startSimulation(
            startTime ? new Date(startTime) : undefined,
            syncEndpoint || undefined,
            checkIntervalMillis || 1000
        );
        res.status(200).json({ message: 'TimeManager internal clock started.', currentSimTime: timeManager.getCurrentTime().toISOString() });
    } catch (error: any) {
        logger.error('Failed to start TimeManager clock:', error);
        res.status(500).json({ message: `Failed to start TimeManager clock: ${error.message || 'Unknown error'}` });
    }
});

router.post('/sync', async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) {
            return res.status(400).json({ message: 'Sync endpoint is required.' });
        }
        await timeManager.syncTime(endpoint);
        res.status(200).json({ message: `Time synced successfully to: ${timeManager.getCurrentTime().toISOString()}` });
    } catch (error: any) {
        logger.error('Failed to manually sync time:', error);
        res.status(500).json({ message: `Failed to sync time: ${error.message || 'Unknown error'}` });
    }
});


export default router;