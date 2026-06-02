import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const FROM = process.env.SMTP_FROM || 'Rescue Pet <noreply@rescuepet.com>';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const isEmailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

export const sendActivationEmail = async (email: string, token: string): Promise<void> => {
  const url = `${FRONTEND_URL}/activate?token=${token}`;
  if (!isEmailConfigured()) {
    logger.info('Email not configured — printing activation link', { email, url });
    return;
  }
  try {
    await createTransporter().sendMail({
      from: FROM,
      to: email,
      subject: 'Activa tu cuenta en Rescue Pet',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#16a34a">Bienvenido a Rescue Pet</h2>
          <p>Haz clic en el siguiente enlace para activar tu cuenta. Este enlace expira en 24 horas.</p>
          <a href="${url}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:white;border-radius:6px;text-decoration:none">Activar cuenta</a>
          <p style="color:#666;font-size:12px;margin-top:24px">Si no te registraste en Rescue Pet, ignora este correo.</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error('SMTP: Failed to send activation email', { email, error: (err as Error).message });
    throw err;
  }
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  const url = `${FRONTEND_URL}/reset-password?token=${token}`;
  if (!isEmailConfigured()) {
    logger.info('Email not configured — printing password reset link', { email, url });
    return;
  }
  try {
    await createTransporter().sendMail({
      from: FROM,
      to: email,
      subject: 'Restablecer contraseña — Rescue Pet',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#16a34a">Restablecer contraseña</h2>
          <p>Haz clic en el siguiente enlace para restablecer tu contraseña. Este enlace expira en 1 hora.</p>
          <a href="${url}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:white;border-radius:6px;text-decoration:none">Restablecer contraseña</a>
          <p style="color:#666;font-size:12px;margin-top:24px">Si no solicitaste esto, ignora este correo.</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error('SMTP: Failed to send password reset email', { email, error: (err as Error).message });
    throw err;
  }
};

export const sendInternalUserCredentials = async (email: string, tempPassword: string): Promise<void> => {
  if (!isEmailConfigured()) {
    logger.info('Email not configured — printing internal user credentials', { email, tempPassword });
    return;
  }
  try {
    await createTransporter().sendMail({
      from: FROM,
      to: email,
      subject: 'Credenciales de acceso — Rescue Pet',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#16a34a">Bienvenido al equipo de Rescue Pet</h2>
          <p>Tu cuenta ha sido creada. Estas son tus credenciales de acceso:</p>
          <p><strong>Correo:</strong> ${email}</p>
          <p><strong>Contraseña temporal:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${tempPassword}</code></p>
          <p>Por seguridad, cambia tu contraseña al iniciar sesión por primera vez.</p>
          <a href="${FRONTEND_URL}/login" style="display:inline-block;padding:12px 24px;background:#16a34a;color:white;border-radius:6px;text-decoration:none">Iniciar sesión</a>
        </div>
      `,
    });
  } catch (err) {
    logger.error('SMTP: Failed to send internal user credentials email', { email, error: (err as Error).message });
    throw err;
  }
};
