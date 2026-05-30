import nodemailer from 'nodemailer';

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
    console.info(`[EMAIL] Activation link for ${email}: ${url}`);
    return;
  }
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
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  const url = `${FRONTEND_URL}/reset-password?token=${token}`;
  if (!isEmailConfigured()) {
    console.info(`[EMAIL] Password reset link for ${email}: ${url}`);
    return;
  }
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
};

export const sendInternalUserCredentials = async (email: string, tempPassword: string): Promise<void> => {
  if (!isEmailConfigured()) {
    console.info(`[EMAIL] Internal user credentials for ${email}: tempPassword=${tempPassword}`);
    return;
  }
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
};
