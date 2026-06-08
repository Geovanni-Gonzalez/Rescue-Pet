import { Request, Response } from 'express';
import db from '../utils/db';
import { z } from 'zod';
import type { TaskType } from '../types/enums';
import { writeAuditLog, getClientIp } from '../services/auditService';
import { notifyByRole } from '../services/notificationService';
import { logger } from '../utils/logger';

const TASK_TYPES = ['HEALTH', 'MEDICATION', 'CLEANING', 'FEEDING', 'MAINTENANCE'] as const;
const ASSIGNED_ROLES = ['VETERINARIAN', 'VOLUNTEER'] as const;

const createTaskSchema = z.object({
  animalId: z.string().uuid().optional(),
  type: z.enum(TASK_TYPES),
  assignedRole: z.enum(ASSIGNED_ROLES),
  scheduledAt: z.string().datetime(),
  description: z.string().optional(),
});

const completeTaskSchema = z.object({
  comment: z.string().optional(),
});

export const getTasks = async (req: Request, res: Response) => {
  const { role } = req.user!;
  const statusFilter = req.query['status'] as string | undefined;
  const typeFilter = req.query['type'] as string | undefined;

  const where: Record<string, unknown> = {};

  if (role === 'VETERINARIAN') where['assignedRole'] = 'VETERINARIAN';
  else if (role === 'VOLUNTEER') where['assignedRole'] = 'VOLUNTEER';

  if (statusFilter === 'PENDING' || statusFilter === 'COMPLETED') where['status'] = statusFilter;
  if (typeFilter && TASK_TYPES.includes(typeFilter as TaskType)) where['type'] = typeFilter;

  const tasks = await db.operationalTask.findMany({
    where: where as any,
    include: {
      animal: { select: { id: true, name: true, species: true } },
      createdBy: { select: { id: true, fullName: true } },
      completedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  });

  res.json({ success: true, tasks });
};

export const getTaskAlerts = async (req: Request, res: Response) => {
  const { role } = req.user!;
  const now = new Date();

  const where: Record<string, unknown> = {
    status: 'PENDING',
    scheduledAt: { lte: now },
  };

  if (role === 'VETERINARIAN') where['assignedRole'] = 'VETERINARIAN';
  else if (role === 'VOLUNTEER') where['assignedRole'] = 'VOLUNTEER';

  const tasks = await db.operationalTask.findMany({
    where: where as any,
    include: { animal: { select: { id: true, name: true } } },
    orderBy: { scheduledAt: 'asc' },
  });

  res.json({ success: true, tasks });
};

export const createTask = async (req: Request, res: Response) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });

  const task = await db.operationalTask.create({
    data: {
      ...parsed.data,
      scheduledAt: new Date(parsed.data.scheduledAt),
      createdById: req.user!.id,
    },
    include: {
      animal: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog({
    userId: req.user!.id,
    action: 'CREATE_TASK',
    entityType: 'OperationalTask',
    entityId: task.id,
    metadata: { type: task.type, assignedRole: task.assignedRole },
    ipAddress: getClientIp(req),
  });

  const animalName = task.animal?.name ?? 'N/A';
  notifyByRole(parsed.data.assignedRole, {
    title: 'Nueva tarea asignada',
    message: `Tarea de ${task.type} para ${animalName} programada para ${new Date(task.scheduledAt).toLocaleDateString('es-CR')}`,
    type: 'INFO',
    resourceType: 'OperationalTask',
    resourceId: task.id,
  }).catch((err) => logger.error('Failed to notify role on task creation', { taskId: task.id, error: (err as Error).message }));

  res.status(201).json({ success: true, task });
};

export const completeTask = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const userId = req.user!.id;
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

  const parsed = completeTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Datos inválidos' });

  const task = await db.operationalTask.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
  if (task.status === 'COMPLETED') {
    return res.status(409).json({ success: false, error: 'La tarea ya fue completada.', alreadyCompleted: true });
  }

  if (idempotencyKey) {
    const existing = await db.auditLog.findFirst({
      where: { action: 'COMPLETE_TASK', entityId: id, metadataJson: { contains: idempotencyKey } },
    });
    if (existing) {
      const alreadyDone = await db.operationalTask.findUnique({ where: { id } });
      return res.json({ success: true, task: alreadyDone, idempotent: true });
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const task = await tx.operationalTask.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), completedById: userId, comment: parsed.data.comment },
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: 'COMPLETE_TASK',
        entityType: 'OperationalTask',
        entityId: id,
        metadataJson: JSON.stringify({ comment: parsed.data.comment, idempotencyKey }),
        ipAddress: getClientIp(req),
      },
    });
    return task;
  });

  res.json({ success: true, task: updated });
};

export const getTaskCompletions = async (_req: Request, res: Response) => {
  const completions = await db.auditLog.findMany({
    where: { action: 'COMPLETE_TASK', entityType: 'OperationalTask' },
    include: { user: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ success: true, completions });
};
