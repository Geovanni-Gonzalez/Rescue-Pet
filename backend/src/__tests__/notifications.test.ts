import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

jest.mock('../utils/db', () => ({
  __esModule: true,
  default: {
    notification: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    user: { findMany: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dbMock = require('../utils/db').default;

const token = jwt.sign({ id: 'user-1', email: 'test@test.com', role: 'ADOPTER' }, 'test-secret-123');
const adminToken = jwt.sign({ id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' }, 'test-secret-123');

beforeEach(() => jest.clearAllMocks());

describe('GET /api/notifications', () => {
  it('retorna notificaciones paginadas del usuario autenticado', async () => {
    const notifs = [{ id: 'n1', userId: 'user-1', title: 'Test', message: 'Msg', type: 'INFO', readAt: null, createdAt: new Date() }];
    dbMock.notification.findMany.mockResolvedValue(notifs);
    dbMock.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.unreadCount).toBe(1);
    expect(res.body.page).toBe(1);
  });

  it('filtra solo no leídas cuando unread=true', async () => {
    dbMock.notification.findMany.mockResolvedValue([]);
    dbMock.notification.count.mockResolvedValue(0);

    await request(app).get('/api/notifications?unread=true').set('Authorization', `Bearer ${token}`);

    expect(dbMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ readAt: null }) })
    );
  });

  it('retorna 401 sin token', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/notifications/unread-count', () => {
  it('retorna el conteo de no leídas', async () => {
    dbMock.notification.count.mockResolvedValue(5);

    const res = await request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.unreadCount).toBe(5);
  });
});

describe('PATCH /api/notifications/:id/read', () => {
  it('marca una notificación como leída', async () => {
    const notif = { id: 'n1', userId: 'user-1', readAt: null };
    dbMock.notification.findUnique.mockResolvedValue(notif);
    dbMock.notification.update.mockResolvedValue({ ...notif, readAt: new Date() });

    const res = await request(app).patch('/api/notifications/n1/read').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('retorna 404 si la notificación no pertenece al usuario', async () => {
    dbMock.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'other-user' });

    const res = await request(app).patch('/api/notifications/n1/read').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('es idempotente si ya fue leída', async () => {
    const notif = { id: 'n1', userId: 'user-1', readAt: new Date() };
    dbMock.notification.findUnique.mockResolvedValue(notif);

    const res = await request(app).patch('/api/notifications/n1/read').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(dbMock.notification.update).not.toHaveBeenCalled();
  });
});

describe('POST /api/notifications/read-all', () => {
  it('marca todas como leídas', async () => {
    dbMock.notification.updateMany.mockResolvedValue({ count: 3 });

    const res = await request(app).post('/api/notifications/read-all').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/notifications/:id', () => {
  it('elimina una notificación propia', async () => {
    dbMock.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'user-1' });
    dbMock.notification.delete.mockResolvedValue({});

    const res = await request(app).delete('/api/notifications/n1').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('retorna 404 si no pertenece al usuario', async () => {
    dbMock.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'other' });

    const res = await request(app).delete('/api/notifications/n1').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
