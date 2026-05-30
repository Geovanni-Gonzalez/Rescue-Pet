import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { writeAuditLog, getClientIp } from '../services/auditService';
import { sendInternalUserCredentials } from '../services/emailService';

const INTERNAL_ROLES = ['VETERINARIAN', 'VOLUNTEER'] as const;
const ALL_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING_VERIFICATION'] as const;

const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(INTERNAL_ROLES),
  phone: z.string().optional(),
});

const updateMeSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
});

const updateUserAdminSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'VETERINARIAN', 'VOLUNTEER', 'ADOPTER'] as const).optional(),
  status: z.enum(ALL_STATUSES).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

export const getUsers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({ select: USER_SELECT, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, users });
};

export const getUserById = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

  res.json({ success: true, user });
};

export const createUser = async (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const { fullName, email, role, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ success: false, error: 'Ya existe un usuario con ese correo.' });
  }

  const tempPassword = crypto.randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const newUser = await prisma.user.create({
    data: { fullName, email, passwordHash, phone, role, status: 'ACTIVE' },
    select: USER_SELECT,
  });

  sendInternalUserCredentials(email, tempPassword).catch((err) =>
    console.error('[EMAIL] Failed to send credentials:', err)
  );

  await writeAuditLog({
    userId: req.user!.id,
    action: 'CREATE_USER',
    entityType: 'User',
    entityId: newUser.id,
    ipAddress: getClientIp(req),
  });

  res.status(201).json({ success: true, user: newUser });
};

export const updateMe = async (req: Request, res: Response) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: parsed.data,
    select: USER_SELECT,
  });

  res.json({ success: true, user: updated });
};

export const updateUserAdmin = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const parsed = updateUserAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: USER_SELECT,
    });

    await writeAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      metadata: parsed.data as Record<string, unknown>,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, user: updated });
  } catch {
    res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return res.status(400).json({ success: false, error: 'Contraseña actual incorrecta.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await writeAuditLog({
    userId: user.id,
    action: 'CHANGE_PASSWORD',
    entityType: 'User',
    entityId: user.id,
    ipAddress: getClientIp(req),
  });

  res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
};

export const deactivateUser = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  if (id === req.user!.id) {
    return res.status(400).json({ success: false, error: 'No puedes desactivar tu propia cuenta.' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: USER_SELECT,
    });

    await writeAuditLog({
      userId: req.user!.id,
      action: 'DEACTIVATE_USER',
      entityType: 'User',
      entityId: id,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, user: updated });
  } catch {
    res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
  }
};
