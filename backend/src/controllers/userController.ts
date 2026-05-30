import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import type { Role } from '../types/enums';

const ROLES = ['ADMIN', 'VETERINARIAN', 'VOLUNTEER', 'ADOPTER'] as const;

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
});

export const getUsers = async (req: Request, res: Response) => {
  // Solo ADMIN llega aquí por el middleware authorizeRoles
  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });
  res.json({ success: true, users });
};

export const getUserById = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  // Validación: ADMIN o el propio usuario
  if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  if (!user) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  }

  res.json({ success: true, user });
};

export const updateUser = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  // Validación: ADMIN o el propio usuario
  if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const dataToUpdate = { ...parsed.data };

  // Solo ADMIN puede cambiar el rol o isActive
  if (req.user!.role !== 'ADMIN') {
    delete dataToUpdate.role;
    delete dataToUpdate.isActive;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: id,
        metadataJson: JSON.stringify(dataToUpdate),
      }
    });

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(404).json({ success: false, error: 'Usuario a actualizar no encontrado' });
  }
};
