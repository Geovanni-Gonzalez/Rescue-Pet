type LogLevel = 'info' | 'warn' | 'error';

function format(level: LogLevel, message: string, meta?: unknown) {
  return JSON.stringify({
    level,
    message,
    meta,
    timestamp: new Date().toISOString(),
  });
}

export const logger = {
  info(message: string, meta?: unknown) {
    console.info(format('info', message, meta));
  },
  warn(message: string, meta?: unknown) {
    console.warn(format('warn', message, meta));
  },
  error(message: string, meta?: unknown) {
    console.error(format('error', message, meta));
  },
};
