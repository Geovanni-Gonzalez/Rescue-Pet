import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

jest.mock('../utils/db', () => ({
  __esModule: true,
  default: {
    operationalTask: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    notification: { create: jest.fn().mockResolvedValue({}) },
    vaccine: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dbMock = require('../utils/db').default;

const adminToken = jwt.sign({ id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' }, 'test-secret-123');
const vetToken = jwt.sign({ id: 'vet-1', email: 'vet@test.com', role: 'VETERINARIAN' }, 'test-secret-123');
const volToken = jwt.sign({ id: 'vol-1', email: 'vol@test.com', role: 'VOLUNTEER' }, 'test-secret-123');

beforeEach(() => jest.clearAllMocks());

describe('GET /api/tasks', () => {
  it('retorna tareas filtradas por estado', async () => {
    dbMock.operationalTask.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/tasks?status=PENDING').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('filtra por rol del veterinario', async () => {
    dbMock.operationalTask.findMany.mockResolvedValue([]);

    await request(app).get('/api/tasks').set('Authorization', `Bearer ${vetToken}`);

    expect(dbMock.operationalTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ assignedRole: 'VETERINARIAN' }) })
    );
  });
});

describe('POST /api/tasks', () => {
  it('crea una tarea y envía notificaciones', async () => {
    const task = { id: 't1', type: 'HEALTH', assignedRole: 'VETERINARIAN', scheduledAt: new Date(), animal: { id: 'a1', name: 'Rex' } };
    dbMock.operationalTask.create.mockResolvedValue(task);
    dbMock.user.findMany.mockResolvedValue([{ id: 'vet-1' }]);

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'HEALTH', assignedRole: 'VETERINARIAN', scheduledAt: new Date().toISOString() });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(dbMock.auditLog.create).toHaveBeenCalled();
  });

  it('retorna 403 para voluntario', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${volToken}`)
      .send({ type: 'HEALTH', assignedRole: 'VETERINARIAN', scheduledAt: new Date().toISOString() });

    expect(res.status).toBe(403);
  });

  it('retorna 400 con datos inválidos', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'INVALID' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/tasks/:id/complete', () => {
  it('rechaza doble completación con 409', async () => {
    dbMock.operationalTask.findUnique.mockResolvedValue({ id: 't1', status: 'COMPLETED' });

    const res = await request(app)
      .post('/api/tasks/t1/complete')
      .set('Authorization', `Bearer ${vetToken}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.alreadyCompleted).toBe(true);
  });

  it('completa una tarea pendiente atómicamente', async () => {
    dbMock.operationalTask.findUnique.mockResolvedValue({ id: 't1', status: 'PENDING' });
    dbMock.auditLog.findFirst.mockResolvedValue(null);
    const updated = { id: 't1', status: 'COMPLETED', completedAt: new Date() };
    dbMock.$transaction.mockResolvedValue([updated, {}]);

    const res = await request(app)
      .post('/api/tasks/t1/complete')
      .set('Authorization', `Bearer ${vetToken}`)
      .send({ comment: 'Hecho' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('retorna resultado idempotente con X-Idempotency-Key repetido', async () => {
    dbMock.operationalTask.findUnique.mockResolvedValueOnce({ id: 't1', status: 'PENDING' });
    dbMock.auditLog.findFirst.mockResolvedValue({ id: 'existing' });
    dbMock.operationalTask.findUnique.mockResolvedValueOnce({ id: 't1', status: 'COMPLETED' });

    const res = await request(app)
      .post('/api/tasks/t1/complete')
      .set('Authorization', `Bearer ${vetToken}`)
      .set('X-Idempotency-Key', 'key-123')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
  });

  it('retorna 404 para tarea inexistente', async () => {
    dbMock.operationalTask.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/tasks/nonexistent/complete')
      .set('Authorization', `Bearer ${vetToken}`)
      .send({});

    expect(res.status).toBe(404);
  });
});

describe('GET /api/tasks/completions', () => {
  it('solo accesible para ADMIN', async () => {
    dbMock.auditLog.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/tasks/completions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const res2 = await request(app).get('/api/tasks/completions').set('Authorization', `Bearer ${volToken}`);
    expect(res2.status).toBe(403);
  });
});
