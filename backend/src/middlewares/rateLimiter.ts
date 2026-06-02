import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';
const skip = isTest ? () => true : undefined;

/** Strict limiter for auth endpoints (login, register, forgot-password) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
});

/** General API limiter */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
});

/** Upload limiter */
export const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, error: 'Demasiadas cargas de archivos. Intenta de nuevo en un momento.' },
});
