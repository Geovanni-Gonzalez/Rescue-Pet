import prisma from '../utils/prisma';

interface NotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
}

export async function notifyUser({ userId, title, message, type = 'INFO', link }: NotificationInput) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link,
    },
  });
}

export async function notifyActiveAdmins(input: Omit<NotificationInput, 'userId'>) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  });

  return Promise.all(admins.map((admin) => notifyUser({ ...input, userId: admin.id })));
}
