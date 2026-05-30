import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import type { Request } from 'express';

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

// Ensure directories exist on module load
for (const dir of ['animals', 'gallery']) {
  const fullPath = path.join(UPLOADS_ROOT, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
}

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Formato no permitido. Usa JPG, PNG o WEBP.'), { statusCode: 400 }));
  }
};

function makeStorage(subdir: 'animals' | 'gallery') {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(UPLOADS_ROOT, subdir)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
    },
  });
}

export const uploadAnimalPhoto = multer({
  storage: makeStorage('animals'),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export const uploadGalleryPhotos = multer({
  storage: makeStorage('gallery'),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

/** Build a publicly accessible URL for an uploaded file */
export function buildUploadUrl(subdir: 'animals' | 'gallery', filename: string): string {
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
