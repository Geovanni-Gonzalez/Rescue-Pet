import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import type { TaskType } from '../types/enums';

const TASK_TYPES = ['HEALTH', 'MEDICATION', 'CLEANING', 'FEEDING', 'MAINTENANCE'] as const;
import { writeAuditLog, getClientIp } from '../services/auditService';

const createTaskSchema = z.object({
  animalId: z.string().uuid().optional(),
  type: z.enum(TASK_TYPES),
  assignedRole: z.enum(['VETERINARIAN', 'VOLUNTEER']),
  scheduledAt: z.string().datetime(),
  description: z.string().optional(),
});

const completeTaskSchema = z.object({
  comment: z.string().optional(),
});

export const getTaskAlerts = async (req: Request, res: Response) => {
  const { role, id: userId } = req.user!;
  const now = new Date();

  const where: Record<string, unknown> = {
    status: 'PENDING',
    scheduledAt: { lte: now },
  };

  // Filter tasks by role
  if (role === 'VETERINARIAN') where['assignedRole'] = 'VETERINARIAN';
  else if (role === 'VOLUNTEER') where['assignedRole'] = 'VOLUNTEER';

  const tasks = await prisma.operationalTask.findMany({
    where: where as any,
    include: { animal: { select: { id: true, name: true } } },
    orderBy: { scheduledAt: 'asc' },
  });

  res.json({ success: true, tasks });
};

export const createTask = async (req: Request, res: Response) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });

  const task = await prisma.operationalTask.create({
    data: {
      ...parsed.data,
      scheduledAt: new Date(parsed.data.scheduledAt),
      createdById: req.user!.id,
    },
  });

  res.status(201).json({ success: true, task });
};

export const completeTask = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const userId = req.user!.id;

  const parsed = completeTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Datos inválidos' });

  const task = await prisma.operationalTask.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
  if (task.status === 'COMPLETED') {
    return res.status(400).json({ success: false, error: 'La tarea ya fue completada.' });
  }

  // Atomic: audit must succeed or task stays pending
  const [updated] = await prisma.$transaction([
    prisma.operationalTask.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), completedById: userId, comment: parsed.data.comment },
    }),
    prisma.auditLog.create({
      data: {
        userId,
        action: 'COMPLETE_TASK',
        entityType: 'OperationalTask',
        entityId: id,
        metadataJson: JSON.stringify({ comment: parsed.data.comment }),
        ipAddress: getClientIp(req),
      },
    }),
  ]);

  res.json({ success: true, task: updated });
};

export const getTaskCompletions = async (_req: Request, res: Response) => {
  const completions = await prisma.auditLog.findMany({
    where: { action: 'COMPLETE_TASK', entityType: 'OperationalTask' },
    include: { user: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ success: true, completions });
};
