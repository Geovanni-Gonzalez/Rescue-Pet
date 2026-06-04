import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import type { JwtPayload } from './authMiddleware';
import { uploadsRoot } from '../utils/uploadsRoot';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';
const UPLOADS_ROOT = uploadsRoot;

function isBlobEnabled() {
  return Boolean(process.env['BLOB_READ_WRITE_TOKEN']);
}

function loadBlobSdk(): {
  list: (options: Record<string, unknown>) => Promise<{ blobs: { url: string; uploadedAt?: Date | string }[] }>;
  get: (url: string) => Promise<{
    arrayBuffer: () => Promise<ArrayBuffer>;
    contentType?: string;
  }>;
} {
  try {
    return require('@vercel/blob');
  } catch {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN esta definido, pero falta @vercel/blob. Ejecuta npm install en el proyecto antes de desplegar.',
    );
  }
}

async function sendPrivateBlob(subdir: 'documents' | 'contracts', filename: string, res: Response) {
  const { list, get } = loadBlobSdk();
  const pathname = `uploads/${subdir}/${filename}`;
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  const blob = blobs
    .filter((item) => item.url)
    .sort((a, b) => new Date(b.uploadedAt ?? 0).getTime() - new Date(a.uploadedAt ?? 0).getTime())[0];

  if (!blob) {
    return res.status(404).json({ success: false, error: 'Archivo no encontrado.' });
  }

  const response = await get(blob.url);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (response.contentType) res.type(response.contentType);
  return res.send(buffer);
}

/**
 * Route handler that guards access to /uploads/documents and /uploads/contracts.
 * Requires a valid JWT in the Authorization header or ?token= query param.
 *
 * Public directories (animals, gallery) are served normally by express.static.
 */
export const servePrivateUpload = (subdir: 'documents' | 'contracts') => {
  return async (req: Request, res: Response) => {
    // Accept token from header or query parameter (for <a href> downloads)
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const queryToken = req.query['token'] as string | undefined;
    const token = headerToken || queryToken;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Acceso denegado. Token requerido.' });
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      return res.status(403).json({ success: false, error: 'Token inválido o expirado.' });
    }

    // Only ADMIN can access documents directly; adopters access metadata through the API
    if (subdir === 'documents' && decoded.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Solo administradores pueden descargar documentos.' });
    }

    // Contracts: ADMIN or ADOPTER (ownership check requires DB, simplified to role check)
    if (subdir === 'contracts' && !['ADMIN', 'ADOPTER'].includes(decoded.role)) {
      return res.status(403).json({ success: false, error: 'Acceso no autorizado al contrato.' });
    }

    // Extract filename from the named param
    const filename = req.params['filename'] as string;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Archivo no especificado.' });
    }

    const filePath = path.join(UPLOADS_ROOT, subdir, filename);

    // Prevent path traversal
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(UPLOADS_ROOT, subdir))) {
      return res.status(400).json({ success: false, error: 'Ruta inválida.' });
    }

    if (isBlobEnabled()) {
      return sendPrivateBlob(subdir, filename, res);
    }

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ success: false, error: 'Archivo no encontrado.' });
    }

    res.sendFile(resolved);
  };
};
