import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { PetStatus } from '@prisma/client';
import { writeAuditLog } from '../services/auditService';
import { generatePetQrDataUrl } from '../services/qrService';
import {
  ACTIVE_ADOPTION_STATUSES,
  canTransitionPetStatus,
  getAllowedPetTransitions,
  isTerminalPetStatus,
} from '../domain/petRules';

const petCreateSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  estimatedAge: z.number().int().nonnegative().optional(),
  size: z.string().optional(),
  mainPhotoUrl: z.string().url(),
  rescueLocationText: z.string().optional(),
  energyLevel: z.string().optional(),
  spaceNeed: z.string().optional(),
  goodWithChildren: z.boolean().optional(),
  goodWithPets: z.boolean().optional(),
});

const petUpdateSchema = petCreateSchema.partial();

const petStatusSchema = z.object({
  status: z.nativeEnum(PetStatus),
});

export const getPets = async (req: Request, res: Response) => {
  const role = req.user!.role;
  const query: Record<string, unknown> = {};

  if (role === 'ADOPTER') {
    query['status'] = 'AVAILABLE';
  } else if (req.query['status']) {
    query['status'] = req.query['status'] as string;
  }

  const pets = await prisma.pet.findMany({
    where: query as any,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, pets });
};

export const getPetById = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const role = req.user!.role;

  const pet = await prisma.pet.findUnique({ where: { id } });

  if (!pet) {
    return res.status(404).json({ success: false, error: 'Mascota no encontrada' });
  }

  if (role === 'ADOPTER' && pet.status !== 'AVAILABLE') {
    return res.status(403).json({ success: false, error: 'Esta mascota no está disponible para adopción en este momento.' });
  }

  res.json({ success: true, pet });
};

export const createPet = async (req: Request, res: Response) => {
  const parsed = petCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const newPet = await prisma.pet.create({
    data: {
      ...parsed.data,
      status: 'QUARANTINE',
    },
  });

  let qrCodeUrl: string | null = null;
  try {
    qrCodeUrl = await generatePetQrDataUrl(newPet.id);
    await prisma.pet.update({
      where: { id: newPet.id },
      data: { qrCodeUrl },
    });
  } catch (err) {
    console.error(`QR generation failed for pet ${newPet.id}`, err);
  }

  await writeAuditLog({
    userId: req.user!.id,
    action: 'CREATE_PET',
    entity: 'Pet',
    entityId: newPet.id,
  });

  res.status(201).json({ success: true, pet: { ...newPet, qrCodeUrl } });
};

export const updatePet = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const parsed = petUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const pet = await prisma.pet.findUnique({ where: { id } });
  if (!pet) {
    return res.status(404).json({ success: false, error: 'Mascota no encontrada' });
  }

  const updatedPet = await prisma.pet.update({
    where: { id },
    data: parsed.data,
  });

  await writeAuditLog({
    userId: req.user!.id,
    action: 'UPDATE_PET',
    entity: 'Pet',
    entityId: id,
    details: JSON.stringify(parsed.data),
  });

  res.json({ success: true, pet: updatedPet });
};

export const updatePetStatus = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const parsed = petStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Estado inválido' });
  }

  const newStatus = parsed.data.status;
  const pet = await prisma.pet.findUnique({ where: { id } });

  if (!pet) {
    return res.status(404).json({ success: false, error: 'Mascota no encontrada' });
  }

  const currentStatus = pet.status;

  if (isTerminalPetStatus(currentStatus)) {
    return res.status(400).json({ success: false, error: `No se puede cambiar el estado de una mascota ${currentStatus}` });
  }

  if (!canTransitionPetStatus(currentStatus, newStatus)) {
    return res.status(400).json({
      success: false,
      error: `Transición inválida de ${currentStatus} a ${newStatus}. Transiciones permitidas: ${getAllowedPetTransitions(currentStatus).join(', ')}`,
    });
  }

  if (newStatus === 'AVAILABLE') {
    const medicalRecordCount = await prisma.medicalRecord.count({ where: { petId: id } });

    if (!pet.mainPhotoUrl || medicalRecordCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Para marcar una mascota como Disponible debe tener fotografía principal e historial clínico básico.',
      });
    }
  }

  if (currentStatus === 'AVAILABLE' && newStatus !== 'ADOPTED') {
    const activeRequest = await prisma.adoptionRequest.findFirst({
      where: {
        petId: id,
        status: { in: ACTIVE_ADOPTION_STATUSES },
      },
    });

    if (activeRequest) {
      return res.status(409).json({
        success: false,
        error: 'Esta mascota tiene una solicitud de adopción en curso. Resuelve la solicitud antes de cambiar su estado.',
        adoptionRequestId: activeRequest.id,
      });
    }
  }

  const updatedPet = await prisma.pet.update({
    where: { id },
    data: { status: newStatus },
  });

  await writeAuditLog({
    userId: req.user!.id,
    action: 'UPDATE_PET_STATUS',
    entity: 'Pet',
    entityId: id,
    details: `Cambio de ${currentStatus} a ${newStatus}`,
  });

  res.json({ success: true, pet: updatedPet });
};

export const generatePetQR = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const pet = await prisma.pet.findUnique({ where: { id } });
  if (!pet) {
    return res.status(404).json({ success: false, error: 'Mascota no encontrada' });
  }

  try {
    const qrDataUrl = await generatePetQrDataUrl(id);

    const updatedPet = await prisma.pet.update({
      where: { id },
      data: { qrCodeUrl: qrDataUrl },
    });

    await writeAuditLog({
      userId: req.user!.id,
      action: 'GENERATE_PET_QR',
      entity: 'Pet',
      entityId: id,
    });

    res.json({ success: true, qrCodeUrl: qrDataUrl, pet: updatedPet });
  } catch (_err) {
    res.status(500).json({ success: false, error: 'Error al generar el código QR' });
  }
};
