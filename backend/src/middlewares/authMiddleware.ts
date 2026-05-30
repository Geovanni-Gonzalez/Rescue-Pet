import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '../types/enums';
import { writeAccessDeniedLog } from '../services/auditService';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Acceso denegado. Token no provisto.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (_err) {
    res.status(403).json({ success: false, error: 'Token inválido o expirado.' });
  }
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
