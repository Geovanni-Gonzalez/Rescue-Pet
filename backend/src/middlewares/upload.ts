import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import type { Request } from 'express';
import { uploadsRoot } from '../utils/uploadsRoot';
import { logger } from '../utils/logger';

const UPLOADS_ROOT = uploadsRoot;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;   // 5 MB
const MAX_DOC_SIZE   = 10 * 1024 * 1024;  // 10 MB

const PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const DOC_MIME   = ['image/jpeg', 'image/png', 'application/pdf'];

// Ensure all upload directories exist on module load
for (const dir of ['animals', 'gallery', 'documents', 'contracts']) {
  const fullPath = path.join(UPLOADS_ROOT, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
}

function makeFilter(allowed: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error(`Formato no permitido. Permitidos: ${allowed.join(', ')}`), { statusCode: 400 }));
    }
  };
}

type UploadSubdir = 'animals' | 'gallery' | 'documents' | 'contracts';

function isBlobEnabled() {
  return Boolean(process.env['BLOB_READ_WRITE_TOKEN']);
}

// Blob access mode: configure via BLOB_ACCESS env var ('public' or 'private').
// Defaults to 'private' (most Vercel Blob stores are created as private).
function blobAccessMode(): 'public' | 'private' {
  const mode = process.env['BLOB_ACCESS'];
  return mode === 'public' ? 'public' : 'private';
}

function loadBlobSdk() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@vercel/blob') as {
      put: (pathname: string, body: Buffer, options: Record<string, unknown>) => Promise<{ url: string; downloadUrl: string }>;
      del: (urlOrPathname: string, options?: Record<string, unknown>) => Promise<void>;
      list: (options: Record<string, unknown>) => Promise<{ blobs: Array<{ url: string; downloadUrl: string; pathname: string; contentType: string }> }>;
    };
  } catch {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN esta definido, pero falta @vercel/blob. Ejecuta npm install en el proyecto antes de desplegar.',
    );
  }
}

function localUploadUrl(subdir: UploadSubdir, filename: string): string {
  // In Vercel, ALWAYS use relative paths. Absolute URLs (even from BACKEND_URL)
  // break because Vercel deployment-specific hostnames require authentication.
  if (process.env.VERCEL) {
    return `/_/backend/uploads/${subdir}/${filename}`;
  }
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL}/uploads/${subdir}/${filename}`;
  }
  return `http://localhost:${process.env.PORT || 3000}/uploads/${subdir}/${filename}`;
}

function makeStorage(subdir: UploadSubdir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(UPLOADS_ROOT, subdir)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.bin';
      cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
    },
  });
}

export const uploadAnimalPhoto = multer({
  storage: makeStorage('animals'),
  fileFilter: makeFilter(PHOTO_MIME),
  limits: { fileSize: MAX_PHOTO_SIZE },
});

export const uploadGalleryPhotos = multer({
  storage: makeStorage('gallery'),
  fileFilter: makeFilter(PHOTO_MIME),
  limits: { fileSize: MAX_PHOTO_SIZE },
});

/** For adopter documents: PDF, JPG, PNG */
export const uploadDocument = multer({
  storage: makeStorage('documents'),
  fileFilter: makeFilter(DOC_MIME),
  limits: { fileSize: MAX_DOC_SIZE },
});

/** Build a publicly accessible URL for an uploaded file */
export function buildUploadUrl(subdir: UploadSubdir, filename: string): string {
  return localUploadUrl(subdir, filename);
}

export async function persistUploadedFile(subdir: UploadSubdir, file: Express.Multer.File): Promise<string> {
  if (!isBlobEnabled()) return buildUploadUrl(subdir, file.filename);

  const { put } = loadBlobSdk();
  const pathname = `uploads/${subdir}/${file.filename}`;
  await put(pathname, fs.readFileSync(file.path), {
    access: blobAccessMode(),
    allowOverwrite: true,
    contentType: file.mimetype,
  });

  cleanupLocalFile(file.path);
  // Always return a relative URL so images are served through our backend
  // proxy (which handles Blob retrieval). This works regardless of store
  // access mode (public or private).
  return localUploadUrl(subdir, file.filename);
}

export async function persistGeneratedFile(
  subdir: UploadSubdir,
  filePath: string,
  filename: string,
  contentType: string,
): Promise<void> {
  if (!isBlobEnabled()) return;

  const { put } = loadBlobSdk();
  await put(`uploads/${subdir}/${filename}`, fs.readFileSync(filePath), {
    access: blobAccessMode(),
    allowOverwrite: true,
    contentType,
  });
  cleanupLocalFile(filePath);
}

/** Delete a file from uploads if it exists (fire-and-forget) */
export function cleanupUpload(filePath: string): void {
  if (isBlobEnabled()) {
    cleanupBlob(filePath).catch((err) => {
      logger.error('Failed to clean up blob upload', { target: filePath, error: (err as Error).message });
    });
    return;
  }

  cleanupLocalFile(filePath);
}

function cleanupLocalFile(filePath: string): void {
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('[UPLOAD] Failed to clean up file:', filePath, err.message);
    }
  });
}

async function cleanupBlob(target: string): Promise<void> {
  const { del } = loadBlobSdk();
  if (/^https?:\/\//.test(target)) {
    await del(target);
    return;
  }

  const normalized = target.replace(/\\/g, '/');
  const uploadsIndex = normalized.lastIndexOf('/uploads/');
  if (uploadsIndex >= 0) {
    await del(normalized.slice(uploadsIndex + 1));
  }
}
