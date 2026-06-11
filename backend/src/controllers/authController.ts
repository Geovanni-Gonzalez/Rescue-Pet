import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../utils/db';
import { z } from 'zod';
import { writeAuditLog, getClientIp } from '../services/auditService';
import { sendActivationEmail, sendPasswordResetEmail } from '../services/emailService';
import { getPasswordPolicyViolations } from '../utils/passwordPolicy';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';
const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MIN = 15;
const ACTIVATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  password: z.string(),
  phone: z.string().optional(),
});

const emailSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string(),
});

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos' });
  }

  const { email, password } = parsed.data;
  const ip = getClientIp(req);
  const invalidMsg = 'Credenciales inválidas o cuenta inactiva';

  const user = await db.user.findUnique({ where: { email } });

  if (!user || user.status === 'INACTIVE') {
    return res.status(401).json({ success: false, error: invalidMsg });
  }

  if (user.status === 'PENDING_VERIFICATION') {
    return res.status(401).json({
      success: false,
      error: 'Cuenta pendiente de verificación. Revisa tu correo.',
      code: 'PENDING_VERIFICATION',
    });
  }

  if (user.status === 'BLOCKED' && user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(401).json({ success: false, error: 'Cuenta bloqueada temporalmente. Intenta más tarde.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const newCount = (user.failedLoginCount ?? 0) + 1;
    const shouldLock = newCount >= LOCK_THRESHOLD;

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: newCount,
        status: shouldLock ? 'BLOCKED' : user.status,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MIN * 60 * 1000) : null,
      },
    });

    return res.status(401).json({ success: false, error: invalidMsg });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      status: user.status === 'BLOCKED' ? 'ACTIVE' : user.status,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

  await writeAuditLog({
    userId: user.id,
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    ipAddress: ip,
  });

  res.json({
    success: true,
    token,
    user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
  });
};

export const logout = async (req: Request, res: Response) => {
  if (req.user) {
    await writeAuditLog({
      userId: req.user.id,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: req.user.id,
      ipAddress: getClientIp(req),
    });
  }
  res.json({ success: true });
};

export const getMe = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'No autenticado' });
  }

  const user = await db.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      photoUrl: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

  res.json({ success: true, user });
};

// CU-12: registro público de adoptantes con verificación por correo.
export const registerAdopter = async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const { fullName, email, password, phone } = parsed.data;

  // CU-12 paso 4 / 4.1E: la contraseña debe cumplir la política de seguridad.
  const violations = getPasswordPolicyViolations(password);
  if (violations.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'La contraseña no cumple los requisitos de seguridad.',
      details: violations,
    });
  }

  // CU-12 5E: correo ya registrado (activo o inactivo), sin revelar el estado de la cuenta.
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'Este correo electrónico ya está registrado.',
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const activationToken = crypto.randomBytes(32).toString('hex');
  const activationTokenExpiresAt = new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS);

  const newUser = await db.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      phone,
      role: 'ADOPTER',
      status: 'PENDING_VERIFICATION',
      activationToken,
      activationTokenExpiresAt,
    },
  });

  // CU-12 7E: si el envío falla, la cuenta queda pendiente y se notifica al actor
  // para que reintente desde la pantalla de inicio de sesión.
  let emailSent = true;
  try {
    await sendActivationEmail(email, activationToken);
  } catch (err) {
    emailSent = false;
    logger.error('Failed to send activation email', { error: (err as Error).message });
  }

  await writeAuditLog({
    userId: newUser.id,
    action: 'REGISTER',
    entityType: 'User',
    entityId: newUser.id,
    ipAddress: getClientIp(req),
  });

  res.status(201).json({
    success: true,
    emailSent,
    message: emailSent
      ? 'Cuenta creada. Revisa tu correo para activarla.'
      : 'Tu cuenta fue creada, pero no pudimos enviar el correo de activación. Intenta reenviarlo más tarde desde la pantalla de inicio de sesión.',
    ...(process.env.NODE_ENV !== 'production' && { activationToken }),
  });
};

export const activateAccount = async (req: Request, res: Response) => {
  const token = req.query['token'] as string;
  if (!token) return res.status(400).json({ success: false, error: 'Token requerido' });

  const user = await db.user.findUnique({ where: { activationToken: token } });

  if (!user) {
    await writeAuditLog({
      userId: 'unknown',
      action: 'INVALID_ACTIVATION_TOKEN',
      entityType: 'User',
      entityId: token,
      ipAddress: getClientIp(req),
    }).catch(() => {});
    return res.status(400).json({ success: false, error: 'Token inválido o expirado.' });
  }

  if (user.activationTokenExpiresAt && user.activationTokenExpiresAt < new Date()) {
    return res.status(400).json({
      success: false,
      error: 'El enlace de activación ha expirado. Solicita uno nuevo.',
      code: 'TOKEN_EXPIRED',
    });
  }

  // CU-12 paso 10: activa la cuenta y asigna automáticamente el rol "Adoptante".
  await db.user.update({
    where: { id: user.id },
    data: {
      status: 'ACTIVE',
      role: 'ADOPTER',
      emailVerifiedAt: new Date(),
      activationToken: null,
      activationTokenExpiresAt: null,
    },
  });

  res.json({ success: true, message: 'Cuenta activada correctamente. Ya puedes iniciar sesión.' });
};

export const resendActivation = async (req: Request, res: Response) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Email inválido' });

  const genericMsg = 'Si la cuenta existe y está pendiente de activación, recibirás un nuevo correo.';

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  if (!user || user.status !== 'PENDING_VERIFICATION') {
    return res.json({ success: true, message: genericMsg });
  }

  const activationToken = crypto.randomBytes(32).toString('hex');
  const activationTokenExpiresAt = new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS);

  await db.user.update({
    where: { id: user.id },
    data: { activationToken, activationTokenExpiresAt },
  });

  sendActivationEmail(user.email, activationToken).catch((err) =>
    logger.error('Failed to resend activation email', { error: (err as Error).message })
  );

  res.json({ success: true, message: genericMsg });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Email inválido' });

  const genericMsg = 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.';

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  if (!user || user.status === 'INACTIVE') {
    return res.json({ success: true, message: genericMsg });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiresAt } });

  sendPasswordResetEmail(user.email, resetToken).catch((err) =>
    logger.error('Failed to send password reset email', { error: (err as Error).message })
  );

  res.json({ success: true, message: genericMsg });
};

export const resetPassword = async (req: Request, res: Response) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Datos inválidos' });

  const { token, password } = parsed.data;

  // Misma política de seguridad que el registro y el cambio de contraseña.
  const violations = getPasswordPolicyViolations(password);
  if (violations.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'La contraseña no cumple los requisitos de seguridad.',
      details: violations,
    });
  }

  const user = await db.user.findUnique({ where: { resetToken: token } });

  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    return res.status(400).json({ success: false, error: 'Token inválido o expirado.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
      failedLoginCount: 0,
      status: 'ACTIVE',
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: 'RESET_PASSWORD',
    entityType: 'User',
    entityId: user.id,
    ipAddress: getClientIp(req),
  });

  res.json({ success: true, message: 'Contraseña restablecida. Ya puedes iniciar sesión.' });
};
