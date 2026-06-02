import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getAuditLogs = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 30));
  const skip = (page - 1) * limit;

  const action = req.query['action'] as string | undefined;
  const entityType = req.query['entityType'] as string | undefined;
  const userId = req.query['userId'] as string | undefined;

  const where: Record<string, unknown> = {};
  if (action) where['action'] = action;
  if (entityType) where['entityType'] = entityType;
  if (userId) where['userId'] = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: where as any,
      include: { user: { select: { id: true, fullName: true, role: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.auditLog.count({ where: where as any }),
  ]);

  res.json({ success: true, logs, total, page, limit });
};

export const getAuditActions = async (_req: Request, res: Response) => {
  const raw = await prisma.auditLog.findMany({
    distinct: ['action'],
    select: { action: true },
    orderBy: { action: 'asc' },
  });
  res.json({ success: true, actions: raw.map((r) => r.action) });
};

export const getAuditEntityTypes = async (_req: Request, res: Response) => {
  const raw = await prisma.auditLog.findMany({
    distinct: ['entityType'],
    select: { entityType: true },
    orderBy: { entityType: 'asc' },
  });
  res.json({ success: true, entityTypes: raw.map((r) => r.entityType) });
};
