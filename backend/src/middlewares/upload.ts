import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import type { Request } from 'express';

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
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
  const base = process.env.BACKEND_URL || 'http://localhost:3000';
  return `${base}/uploads/${subdir}/${filename}`;
}

/** Delete a file from uploads if it exists (fire-and-forget) */
export function cleanupUpload(filePath: string): void {
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('[UPLOAD] Failed to clean up file:', filePath, err.message);
    }
  });
}
