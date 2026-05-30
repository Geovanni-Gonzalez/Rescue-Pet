import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { writeAuditLog } from '../services/auditService';

const clinicalEntrySchema = z.object({
  diagnosis: z.string().min(1),
  treatment: z.string().min(1),
  notes: z.string().optional(),
});

async function ensurePetExists(petId: string) {
  return prisma.pet.findUnique({
    where: { id: petId },
    select: { id: true, name: true, status: true },
  });
}

export const getMedicalSummary = async (req: Request, res: Response) => {
  const petId = req.params['id'] as string;

  if (req.user!.role === 'ADOPTER') {
    return res.status(403).json({ success: false, error: 'No tiene permisos para ver esta sección' });
  }

  const pet = await ensurePetExists(petId);
  if (!pet) {
    return res.status(404).json({ success: false, error: 'Mascota no encontrada' });
  }

  const latestRecord = await prisma.medicalRecord.findFirst({
    where: { petId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  const recordCount = await prisma.medicalRecord.count({ where: { petId } });

  res.json({
    success: true,
    summary: {
      petId,
      petName: pet.name,
      petStatus: pet.status,
      recordCount,
      latestRecordAt: latestRecord?.createdAt ?? null,
    },
  });
};

export const getClinicalRecord = async (req: Request, res: Response) => {
  const petId = req.params['id'] as string;
  const role = req.user!.role;

  if (role === 'ADOPTER') {
    return res.status(403).json({ success: false, error: 'No tiene permisos para ver esta sección' });
  }

  const pet = await ensurePetExists(petId);
  if (!pet) {
    return res.status(404).json({ success: false, error: 'Mascota no encontrada' });
  }

  if (role === 'VOLUNTEER') {
    return getMedicalSummary(req, res);
  }

  const entries = await prisma.medicalRecord.findMany({
    where: { petId },
    include: {
      createdBy: {
        select: { id: true, fullName: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, pet, entries });
};

export const createClinicalEntry = async (req: Request, res: Response) => {
  const petId = req.params['id'] as string;

  const parsed = clinicalEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Entrada clínica inválida', details: parsed.error.issues });
  }

  const pet = await ensurePetExists(petId);
  if (!pet) {
    return res.status(404).json({ success: false, error: 'Mascota no encontrada' });
  }

  const entry = await prisma.medicalRecord.create({
    data: {
      petId,
      diagnosis: parsed.data.diagnosis,
      treatment: parsed.data.treatment,
      notes: parsed.data.notes,
      createdById: req.user!.id,
    },
    include: {
      createdBy: {
        select: { id: true, fullName: true, role: true },
      },
    },
  });

  await writeAuditLog({
    userId: req.user!.id,
    action: 'CREATE_CLINICAL_ENTRY',
    entity: 'MedicalRecord',
    entityId: entry.id,
    details: `Entrada clínica registrada para ${pet.name}`,
  });

  res.status(201).json({ success: true, entry });
};
