import { Router } from 'express';
import { SimulationResetService } from '../services/simulationResetService';
import { logger } from '../utils/logger'; // Assuming you have a logger utility

const router = Router();

router.post('/start', async (req, res) => {
  
  logger.info('Received request to start simulation environment reset.');
  try {
    await SimulationResetService.resetAndMigrateDatabase();

    res.status(200).json({ message: 'Simulation environment reset and started successfully.' });
  } catch (err: any) {
    logger.error('Failed to start simulation environment:', err);
    res.status(500).json({ message: `Failed to start simulation environment: ${err.message || 'Unknown error'}` });
  }
});


export default router;