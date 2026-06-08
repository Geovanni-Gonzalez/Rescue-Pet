import db from '../utils/db';

interface NotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: string;
  resourceType?: string;
  resourceId?: string;
}

export async function notifyUser({ userId, title, message, type = 'INFO', resourceType, resourceId }: NotificationInput) {
  return db.notification.create({
    data: { userId, title, message, type, resourceType, resourceId },
  });
}

export async function notifyActiveAdmins(input: Omit<NotificationInput, 'userId'>) {
  const admins = await db.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true },
  });
  return Promise.all(admins.map((admin) => notifyUser({ ...input, userId: admin.id })));
}

export async function notifyByRole(role: 'VETERINARIAN' | 'VOLUNTEER', input: Omit<NotificationInput, 'userId'>) {
  const users = await db.user.findMany({
    where: { role, status: 'ACTIVE' },
    select: { id: true },
  });
  return Promise.all(users.map((u) => notifyUser({ ...input, userId: u.id })));
}
