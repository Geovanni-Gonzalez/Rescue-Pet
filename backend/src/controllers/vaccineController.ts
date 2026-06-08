import { Request, Response } from 'express';
import db from '../utils/db';
import { z } from 'zod';

const postponeSchema = z.object({
  postponedTo: z.string().datetime(),
});

const createVaccineSchema = z.object({
  vaccineType: z.string().min(1),
  appliedAt: z.string().datetime(),
  nextDueAt: z.string().datetime().optional(),
  clinicalEntryId: z.string().optional(),
});

export const createVaccine = async (req: Request, res: Response) => {
  const animalId = req.params['id'] as string;
  const role = req.user!.role;

  if (!['ADMIN', 'VETERINARIAN'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Sin permiso para registrar vacunas.' });
  }

  const parsed = createVaccineSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const animal = await db.animal.findUnique({ where: { id: animalId } });
  if (!animal) return res.status(404).json({ success: false, error: 'Animal no encontrado' });

  const vaccine = await db.vaccine.create({
    data: {
      animalId,
      vaccineType: parsed.data.vaccineType,
      appliedAt: new Date(parsed.data.appliedAt),
      nextDueAt: parsed.data.nextDueAt ? new Date(parsed.data.nextDueAt) : undefined,
      clinicalEntryId: parsed.data.clinicalEntryId ?? undefined,
      status: parsed.data.nextDueAt ? 'PENDING' : 'COMPLETED',
    },
  });

  res.status(201).json({ success: true, vaccine });
};

export const getAnimalVaccines = async (req: Request, res: Response) => {
  const animalId = req.params['id'] as string;
  const role = req.user!.role;

  if (role === 'ADOPTER') {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  const vaccines = await db.vaccine.findMany({
    where: { animalId },
    orderBy: { appliedAt: 'desc' },
  });

  res.json({ success: true, vaccines });
};

export const getImmunizationAlerts = async (req: Request, res: Response) => {
  const now = new Date();
  const alertWindow = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours from now

  const vaccines = await db.vaccine.findMany({
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

  const vaccine = await db.vaccine.findUnique({ where: { id } });
  if (!vaccine) return res.status(404).json({ success: false, error: 'Alerta no encontrada' });

  const updated = await db.vaccine.update({
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

  const vaccine = await db.vaccine.findUnique({ where: { id } });
  if (!vaccine) return res.status(404).json({ success: false, error: 'Alerta no encontrada' });

  const updated = await db.vaccine.update({
    where: { id },
    data: { status: 'POSTPONED', postponedTo: new Date(parsed.data.postponedTo) },
  });

  res.json({ success: true, vaccine: updated });
};
