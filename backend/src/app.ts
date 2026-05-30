import express from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import animalRoutes from './routes/animalRoutes';
import catalogRoutes from './routes/catalogRoutes';
import matchmakingRoutes from './routes/matchmakingRoutes';
import adoptionApplicationRoutes from './routes/adoptionApplicationRoutes';
import interviewSlotRoutes from './routes/interviewSlotRoutes';
import notificationRoutes from './routes/notificationRoutes';
import taskRoutes from './routes/taskRoutes';
import reportRoutes from './routes/reportRoutes';
import roleRoutes from './routes/roleRoutes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Serve uploaded files (animal photos, gallery, documents, contracts)
// Note: /uploads/documents and /uploads/contracts contain private files —
// in production, replace with authenticated signed URLs.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes — all under /api
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/adopters', matchmakingRoutes);
app.use('/api/adoption-applications', adoptionApplicationRoutes);
app.use('/api/interview-slots', interviewSlotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/roles', roleRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

app.use(errorHandler);

export default app;
