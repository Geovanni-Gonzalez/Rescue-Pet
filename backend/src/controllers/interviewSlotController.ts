import { Request, Response } from 'express';
import db from '../utils/db';
import { z } from 'zod';

const slotCreateSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export const createSlot = async (req: Request, res: Response) => {
  const parsed = slotCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Datos inválidos' });

  const slot = await db.interviewSlot.create({
    data: {
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      createdByAdminId: req.user!.id,
    },
  });

  res.status(201).json({ success: true, slot });
};

export const getAvailableSlots = async (_req: Request, res: Response) => {
  const slots = await db.interviewSlot.findMany({
    where: { status: 'available', startsAt: { gte: new Date() } },
    orderBy: { startsAt: 'asc' },
  });
  res.json({ success: true, slots });
};

export const scheduleInterview = async (req: Request, res: Response) => {
  const applicationId = req.params['id'] as string;
  const { slotId } = req.body;

  if (!slotId) return res.status(400).json({ success: false, error: 'slotId es requerido.' });

  const application = await db.adoptionRequest.findUnique({ where: { id: applicationId } });
  if (!application) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });

  if (!['RECEIVED', 'INTERVIEW'].includes(application.status)) {
    return res.status(400).json({ success: false, error: 'La solicitud no está en un estado válido para agendar entrevista.' });
  }

  // Transactional lock to prevent double-booking
  try {
    const [slot] = await db.$transaction(async (tx) => {
      const slot = await tx.interviewSlot.findUnique({ where: { id: slotId } });
      if (!slot || slot.status !== 'available') {
        throw new Error('SLOT_UNAVAILABLE');
      }

      const updated = await tx.interviewSlot.update({
        where: { id: slotId },
        data: { status: 'reserved', reservedByApplicationId: applicationId },
      });

      await tx.adoptionRequest.update({
        where: { id: applicationId },
        data: { status: 'INTERVIEW' },
      });

      return [updated];
    });

    res.json({ success: true, slot });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'SLOT_UNAVAILABLE') {
      return res.status(409).json({ success: false, error: 'El slot ya no está disponible.' });
    }
    throw err;
  }
};

export const cancelSlot = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const slot = await db.interviewSlot.findUnique({ where: { id } });
  if (!slot) return res.status(404).json({ success: false, error: 'Slot no encontrado' });

  await db.interviewSlot.update({ where: { id }, data: { status: 'cancelled' } });
  res.json({ success: true, message: 'Slot cancelado' });
};
