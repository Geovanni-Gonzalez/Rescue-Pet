import db from '../utils/db';
import { notifyByRole } from './notificationService';
import { logger } from '../utils/logger';

const ALERT_WINDOW_HOURS = 72;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function checkUpcomingVaccines() {
  try {
    const now = new Date();
    const alertWindow = new Date(now.getTime() + ALERT_WINDOW_HOURS * 60 * 60 * 1000);

    const upcoming = await db.vaccine.findMany({
      where: {
        status: 'PENDING',
        nextDueAt: { lte: alertWindow, gte: now },
      },
      include: {
        animal: { select: { id: true, name: true, species: true } },
      },
    });

    if (upcoming.length === 0) return;

    const alreadyNotified = await db.notification.findMany({
      where: {
        resourceType: 'Vaccine',
        resourceId: { in: upcoming.map((v) => v.id) },
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      select: { resourceId: true },
    });

    const notifiedIds = new Set(alreadyNotified.map((n) => n.resourceId));
    const toNotify = upcoming.filter((v) => !notifiedIds.has(v.id));

    for (const vaccine of toNotify) {
      const hoursUntilDue = Math.round(
        (new Date(vaccine.nextDueAt!).getTime() - now.getTime()) / (60 * 60 * 1000),
      );

      await notifyByRole('VETERINARIAN', {
        title: 'Vacuna próxima a vencer',
        message: `${vaccine.vaccineType} para ${vaccine.animal.name} (${vaccine.animal.species}) vence en ${hoursUntilDue}h.`,
        type: 'WARNING',
        resourceType: 'Vaccine',
        resourceId: vaccine.id,
      });

      logger.info('Immunization alert sent', {
        vaccineId: vaccine.id,
        animalId: vaccine.animalId,
        hoursUntilDue,
      });
    }

    if (toNotify.length > 0) {
      logger.info(`Immunization check: ${toNotify.length} new alerts sent, ${notifiedIds.size} already notified`);
    }
  } catch (err) {
    logger.error('Immunization scheduler error', { error: (err as Error).message });
  }
}

async function checkOverdueVaccines() {
  try {
    const now = new Date();

    const overdue = await db.vaccine.findMany({
      where: {
        status: 'PENDING',
        nextDueAt: { lt: now },
      },
      include: {
        animal: { select: { id: true, name: true, species: true } },
      },
    });

    if (overdue.length === 0) return;

    const alreadyNotified = await db.notification.findMany({
      where: {
        resourceType: 'VaccineOverdue',
        resourceId: { in: overdue.map((v) => v.id) },
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      select: { resourceId: true },
    });

    const notifiedIds = new Set(alreadyNotified.map((n) => n.resourceId));
    const toNotify = overdue.filter((v) => !notifiedIds.has(v.id));

    for (const vaccine of toNotify) {
      await notifyByRole('VETERINARIAN', {
        title: 'Vacuna vencida',
        message: `${vaccine.vaccineType} para ${vaccine.animal.name} está vencida desde ${new Date(vaccine.nextDueAt!).toLocaleDateString('es-CR')}.`,
        type: 'ERROR',
        resourceType: 'VaccineOverdue',
        resourceId: vaccine.id,
      });
    }
  } catch (err) {
    logger.error('Overdue vaccine check error', { error: (err as Error).message });
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startImmunizationScheduler() {
  checkUpcomingVaccines();
  checkOverdueVaccines();

  intervalId = setInterval(() => {
    checkUpcomingVaccines();
    checkOverdueVaccines();
  }, CHECK_INTERVAL_MS);

  logger.info(`Immunization scheduler started (interval: ${CHECK_INTERVAL_MS / 1000}s)`);
}

export function stopImmunizationScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Immunization scheduler stopped');
  }
}
