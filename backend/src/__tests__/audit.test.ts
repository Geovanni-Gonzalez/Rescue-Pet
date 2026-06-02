import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
    },
    user: { findMany: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const prismaMock = require('../utils/prisma').default;

const adminToken = jwt.sign({ id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' }, 'test-secret-123');
const adopterToken = jwt.sign({ id: 'user-1', email: 'user@test.com', role: 'ADOPTER' }, 'test-secret-123');

beforeEach(() => jest.clearAllMocks());

describe('GET /api/audit', () => {
  it('retorna registros paginados para ADMIN', async () => {
    const logs = [{ id: 'a1', action: 'TEST', entityType: 'X', entityId: 'e1', createdAt: new Date(), user: { id: 'u1', fullName: 'Test', role: 'ADMIN', email: 'a@a.com' } }];
    prismaMock.auditLog.findMany.mockResolvedValue(logs);
    prismaMock.auditLog.count.mockResolvedValue(1);

    const res = await request(app).get('/api/audit').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('retorna 403 para no-ADMIN', async () => {
    const res = await request(app).get('/api/audit').set('Authorization', `Bearer ${adopterToken}`);
    expect(res.status).toBe(403);
  });

  it('filtra por acción', async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    prismaMock.auditLog.count.mockResolvedValue(0);

    await request(app).get('/api/audit?action=COMPLETE_TASK').set('Authorization', `Bearer ${adminToken}`);

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ action: 'COMPLETE_TASK' }) })
    );
  });
});

describe('GET /api/audit/actions', () => {
  it('retorna acciones distintas', async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([{ action: 'A' }, { action: 'B' }]);

    const res = await request(app).get('/api/audit/actions').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.actions).toEqual(['A', 'B']);
  });
});

describe('GET /api/audit/entity-types', () => {
  it('retorna tipos de entidad distintos', async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([{ entityType: 'X' }]);

    const res = await request(app).get('/api/audit/entity-types').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.entityTypes).toEqual(['X']);
  });

  it('retorna 403 para no-ADMIN', async () => {
    const res = await request(app).get('/api/audit/entity-types').set('Authorization', `Bearer ${adopterToken}`);
    expect(res.status).toBe(403);
  });
});
