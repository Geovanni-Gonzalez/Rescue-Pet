import { Request, Response } from 'express';
import db from '../utils/db';
import { z } from 'zod';
import { notifyUser, notifyActiveAdmins } from '../services/notificationService';
import { writeAuditLog, getClientIp } from '../services/auditService';
import { logger } from '../utils/logger';

const slotCreateSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

const SLOT_TAKEN_MSG = 'Este horario ya fue reservado. Por favor, seleccione otro disponible.';

function formatSlotDate(date: Date) {
  return date.toLocaleString('es-CR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: process.env.SHELTER_TIMEZONE || 'America/Costa_Rica',
  });
}

// CU-17 paso 1: el Administrador define slots de tiempo disponibles.
export const createSlot = async (req: Request, res: Response) => {
  const parsed = slotCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);

  if (endsAt <= startsAt) {
    return res.status(400).json({ success: false, error: 'La hora de fin debe ser posterior a la hora de inicio.' });
  }
  if (startsAt <= new Date()) {
    return res.status(400).json({ success: false, error: 'El horario debe estar en el futuro.' });
  }

  // Evitar slots solapados con otros activos
  const overlapping = await db.interviewSlot.findFirst({
    where: {
      status: { in: ['available', 'reserved'] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (overlapping) {
    return res.status(400).json({ success: false, error: 'El horario se solapa con otro horario existente.' });
  }

  const slot = await db.interviewSlot.create({
    data: {
      startsAt,
      endsAt,
      createdByAdminId: req.user!.id,
    },
  });

  res.status(201).json({ success: true, slot });
};

// CU-17 pasos 2-3: slots disponibles publicados para el Adoptante.
export const getAvailableSlots = async (_req: Request, res: Response) => {
  const slots = await db.interviewSlot.findMany({
    where: { status: 'available', startsAt: { gte: new Date() } },
    orderBy: { startsAt: 'asc' },
  });
  res.json({ success: true, slots });
};

// Panel de agenda del Administrador: todos los slots próximos (disponibles y
// reservados) con los datos de la cita para poder gestionarlos (CU-17 1A).
export const getAllSlots = async (_req: Request, res: Response) => {
  const slots = await db.interviewSlot.findMany({
    where: { status: { in: ['available', 'reserved'] } },
    orderBy: { startsAt: 'asc' },
  });

  const enriched = await Promise.all(
    slots.map(async (slot: Record<string, any>) => {
      if (slot['status'] !== 'reserved' || !slot['reservedByApplicationId']) return slot;
      const application = await db.adoptionRequest.findUnique({
        where: { id: slot['reservedByApplicationId'] },
        include: {
          adopter: { select: { id: true, fullName: true, email: true } },
          animal: { select: { id: true, name: true } },
        },
      });
      return {
        ...slot,
        reservation: application
          ? {
              applicationId: application.id,
              adopterName: application.adopter?.fullName ?? null,
              animalName: application.animal?.name ?? null,
            }
          : null,
      };
    })
  );

  res.json({ success: true, slots: enriched });
};

// CU-17 pasos 4-8: el Adoptante reserva un slot con bloqueo transaccional.
export const scheduleInterview = async (req: Request, res: Response) => {
  const applicationId = req.params['id'] as string;
  const { slotId } = req.body;

  if (!slotId) return res.status(400).json({ success: false, error: 'Debes seleccionar un horario.' });

  const application = await db.adoptionRequest.findUnique({
    where: { id: applicationId },
    include: {
      animal: { select: { id: true, name: true } },
      adopter: { select: { id: true, fullName: true } },
      interviewSlot: { select: { id: true, status: true } },
    },
  });
  if (!application) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });

  if (req.user!.role === 'ADOPTER' && application.adopterId !== req.user!.id) {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  // CU-17 4E: la solicitud debe seguir en estado "Recibida" (se tolera INTERVIEW
  // sin slot reservado: ocurre cuando el Administrador canceló la cita anterior).
  if (application.interviewSlot && application.interviewSlot.status === 'reserved') {
    return res.status(400).json({
      success: false,
      error: 'Ya tienes una entrevista agendada. Consulta tu tablero de seguimiento.',
    });
  }
  if (!['RECEIVED', 'INTERVIEW'].includes(application.status)) {
    return res.status(400).json({
      success: false,
      error: 'La solicitud ya no está en estado "Recibida". Consulta tu tablero de seguimiento actualizado.',
    });
  }

  // CU-17 paso 5 / 5E: bloqueo transaccional — solo un adoptante obtiene el slot.
  let reservedSlot: Record<string, any>;
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

      // CU-17 paso 6: la solicitud pasa a "Entrevista".
      await tx.adoptionRequest.update({
        where: { id: applicationId },
        data: { status: 'INTERVIEW' },
      });

      return [updated];
    });
    reservedSlot = slot;
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'SLOT_UNAVAILABLE') {
      return res.status(409).json({ success: false, error: SLOT_TAKEN_MSG });
    }
    throw err;
  }

  const slotDate = formatSlotDate(new Date(reservedSlot['startsAt']));

  // CU-17 pasos 7-8: confirmación a ambos actores (fecha, hora, adoptante, mascota).
  try {
    await notifyActiveAdmins({
      type: 'INFO',
      title: 'Entrevista agendada',
      message: `${application.adopter?.fullName ?? 'Un adoptante'} agendó entrevista por ${application.animal?.name ?? 'una mascota'} el ${slotDate}.`,
      resourceType: 'AdoptionRequest',
      resourceId: applicationId,
    });
    await notifyUser({
      userId: application.adopterId,
      type: 'SUCCESS',
      title: 'Entrevista confirmada',
      message: `Tu entrevista por ${application.animal?.name ?? 'la mascota'} quedó agendada para el ${slotDate}.`,
      resourceType: 'AdoptionRequest',
      resourceId: applicationId,
    });
  } catch (err) {
    logger.error('Failed to send interview notifications', { applicationId, error: (err as Error).message });
  }

  await writeAuditLog({
    userId: req.user!.id,
    action: 'SCHEDULE_INTERVIEW',
    entityType: 'InterviewSlot',
    entityId: String(reservedSlot['id']),
    metadata: { applicationId, startsAt: reservedSlot['startsAt'] },
    ipAddress: getClientIp(req),
  }).catch((err) => logger.error('Failed to audit interview scheduling', { error: (err as Error).message }));

  res.json({ success: true, slot: reservedSlot });
};

// CU-17 1A: el Administrador cancela un slot (disponible o reservado). Si estaba
// reservado, libera el bloqueo, revierte la solicitud a "Recibida" y notifica al
// Adoptante para que seleccione un nuevo horario.
export const cancelSlot = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const slot = await db.interviewSlot.findUnique({ where: { id } });
  if (!slot) return res.status(404).json({ success: false, error: 'Horario no encontrado.' });
  if (slot.status === 'cancelled') {
    return res.status(400).json({ success: false, error: 'El horario ya fue cancelado.' });
  }

  const reservedByApplicationId = slot.reservedByApplicationId as string | null;

  await db.$transaction(async (tx) => {
    await tx.interviewSlot.update({
      where: { id },
      data: { status: 'cancelled', reservedByApplicationId: null },
    });

    if (reservedByApplicationId) {
      const application = await tx.adoptionRequest.findUnique({ where: { id: reservedByApplicationId } });
      if (application && application.status === 'INTERVIEW') {
        await tx.adoptionRequest.update({
          where: { id: reservedByApplicationId },
          data: { status: 'RECEIVED' },
        });
      }
    }
  });

  if (reservedByApplicationId) {
    const application = await db.adoptionRequest.findUnique({
      where: { id: reservedByApplicationId },
      include: { animal: { select: { name: true } } },
    });
    if (application) {
      await notifyUser({
        userId: application.adopterId,
        type: 'WARNING',
        title: 'Entrevista cancelada',
        message: `Tu entrevista por ${application.animal?.name ?? 'la mascota'} del ${formatSlotDate(new Date(slot.startsAt))} fue cancelada por el refugio. Por favor selecciona un nuevo horario desde tu tablero.`,
        resourceType: 'AdoptionRequest',
        resourceId: reservedByApplicationId,
      }).catch((err) =>
        logger.error('Failed to notify adopter about cancelled slot', { error: (err as Error).message })
      );
    }
  }

  await writeAuditLog({
    userId: req.user!.id,
    action: 'CANCEL_INTERVIEW_SLOT',
    entityType: 'InterviewSlot',
    entityId: id,
    metadata: { wasReservedBy: reservedByApplicationId },
    ipAddress: getClientIp(req),
  }).catch((err) => logger.error('Failed to audit slot cancellation', { error: (err as Error).message }));

  res.json({ success: true, message: 'Horario cancelado.' });
};
