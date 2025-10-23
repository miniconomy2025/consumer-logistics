import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger';

import truckRoutes from './routes/truckRoutes';
import pickupRoutes from './routes/pickupRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import companyRoutes from './routes/companyRoutes';
import webhookRoutes from './routes/webhookRoutes';
import simulationRoutes from './routes/simulationRoutes';
import financeRoutes from './routes/financeRoutes';


import { errorMiddleware } from './middleware/errorMiddleware';
import { clientInfoMiddleware } from './middleware/certMiddleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(clientInfoMiddleware);

app.use('/api/companies', companyRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/pickups',  pickupRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/simulation', simulationRoutes); 
app.use('/api/analytics', analyticsRoutes);
app.use('/api/finance', financeRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Service is healthy', clientName: (req as any).clientName || 'unknown' });
});

app.use(errorMiddleware);

export default app;
