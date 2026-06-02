import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import type { AnimalStatus } from '../types/enums';
import { writeAuditLog, getClientIp } from '../services/auditService';
import { generatePetQrDataUrl } from '../services/qrService';
import { logger } from '../utils/logger';
import { buildUploadUrl, cleanupUpload } from '../middlewares/upload';
import {
  ACTIVE_ADOPTION_STATUSES,
  canTransitionAnimalStatus,
  getAllowedAnimalTransitions,
  isTerminalAnimalStatus,
} from '../domain/animalRules';

const ANIMAL_STATUSES = ['QUARANTINE', 'AVAILABLE', 'TREATMENT', 'ADOPTED', 'DECEASED'] as const;

// Schema for JSON body (edit without file)
const animalBodySchema = z.object({
  name: z.string().min(1).optional(),
  species: z.string().min(1).optional(),
  estimatedBreed: z.string().optional(),
  estimatedAge: z.coerce.number().int().nonnegative().optional(),
  size: z.string().optional(),
  mainPhotoUrl: z.string().url().optional(),
  rescueLocationText: z.string().optional(),
  rescueLatitude: z.coerce.number().optional(),
  rescueLongitude: z.coerce.number().optional(),
  energyLevel: z.string().optional(),
  spaceNeed: z.string().optional(),
  goodWithChildren: z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]).optional(),
  goodWithPets: z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]).optional(),
});

const animalCreateRequiredSchema = animalBodySchema.extend({
  name: z.string().min(1),
  species: z.string().min(1),
});

const animalStatusSchema = z.object({
  status: z.enum(ANIMAL_STATUSES),
  reason: z.string().optional(),
});

const rescueLocationSchema = z.object({
  rescueLocationText: z.string().optional(),
  rescueLatitude: z.coerce.number().optional(),
  rescueLongitude: z.coerce.number().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAnimalPayload(
  req: Request,
  mainPhotoUrl?: string,
): Record<string, unknown> {
  const body = req.body as Record<string, string | boolean | number | undefined>;
  return {
    name: body['name'],
    species: body['species'],
    estimatedBreed: body['estimatedBreed'] || undefined,
    estimatedAge: body['estimatedAge'] ? Number(body['estimatedAge']) : undefined,
    size: body['size'] || undefined,
    mainPhotoUrl: mainPhotoUrl ?? (body['mainPhotoUrl'] as string | undefined),
    rescueLocationText: body['rescueLocationText'] || undefined,
    rescueLatitude: body['rescueLatitude'] ? Number(body['rescueLatitude']) : undefined,
    rescueLongitude: body['rescueLongitude'] ? Number(body['rescueLongitude']) : undefined,
    energyLevel: body['energyLevel'] || undefined,
    spaceNeed: body['spaceNeed'] || undefined,
    goodWithChildren: body['goodWithChildren'] === 'true' || body['goodWithChildren'] === true,
    goodWithPets: body['goodWithPets'] === 'true' || body['goodWithPets'] === true,
  };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export const getAnimals = async (req: Request, res: Response) => {
  const role = req.user!.role;
  const where: Record<string, unknown> = {};

  if (role === 'ADOPTER') {
    where['status'] = 'AVAILABLE';
  } else if (req.query['status']) {
    where['status'] = req.query['status'];
  }

  const animals = await prisma.animal.findMany({
    where: where as never,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { gallery: true } } },
  });

  res.json({ success: true, animals });
};

export const getAnimalById = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const role = req.user!.role;

  const animal = await prisma.animal.findUnique({
    where: { id },
    include: { gallery: { orderBy: { createdAt: 'asc' } } },
  });

  if (!animal) return res.status(404).json({ success: false, error: 'Animal no encontrado' });

  if (role === 'ADOPTER' && animal.status !== 'AVAILABLE') {
    return res.status(403).json({ success: false, error: 'Este animal no está disponible para adopción.' });
  }

  res.json({ success: true, animal });
};

export const createAnimal = async (req: Request, res: Response) => {
  let mainPhotoUrl: string | undefined;

  if (req.file) {
    mainPhotoUrl = buildUploadUrl('animals', req.file.filename);
  }

  const payload = buildAnimalPayload(req, mainPhotoUrl);
  const parsed = animalCreateRequiredSchema.safeParse(payload);

  if (!parsed.success) {
    if (req.file) cleanupUpload(req.file.path);
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  if (!parsed.data.mainPhotoUrl) {
    if (req.file) cleanupUpload(req.file.path);
    return res.status(400).json({ success: false, error: 'La fotografía principal es obligatoria.' });
  }

  const newAnimal = await prisma.animal.create({
    data: {
      ...parsed.data,
      status: 'QUARANTINE',
      createdByUserId: req.user!.id,
    },
  });

  const publicProfileUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/pets/${newAnimal.id}`;
  let qrUrl: string | null = null;

  try {
    qrUrl = await generatePetQrDataUrl(newAnimal.id);
  } catch (err) {
    logger.error('QR generation failed', { animalId: newAnimal.id, error: (err as Error).message });
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

  const animal = await prisma.animal.findUnique({ where: { id } });
  if (!animal) {
    if (req.file) cleanupUpload(req.file.path);
    return res.status(404).json({ success: false, error: 'Animal no encontrado' });
  }

  let mainPhotoUrl: string | undefined;
  if (req.file) {
    mainPhotoUrl = buildUploadUrl('animals', req.file.filename);
  }

  const payload = buildAnimalPayload(req, mainPhotoUrl);
  // Remove undefined values so partial update works
  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined),
  );

  const parsed = animalBodySchema.safeParse(cleaned);
  if (!parsed.success) {
    if (req.file) cleanupUpload(req.file.path);
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const updated = await prisma.animal.update({ where: { id }, data: parsed.data });

  await writeAuditLog({
    userId: req.user!.id,
    action: 'UPDATE_ANIMAL',
    entityType: 'Animal',
    entityId: id,
    metadata: cleaned as Record<string, unknown>,
    ipAddress: getClientIp(req),
  });

  res.json({ success: true, animal: updated });
};

export const updateAnimalStatus = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const parsed = animalStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Estado inválido' });

  const { status: newStatus, reason } = parsed.data;
  const animal = await prisma.animal.findUnique({ where: { id } });

  if (!animal) return res.status(404).json({ success: false, error: 'Animal no encontrado' });

  const currentStatus = animal.status as AnimalStatus;

  if (isTerminalAnimalStatus(currentStatus)) {
    return res.status(400).json({
      success: false,
      error: `No se puede cambiar el estado de un animal en estado ${currentStatus}`,
    });
  }

  if (!canTransitionAnimalStatus(currentStatus, newStatus)) {
    return res.status(400).json({
      success: false,
      error: `Transición inválida: ${currentStatus} → ${newStatus}. Permitidas: ${getAllowedAnimalTransitions(currentStatus).join(', ')}`,
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

  const parsed = rescueLocationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const { rescueLocationText, rescueLatitude, rescueLongitude } = parsed.data;

  if (!rescueLocationText && (rescueLatitude === undefined || rescueLongitude === undefined)) {
    return res.status(400).json({ success: false, error: 'Se requiere texto de ubicación o coordenadas completas.' });
  }

  const animal = await prisma.animal.findUnique({ where: { id } });
  if (!animal) return res.status(404).json({ success: false, error: 'Animal no encontrado' });

  // Archive current location before overwriting
  if (animal.rescueLocationText || animal.rescueLatitude !== null) {
    await prisma.animalRescueLocationHistory.create({
      data: {
        animalId: id,
        locationText: animal.rescueLocationText,
        latitude: animal.rescueLatitude,
        longitude: animal.rescueLongitude,
        changedByUserId: req.user!.id,
      },
    });
  }

  const updated = await prisma.animal.update({
    where: { id },
    data: { rescueLocationText, rescueLatitude, rescueLongitude },
  });

  res.json({ success: true, animal: updated });
};

export const getLocationHistory = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const history = await prisma.animalRescueLocationHistory.findMany({
    where: { animalId: id },
    orderBy: { createdAt: 'desc' },
    include: { changedBy: { select: { id: true, fullName: true } } },
  });

  res.json({ success: true, history });
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
    res.status(500).json({ success: false, error: 'Error al generar el código QR. Se reintentará automáticamente.' });
  }
};

export const downloadQR = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const animal = await prisma.animal.findUnique({ where: { id }, select: { qrUrl: true, name: true } });

  if (!animal) return res.status(404).json({ success: false, error: 'Animal no encontrado' });
  if (!animal.qrUrl) return res.status(404).json({ success: false, error: 'QR no disponible. Regeneralo primero.' });

  res.json({ success: true, qrUrl: animal.qrUrl, fileName: `qr-${animal.name?.replace(/\s+/g, '-').toLowerCase()}.png` });
};
