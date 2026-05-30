import { Request } from 'express';
import prisma from '../utils/prisma';

interface AuditInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function writeAuditLog({ userId, action, entityType, entityId, metadata, ipAddress }: AuditInput) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
      ipAddress: ipAddress ?? null,
    },
  });
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? 'unknown';
}

export async function writeAccessDeniedLog(input: {
  userId: string;
  role: string;
  resource: string;
  method: string;
  ip?: string;
}) {
  return writeAuditLog({
    userId: input.userId,
    action: 'ACCESS_DENIED',
    entityType: 'AccessControl',
    entityId: input.resource,
    metadata: { role: input.role, resource: input.resource, method: input.method },
    ipAddress: input.ip,
  });
}
