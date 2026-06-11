import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import db from '../utils/db';
import { z } from 'zod';
import { writeAuditLog, getClientIp } from '../services/auditService';
import { sendInternalUserCredentials } from '../services/emailService';
import { getPasswordPolicyViolations } from '../utils/passwordPolicy';
import { logger } from '../utils/logger';

const INTERNAL_ROLES = ['VETERINARIAN', 'VOLUNTEER'] as const;
const ALL_ROLES = ['ADMIN', 'VETERINARIAN', 'VOLUNTEER', 'ADOPTER'] as const;
const ALL_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING_VERIFICATION'] as const;

const EMAIL_IN_USE_MSG = 'El correo electrónico ya está en uso por otra cuenta.';
const DB_SAVE_ERROR_MSG = 'No se pudieron guardar los cambios. Inténtalo de nuevo más tarde.';

const createUserSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(INTERNAL_ROLES),
  phone: z.string().trim().optional(),
});

// CU-10 flujo normal: nombre, correo y teléfono son obligatorios — si se envían,
// no pueden quedar vacíos y el correo debe tener formato válido.
const updateMeSchema = z.object({
  fullName: z.string().trim().min(2, 'El nombre completo es obligatorio.').optional(),
  email: z.string().trim().toLowerCase().email('El correo electrónico no tiene un formato válido.').optional(),
  phone: z.string().trim().min(7, 'El teléfono debe tener al menos 7 dígitos.').optional(),
});

const updateUserAdminSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().min(7).optional(),
  role: z.enum(ALL_ROLES).optional(),
  status: z.enum(ALL_STATUSES).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  photoUrl: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

/** Devuelve el usuario dueño de `email` si pertenece a una cuenta distinta de `excludeId`. */
async function findEmailConflict(email: string, excludeId: string) {
  const owner = await db.user.findUnique({ where: { email } });
  return owner && owner.id !== excludeId ? owner : null;
}

export const getUsers = async (req: Request, res: Response) => {
  const users = await db.user.findMany({ select: USER_SELECT, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, users });
};

export const getUserById = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  const user = await db.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

  res.json({ success: true, user });
};

// CU-10 3B: solo el Administrador crea perfiles internos (Veterinario, Voluntario)
// con credenciales temporales notificadas por correo.
export const createUser = async (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const { fullName, email, role, phone } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ success: false, error: EMAIL_IN_USE_MSG });
  }

  const tempPassword = crypto.randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const newUser = await db.user.create({
    data: { fullName, email, passwordHash, phone, role, status: 'ACTIVE' },
    select: USER_SELECT,
  });

  sendInternalUserCredentials(email, tempPassword).catch((err) =>
    logger.error('Failed to send internal user credentials', { error: (err as Error).message })
  );

  await writeAuditLog({
    userId: req.user!.id,
    action: 'CREATE_USER',
    entityType: 'User',
    entityId: newUser.id,
    metadata: { role },
    ipAddress: getClientIp(req),
  });

  res.status(201).json({ success: true, user: newUser });
};

// CU-10 flujo normal: todo usuario autenticado actualiza su propia información de contacto.
export const updateMe = async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  // CU-10 3E: el campo de rol (y el estado) no son editables vía autogestión.
  // Si la petición llega al servidor con esos campos, se rechaza con error de
  // autorización y el intento queda registrado en el log de auditoría.
  const forbiddenFields = ['role', 'status'].filter((field) => field in body);
  if (forbiddenFields.length > 0) {
    logger.warn('Intento de modificar campos restringidos en el perfil propio', {
      userId: req.user!.id,
      role: req.user!.role,
      fields: forbiddenFields,
    });
    await writeAuditLog({
      userId: req.user!.id,
      action: 'SELF_ROLE_CHANGE_DENIED',
      entityType: 'User',
      entityId: req.user!.id,
      metadata: {
        attemptedFields: forbiddenFields,
        attemptedValues: Object.fromEntries(forbiddenFields.map((f) => [f, body[f]])),
      },
      ipAddress: getClientIp(req),
    }).catch((err) =>
      logger.error('Failed to write audit log for denied self role change', { error: (err as Error).message })
    );
    return res
      .status(403)
      .json({ success: false, error: 'No tienes permisos para modificar el rol o estado de tu cuenta.' });
  }

  const parsed = updateMeSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const data = parsed.data;

  // CU-10 4E: el correo no puede pertenecer a otra cuenta.
  if (data.email) {
    const conflict = await findEmailConflict(data.email, req.user!.id);
    if (conflict) {
      return res.status(400).json({ success: false, error: EMAIL_IN_USE_MSG });
    }
  }

  try {
    const updated = await db.user.update({
      where: { id: req.user!.id },
      data,
      select: USER_SELECT,
    });

    await writeAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_PROFILE',
      entityType: 'User',
      entityId: req.user!.id,
      metadata: { fields: Object.keys(data) },
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, user: updated, message: 'Perfil actualizado correctamente.' });
  } catch (err) {
    // CU-10 6E: si la BD no responde, error genérico y los datos previos quedan intactos.
    logger.error('Failed to persist profile update', { userId: req.user!.id, error: (err as Error).message });
    res.status(500).json({ success: false, error: DB_SAVE_ERROR_MSG });
  }
};

// CU-10: únicamente el Administrador modifica otros perfiles y asigna roles.
export const updateUserAdmin = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  const parsed = updateUserAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const data = parsed.data;

  const target = await db.user.findUnique({ where: { id } });
  if (!target) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
  }

  // Salvaguardas sobre la propia cuenta del administrador: evitar quedarse sin
  // acceso por quitarse el rol ADMIN o desactivarse a sí mismo.
  if (id === req.user!.id) {
    if (data.role && data.role !== target.role) {
      return res.status(400).json({ success: false, error: 'No puedes cambiar tu propio rol.' });
    }
    if (data.status && data.status !== 'ACTIVE' && data.status !== target.status) {
      return res.status(400).json({ success: false, error: 'No puedes desactivar tu propia cuenta.' });
    }
  }

  // CU-10 4E: el correo no puede pertenecer a otra cuenta.
  if (data.email && data.email !== target.email) {
    const conflict = await findEmailConflict(data.email, id);
    if (conflict) {
      return res.status(400).json({ success: false, error: EMAIL_IN_USE_MSG });
    }
  }

  const roleChanged = Boolean(data.role && data.role !== target.role);

  try {
    const updated = await db.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    await writeAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      metadata: data as Record<string, unknown>,
      ipAddress: getClientIp(req),
    });

    if (roleChanged) {
      await writeAuditLog({
        userId: req.user!.id,
        action: 'CHANGE_ROLE',
        entityType: 'User',
        entityId: id,
        metadata: { from: target.role, to: data.role },
        ipAddress: getClientIp(req),
      });
    }

    res.json({ success: true, user: updated, message: 'Usuario actualizado correctamente.' });
  } catch (err) {
    // CU-10 6E: error genérico sin aplicar cambios parciales.
    logger.error('Failed to persist admin user update', { targetId: id, error: (err as Error).message });
    res.status(500).json({ success: false, error: DB_SAVE_ERROR_MSG });
  }
};

// CU-10 3A: cambio de contraseña con política de seguridad e invalidación de
// todas las sesiones activas previas.
export const changePassword = async (req: Request, res: Response) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const { currentPassword, newPassword } = parsed.data;

  // CU-10 4E2: detalle de los requisitos no cumplidos.
  const violations = getPasswordPolicyViolations(newPassword);
  if (violations.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'La nueva contraseña no cumple los requisitos de seguridad.',
      details: violations,
    });
  }

  const user = await db.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return res.status(400).json({ success: false, error: 'Contraseña actual incorrecta.' });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({ success: false, error: 'La nueva contraseña debe ser diferente a la actual.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  try {
    // passwordChangedAt invalida todos los tokens emitidos antes de este momento
    // (verificado en authenticateToken), cerrando las sesiones activas previas.
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
  } catch (err) {
    logger.error('Failed to persist password change', { userId: user.id, error: (err as Error).message });
    return res.status(500).json({ success: false, error: DB_SAVE_ERROR_MSG });
  }

  await writeAuditLog({
    userId: user.id,
    action: 'CHANGE_PASSWORD',
    entityType: 'User',
    entityId: user.id,
    ipAddress: getClientIp(req),
  });

  res.json({
    success: true,
    message: 'Contraseña actualizada correctamente. Por seguridad, vuelve a iniciar sesión.',
  });
};

// CU-10 3C: baja lógica — el perfil queda inactivo pero sus datos se conservan.
export const deactivateUser = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;

  if (id === req.user!.id) {
    return res.status(400).json({ success: false, error: 'No puedes desactivar tu propia cuenta.' });
  }

  try {
    const updated = await db.user.update({
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
