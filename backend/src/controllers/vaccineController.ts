import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const postponeSchema = z.object({
  postponedTo: z.string().datetime(),
});

export const getImmunizationAlerts = async (req: Request, res: Response) => {
  const now = new Date();
  const alertWindow = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours from now

  const vaccines = await prisma.vaccine.findMany({
    where: {
      status: 'PENDING',
      nextDueAt: { lte: alertWindow },
    },
    include: {
      animal: { select: { id: true, name: true, species: true } },
    },
    orderBy: { nextDueAt: 'asc' },
  });

  res.json({ success: true, alerts: vaccines });
};

export const completeImmunization = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const vaccine = await prisma.vaccine.findUnique({ where: { id } });
  if (!vaccine) return res.status(404).json({ success: false, error: 'Alerta no encontrada' });

  const updated = await prisma.vaccine.update({
    where: { id },
    data: { status: 'COMPLETED' },
  });

  res.json({ success: true, vaccine: updated });
};

export const postponeImmunization = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const parsed = postponeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Fecha inválida.' });
  }

  const vaccine = await prisma.vaccine.findUnique({ where: { id } });
  if (!vaccine) return res.status(404).json({ success: false, error: 'Alerta no encontrada' });

  const updated = await prisma.vaccine.update({
    where: { id },
    data: { status: 'POSTPONED', postponedTo: new Date(parsed.data.postponedTo) },
  });

  res.json({ success: true, vaccine: updated });
};
