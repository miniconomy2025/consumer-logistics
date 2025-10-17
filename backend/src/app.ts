import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';

import truckRoutes from './routes/truckRoutes';
import pickupRoutes from './routes/pickupRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import companyRoutes from './routes/companyRoutes';
import webhookRoutes from './routes/webhookRoutes';
import simulationRoutes from './routes/simulationRoutes';


import { errorMiddleware } from './middleware/errorMiddleware';
//import { certInfoMiddleware } from './middleware/certMiddleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

// Swagger Documentation
//const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
//app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/companies', companyRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/simulation', simulationRoutes); 
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Service is healthy', clientName: (req as any).clientName || 'unknown' });
});

app.use(errorMiddleware);

export default app;
