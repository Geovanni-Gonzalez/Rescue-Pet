import prisma from '../utils/prisma';

interface AuditInput {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
}

export async function writeAuditLog({ userId, action, entity, entityId, details }: AuditInput) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      details,
    },
  });
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
    entity: 'AccessControl',
    entityId: input.resource,
    details: JSON.stringify({
      role: input.role,
      resource: input.resource,
      method: input.method,
      ip: input.ip,
    }),
  });
}
