import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { PetStatus } from '@prisma/client';
import qrcode from 'qrcode';

// Esquemas de validación
const petCreateSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  estimatedAge: z.number().int().nonnegative().optional(),
  size: z.string().optional(),
  mainPhotoUrl: z.string().optional(),
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
  } else {
    if (req.query['status']) {
      query['status'] = req.query['status'] as string;
    }
  }

  const pets = await prisma.pet.findMany({
    where: query as any,
    orderBy: { createdAt: 'desc' }
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
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'CREATE_PET',
      entity: 'Pet',
      entityId: newPet.id,
    }
  });

  res.status(201).json({ success: true, pet: newPet });
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
    data: parsed.data
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'UPDATE_PET',
      entity: 'Pet',
      entityId: id,
      details: JSON.stringify(parsed.data),
    }
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

  const isTerminal = (s: PetStatus) => ['ADOPTED', 'DECEASED'].includes(s);

  if (isTerminal(currentStatus)) {
    return res.status(400).json({ success: false, error: `No se puede cambiar el estado de una mascota ${currentStatus}` });
  }

  let isValidTransition = false;

  if (currentStatus === 'QUARANTINE' && ['AVAILABLE', 'TREATMENT'].includes(newStatus)) {
    isValidTransition = true;
  } else if (currentStatus === 'AVAILABLE' && ['TREATMENT', 'ADOPTED'].includes(newStatus)) {
    isValidTransition = true;
  } else if (currentStatus === 'TREATMENT' && ['AVAILABLE', 'DECEASED'].includes(newStatus)) {
    isValidTransition = true;
  }

  if (!isValidTransition) {
    return res.status(400).json({ success: false, error: `Transición inválida de ${currentStatus} a ${newStatus}` });
  }

  const updatedPet = await prisma.pet.update({
    where: { id },
    data: { status: newStatus }
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'UPDATE_PET_STATUS',
      entity: 'Pet',
      entityId: id,
      details: `Cambio de ${currentStatus} a ${newStatus}`,
    }
  });

  res.json({ success: true, pet: updatedPet });
};

export const generatePetQR = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const pet = await prisma.pet.findUnique({ where: { id } });
  if (!pet) {
    return res.status(404).json({ success: false, error: 'Mascota no encontrada' });
  }

  const profileUrl = `http://localhost:5173/pets/${id}`;

  try {
    const qrDataUrl = await qrcode.toDataURL(profileUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#14532d', light: '#ffffff' }
    });

    const updatedPet = await prisma.pet.update({
      where: { id },
      data: { qrCodeUrl: qrDataUrl }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'GENERATE_PET_QR',
        entity: 'Pet',
        entityId: id,
      }
    });

    res.json({ success: true, qrCodeUrl: qrDataUrl, pet: updatedPet });
  } catch (_err) {
    res.status(500).json({ success: false, error: 'Error al generar el código QR' });
  }
};
