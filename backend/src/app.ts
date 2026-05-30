import express from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import petRoutes from './routes/petRoutes';
import matchmakingRoutes from './routes/matchmakingRoutes';
import adoptionRequestRoutes from './routes/adoptionRequestRoutes';

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Rutas base
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/pets', petRoutes);
app.use('/matchmaking', matchmakingRoutes);
app.use('/adoption-requests', adoptionRequestRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Manejo centralizado de errores
app.use(errorHandler);

export default app;
