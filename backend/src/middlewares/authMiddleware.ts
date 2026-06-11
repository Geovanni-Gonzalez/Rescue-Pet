import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../utils/db';
import type { Role } from '../types/enums';
import { writeAccessDeniedLog } from '../services/auditService';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

// Margen para no invalidar tokens emitidos en el mismo segundo del cambio de contraseña.
const PASSWORD_CHANGE_SKEW_MS = 2000;

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  iat?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Acceso denegado. Token no provisto.' });
    return;
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (_err) {
    res.status(403).json({ success: false, error: 'Token inválido o expirado.' });
    return;
  }

  // Verificación de sesión contra la BD: invalida tokens emitidos antes del último
  // cambio de contraseña (CU-10 3A), corta el acceso de cuentas dadas de baja lógica
  // (CU-10 3C) y refresca el rol para que un cambio de rol aplique de inmediato.
  // Si la BD no responde, se continúa con el payload firmado del token.
  let dbUser: Record<string, unknown> | null = null;
  try {
    dbUser = await db.user.findUnique({ where: { id: decoded.id } });
  } catch {
    dbUser = null;
  }

  if (dbUser && dbUser['id'] === decoded.id) {
    if (typeof dbUser['status'] === 'string' && dbUser['status'] === 'INACTIVE') {
      res.status(403).json({ success: false, error: 'Token inválido o expirado.' });
      return;
    }

    const changedAtRaw = dbUser['passwordChangedAt'];
    const changedAt = changedAtRaw ? new Date(changedAtRaw as string | Date).getTime() : null;
    if (changedAt && decoded.iat && decoded.iat * 1000 < changedAt - PASSWORD_CHANGE_SKEW_MS) {
      res.status(403).json({ success: false, error: 'Token inválido o expirado.' });
      return;
    }

    if (typeof dbUser['role'] === 'string') {
      decoded = { ...decoded, role: dbUser['role'] as Role };
    }
  }

  req.user = decoded;
  next();
};

export const authorizeRoles = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Usuario no autenticado.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      void writeAccessDeniedLog({
        userId: req.user.id,
        role: req.user.role,
        resource: req.originalUrl,
        method: req.method,
        ip: req.ip,
      }).catch((err) => {
        console.error('Failed to write access denied audit log', err);
      });

      res.status(403).json({ success: false, error: 'No tienes permisos para realizar esta acción.' });
      return;
    }

    next();
  };
};
