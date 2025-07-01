import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import truckRoutes from './routes/truckRoutes';
import pickupRoutes from './routes/pickupRoutes';
import { errorMiddleware } from './middleware/errorMiddleware';

const app = express();

app.use(helmet());

app.use(cors());

app.use(bodyParser.json());

app.use('/api/trucks', truckRoutes); 
app.use('/api', pickupRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Service is healthy' });
});

app.use(errorMiddleware);

export default app;