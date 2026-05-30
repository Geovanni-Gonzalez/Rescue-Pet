import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getNotifications = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const unreadOnly = req.query['unread'] === 'true';

  const notifications = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({ where: { userId, readAt: null } });

  res.json({ success: true, notifications, unreadCount });
};

export const markAsRead = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const userId = req.user!.id;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    return res.status(404).json({ success: false, error: 'Notificación no encontrada' });
  }

  const updated = await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  res.json({ success: true, notification: updated });
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  res.json({ success: true });
};
