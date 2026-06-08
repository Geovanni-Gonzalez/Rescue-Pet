import { Request, Response } from 'express';
import db from '../utils/db';
import { z } from 'zod';

const clinicalEntrySchema = z.object({
  datetime: z.string().datetime(),
  diagnosis: z.string().min(1),
  treatment: z.string().min(1),
  medicine: z.string().optional(),
  dose: z.string().optional(),
  duration: z.string().optional(),
  observations: z.string().optional(),
});

export const getClinicalRecord = async (req: Request, res: Response) => {
  const animalId = req.params['id'] as string;
  const role = req.user!.role;

  if (role === 'ADOPTER') {
    return res.status(403).json({ success: false, error: 'Acceso denegado al expediente clínico completo.' });
  }

  const record = await db.clinicalRecord.findUnique({
    where: { animalId },
    include: {
      entries: {
        orderBy: { datetime: 'asc' },
        include: {
          veterinarian: { select: { id: true, fullName: true } },
          vaccines: true,
        },
      },
    },
  });

  res.json({ success: true, clinicalRecord: record ?? null });
};

export const getMedicalSummary = async (req: Request, res: Response) => {
  const animalId = req.params['id'] as string;
  const role = req.user!.role;

  if (role === 'ADOPTER') {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  const record = await db.clinicalRecord.findUnique({
    where: { animalId },
    include: {
      entries: {
        orderBy: { datetime: 'desc' },
        take: 3,
        select: {
          id: true,
          datetime: true,
          diagnosis: role === 'VOLUNTEER' ? false : true,
          treatment: role === 'VOLUNTEER' ? false : true,
          observations: role === 'VOLUNTEER' ? false : true,
          veterinarian: { select: { fullName: true } },
        },
      },
    },
  });

  const entryCount = record
    ? await db.clinicalEntry.count({ where: { clinicalRecordId: record.id } })
    : 0;

  res.json({ success: true, summary: { hasRecord: !!record, entryCount, recentEntries: record?.entries ?? [] } });
};

export const createClinicalEntry = async (req: Request, res: Response) => {
  const animalId = req.params['id'] as string;
  const role = req.user!.role;

  if (!['ADMIN', 'VETERINARIAN'].includes(role)) {
    return res.status(403).json({ success: false, error: 'Sin permiso para registrar entradas clínicas.' });
  }

  const parsed = clinicalEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  // Get or create clinical record
  let record = await db.clinicalRecord.findUnique({ where: { animalId } });
  if (!record) {
    record = await db.clinicalRecord.create({ data: { animalId } });
  }

  const entry = await db.clinicalEntry.create({
    data: {
      clinicalRecordId: record.id,
      animalId,
      veterinarianId: req.user!.id,
      datetime: new Date(parsed.data.datetime),
      diagnosis: parsed.data.diagnosis,
      treatment: parsed.data.treatment,
      medicine: parsed.data.medicine,
      dose: parsed.data.dose,
      duration: parsed.data.duration,
      observations: parsed.data.observations,
    },
    include: { veterinarian: { select: { id: true, fullName: true } } },
  });

  res.status(201).json({ success: true, entry });
};
