import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { AnimalStatus } from '@prisma/client';
import { writeAuditLog, getClientIp } from '../services/auditService';
import { generatePetQrDataUrl } from '../services/qrService';
import {
  ACTIVE_ADOPTION_STATUSES,
  canTransitionAnimalStatus,
  getAllowedAnimalTransitions,
  isTerminalAnimalStatus,
} from '../domain/animalRules';

const animalCreateSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  estimatedBreed: z.string().optional(),
  estimatedAge: z.number().int().nonnegative().optional(),
  size: z.string().optional(),
  mainPhotoUrl: z.string().url(),
  rescueLocationText: z.string().optional(),
  rescueLatitude: z.number().optional(),
  rescueLongitude: z.number().optional(),
  energyLevel: z.string().optional(),
  spaceNeed: z.string().optional(),
  goodWithChildren: z.boolean().optional(),
  goodWithPets: z.boolean().optional(),
});

const animalUpdateSchema = animalCreateSchema.partial();

const animalStatusSchema = z.object({
  status: z.nativeEnum(AnimalStatus),
  reason: z.string().optional(),
});

export const getAnimals = async (req: Request, res: Response) => {
  const role = req.user!.role;
  const where: Record<string, unknown> = {};

  if (role === 'ADOPTER') {
    where['status'] = 'AVAILABLE';
  } else if (req.query['status']) {
    where['status'] = req.query['status'];
  }

  const animals = await prisma.animal.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { gallery: true } },
    },
  });

  res.json({ success: true, animals });
};

export const getAnimalById = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const role = req.user!.role;

  const animal = await prisma.animal.findUnique({
    where: { id },
    include: { gallery: true },
  });

  if (!animal) {
    return res.status(404).json({ success: false, error: 'Animal no encontrado' });
  }

  if (role === 'ADOPTER' && animal.status !== 'AVAILABLE') {
    return res.status(403).json({ success: false, error: 'Este animal no está disponible para adopción.' });
  }

  res.json({ success: true, animal });
};

export const createAnimal = async (req: Request, res: Response) => {
  const parsed = animalCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const newAnimal = await prisma.animal.create({
    data: {
      ...parsed.data,
      status: 'QUARANTINE',
      createdByUserId: req.user!.id,
    },
  });

  // Generate public profile URL
  const publicProfileUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/catalog/animals/${newAnimal.id}`;
  let qrUrl: string | null = null;

  try {
    qrUrl = await generatePetQrDataUrl(newAnimal.id);
  } catch (err) {
    console.error(`QR generation failed for animal ${newAnimal.id}`, err);
  }

  const updated = await prisma.animal.update({
    where: { id: newAnimal.id },
    data: { publicProfileUrl, qrUrl },
  });

  await writeAuditLog({
    userId: req.user!.id,
    action: 'CREATE_ANIMAL',
    entityType: 'Animal',
    entityId: newAnimal.id,
    ipAddress: getClientIp(req),
  });

  res.status(201).json({ success: true, animal: updated });
};

export const updateAnimal = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const parsed = animalUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const animal = await prisma.animal.findUnique({ where: { id } });
  if (!animal) {
    return res.status(404).json({ success: false, error: 'Animal no encontrado' });
  }

  const updated = await prisma.animal.update({ where: { id }, data: parsed.data });

  await writeAuditLog({
    userId: req.user!.id,
    action: 'UPDATE_ANIMAL',
    entityType: 'Animal',
    entityId: id,
    metadata: parsed.data as Record<string, unknown>,
    ipAddress: getClientIp(req),
  });

  res.json({ success: true, animal: updated });
};

export const updateAnimalStatus = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const parsed = animalStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Estado inválido' });
  }

  const { status: newStatus, reason } = parsed.data;
  const animal = await prisma.animal.findUnique({ where: { id } });

  if (!animal) {
    return res.status(404).json({ success: false, error: 'Animal no encontrado' });
  }

  const currentStatus = animal.status;

  if (isTerminalAnimalStatus(currentStatus)) {
    return res.status(400).json({ success: false, error: `No se puede cambiar el estado de un animal ${currentStatus}` });
  }

  if (!canTransitionAnimalStatus(currentStatus, newStatus)) {
    return res.status(400).json({
      success: false,
      error: `Transición inválida de ${currentStatus} a ${newStatus}. Permitidas: ${getAllowedAnimalTransitions(currentStatus).join(', ')}`,
    });
  }

  if (newStatus === 'AVAILABLE') {
    const recordCount = await prisma.clinicalRecord.count({ where: { animalId: id } });
    if (!animal.mainPhotoUrl || recordCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Para marcar como Disponible el animal debe tener fotografía principal e historial clínico básico.',
      });
    }
  }

  if (currentStatus === 'AVAILABLE' && newStatus !== 'ADOPTED') {
    const activeRequest = await prisma.adoptionRequest.findFirst({
      where: { animalId: id, status: { in: ACTIVE_ADOPTION_STATUSES } },
    });
    if (activeRequest) {
      return res.status(409).json({
        success: false,
        error: 'Este animal tiene una solicitud de adopción en curso. Resuelve la solicitud primero.',
        adoptionApplicationId: activeRequest.id,
      });
    }
  }

  const [updated] = await prisma.$transaction([
    prisma.animal.update({ where: { id }, data: { status: newStatus } }),
    prisma.animalStatusHistory.create({
      data: {
        animalId: id,
        previousStatus: currentStatus,
        newStatus,
        changedByUserId: req.user!.id,
        reason: reason ?? null,
      },
    }),
  ]);

  await writeAuditLog({
    userId: req.user!.id,
    action: 'UPDATE_ANIMAL_STATUS',
    entityType: 'Animal',
    entityId: id,
    metadata: { from: currentStatus, to: newStatus, reason },
    ipAddress: getClientIp(req),
  });

  res.json({ success: true, animal: updated });
};

export const getAnimalStatusHistory = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const history = await prisma.animalStatusHistory.findMany({
    where: { animalId: id },
    orderBy: { createdAt: 'desc' },
    include: { changedBy: { select: { id: true, fullName: true, role: true } } },
  });

  res.json({ success: true, history });
};

export const updateRescueLocation = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const { rescueLocationText, rescueLatitude, rescueLongitude } = req.body;

  if (!rescueLocationText && (!rescueLatitude || !rescueLongitude)) {
    return res.status(400).json({ success: false, error: 'Se requiere texto de ubicación o coordenadas.' });
  }

  const animal = await prisma.animal.findUnique({ where: { id } });
  if (!animal) return res.status(404).json({ success: false, error: 'Animal no encontrado' });

  const updated = await prisma.animal.update({
    where: { id },
    data: { rescueLocationText, rescueLatitude, rescueLongitude },
  });

  res.json({ success: true, animal: updated });
};

export const regenerateQR = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const animal = await prisma.animal.findUnique({ where: { id } });
  if (!animal) return res.status(404).json({ success: false, error: 'Animal no encontrado' });

  try {
    const qrUrl = await generatePetQrDataUrl(id);
    const updated = await prisma.animal.update({ where: { id }, data: { qrUrl } });

    await writeAuditLog({
      userId: req.user!.id,
      action: 'REGENERATE_QR',
      entityType: 'Animal',
      entityId: id,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, qrUrl, animal: updated });
  } catch {
    res.status(500).json({ success: false, error: 'Error al generar el código QR' });
  }
};

export const downloadQR = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const animal = await prisma.animal.findUnique({ where: { id }, select: { qrUrl: true, name: true } });

  if (!animal) return res.status(404).json({ success: false, error: 'Animal no encontrado' });
  if (!animal.qrUrl) return res.status(404).json({ success: false, error: 'QR no disponible, regenerelo primero.' });

  res.json({ success: true, qrUrl: animal.qrUrl, fileName: `qr-${id}.png` });
};
