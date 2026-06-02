import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getNotifications = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const unreadOnly = req.query['unread'] === 'true';
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const skip = (page - 1) * limit;

  const where = { userId, ...(unreadOnly ? { readAt: null } : {}) };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  res.json({ success: true, notifications, unreadCount, total, page, limit });
};

export const getUnreadCount = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const unreadCount = await prisma.notification.count({ where: { userId, readAt: null } });
  res.json({ success: true, unreadCount });
};

export const markAsRead = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const userId = req.user!.id;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
  }

  if (notification.readAt) {
    return res.json({ success: true, notification });
  }

  const updated = await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  res.json({ success: true, notification: updated });
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  res.json({ success: true });
};

export const deleteNotification = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const userId = req.user!.id;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
  }

  await prisma.notification.delete({ where: { id } });
  res.json({ success: true });
};
