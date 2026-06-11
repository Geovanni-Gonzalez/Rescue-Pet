import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Mensajes en español para errores de multer (sus mensajes nativos están en inglés).
const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'El archivo supera el tamaño máximo permitido.',
  LIMIT_FILE_COUNT: 'Se excedió el número máximo de archivos.',
  LIMIT_UNEXPECTED_FILE: 'Campo de archivo no esperado.',
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled request error', {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    error: err?.message,
    stack: err?.stack,
  });

  // Errores de multer (carga de archivos)
  if (err?.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: MULTER_MESSAGES[err.code] || 'Error al procesar el archivo cargado.',
      details: null,
    });
  }

  // Cuerpo JSON malformado (body-parser)
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'El cuerpo de la solicitud no es JSON válido.',
      details: null,
    });
  }

  const statusCode = err.statusCode || 500;

  // Los errores 5xx no exponen detalles internos (suelen estar en inglés y
  // pueden filtrar información); los 4xx con statusCode explícito ya traen
  // mensajes en español definidos por la aplicación.
  const message = statusCode >= 500 ? 'Error interno del servidor.' : err.message || 'Solicitud inválida.';

  res.status(statusCode).json({
    success: false,
    error: message,
    details: err.details || null,
  });
};
