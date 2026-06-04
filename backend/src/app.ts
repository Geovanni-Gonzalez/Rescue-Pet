import express from 'express';
import cors from 'cors';
import path from 'path';
import { uploadsRoot } from './utils/uploadsRoot';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { servePrivateUpload } from './middlewares/privateUploads';
import { authLimiter, apiLimiter } from './middlewares/rateLimiter';
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
import auditRoutes from './routes/auditRoutes';

const app = express();
const serviceRoutePrefix = '/_/backend';

app.use((req, _res, next) => {
  if (req.url === serviceRoutePrefix) {
    req.url = '/';
  } else if (req.url.startsWith(`${serviceRoutePrefix}/`)) {
    req.url = req.url.slice(serviceRoutePrefix.length);
  }
  next();
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

// ─── Static uploads ──────────────────────────────────────────────────────────
// Public directories: animal photos and gallery images
app.use('/uploads/animals', express.static(path.join(uploadsRoot, 'animals')));
app.use('/uploads/gallery', express.static(path.join(uploadsRoot, 'gallery')));

// Private directories: require authentication via JWT
app.get('/uploads/documents/:filename', servePrivateUpload('documents'));
app.get('/uploads/contracts/:filename', servePrivateUpload('contracts'));

// API routes — all under /api
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
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
app.use('/api/audit', auditRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

app.use(errorHandler);

export default app;
