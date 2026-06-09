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

// ─── URL rewriter ───────────────────────────────────────────────────────────
// Old data may contain absolute URLs that break in production:
//   • http://localhost:3000/uploads/...  (dev URLs left in db.json)
//   • https://<deployment>.vercel.app/_/backend/uploads/...  (deployment-specific
//     URLs that are protected by Vercel Authentication and return 401)
// Rewrite them all to relative paths so the browser resolves them against the
// current origin, which always works.
if (process.env.VERCEL) {
  // Matches localhost URLs and any Vercel deployment-specific URLs
  const localhostPattern = /https?:\/\/localhost:\d+\/uploads\//g;
  const vercelDeployPattern = /https?:\/\/[a-z0-9-]+\.vercel\.app\/_\/backend\/uploads\//g;
  const _origJson = express.response.json;
  express.response.json = function rewriteJson(body: any) {
    if (body && typeof body === 'object') {
      let str = JSON.stringify(body);
      let changed = false;
      if (str.includes('/localhost:') && str.includes('/uploads/')) {
        str = str.replace(localhostPattern, '/_/backend/uploads/');
        changed = true;
      }
      if (str.includes('.vercel.app/') && str.includes('/uploads/')) {
        str = str.replace(vercelDeployPattern, '/_/backend/uploads/');
        changed = true;
      }
      if (changed) {
        body = JSON.parse(str);
      }
    }
    return _origJson.call(this, body);
  };
}

// ─── Static uploads ──────────────────────────────────────────────────────────
// Public directories: animal photos and gallery images.
// express.static serves from the local filesystem first; the Blob fallback
// below handles production where /tmp is ephemeral.
app.use('/uploads/animals', express.static(path.join(uploadsRoot, 'animals')));
app.use('/uploads/gallery', express.static(path.join(uploadsRoot, 'gallery')));

// Blob fallback — when the local file doesn't exist (Vercel serverless /tmp
// is ephemeral), fetch from Vercel Blob and proxy the response.
// Works with both public and private Blob stores.
app.get('/uploads/:subdir/:filename', async (req, res, next) => {
  const subdir = req.params['subdir'] as string;
  if (!['animals', 'gallery'].includes(subdir)) return next();
  if (!process.env['BLOB_READ_WRITE_TOKEN']) {
    console.warn('[BLOB_FALLBACK] BLOB_READ_WRITE_TOKEN not set, cannot serve:', req.params['filename']);
    return res.status(404).json({ success: false, error: 'Almacenamiento Blob no configurado' });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { list, get } = require('@vercel/blob');
    const pathname = `uploads/${subdir}/${req.params['filename']}`;
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    const blob = blobs.find((b: any) => b.url && b.pathname === pathname);
    if (!blob) {
      console.warn('[BLOB_FALLBACK] File not found in Blob:', pathname);
      return res.status(404).json({ success: false, error: 'Imagen no encontrada en almacenamiento' });
    }

    // Use the SDK's get() — it handles auth for private stores. v2 returns
    // { statusCode, stream, headers, blob }; v1 returned a fetch Response.
    const result: any = await get(blob.url, { access: 'private' });
    if (!result) {
      return res.status(404).json({ success: false, error: 'Imagen no encontrada en almacenamiento' });
    }

    res.set('Content-Type', result.blob?.contentType || blob.contentType || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Read the body (v2: result.stream; v1: result.arrayBuffer())
    let buffer: Buffer;
    if (result.stream) {
      buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    } else if (typeof result.arrayBuffer === 'function') {
      buffer = Buffer.from(await result.arrayBuffer());
    } else {
      console.error('[BLOB_FALLBACK] Unrecognized get() response shape');
      return res.status(502).json({ success: false, error: 'Error al obtener imagen' });
    }
    return res.send(buffer);
  } catch (err) {
    console.error('[BLOB_FALLBACK] Error accessing Blob:', (err as Error).message);
    return next();
  }
});

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
  res.status(200).json({
    status: 'OK',
    timestamp: new Date(),
    blobConfigured: Boolean(process.env['BLOB_READ_WRITE_TOKEN']),
    environment: process.env.VERCEL ? 'vercel' : 'local',
  });
});

app.use(errorHandler);

export default app;
