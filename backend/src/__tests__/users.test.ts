import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('../services/emailService', () => ({
  sendInternalUserCredentials: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const prismaMock = require('../utils/prisma').default;

const JWT_SECRET = 'test-secret-123';

const makeToken = (role: string, id = 'user-1') =>
  jwt.sign({ id, email: `${role.toLowerCase()}@test.com`, role }, JWT_SECRET);

const authHeader = (role: string, id?: string) => ({
  Authorization: `Bearer ${makeToken(role, id)}`,
});

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.auditLog.create.mockResolvedValue({});
});

// ─── GET /api/users ────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  it('ADMIN obtiene la lista de usuarios', async () => {
    prismaMock.user.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/users').set(authHeader('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it('ADOPTER recibe 403', async () => {
    const res = await request(app).get('/api/users').set(authHeader('ADOPTER'));
    expect(res.status).toBe(403);
  });

  it('sin token recibe 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/users ───────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  it('ADMIN crea un VETERINARIAN', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'vet-1',
      fullName: 'Dr. García',
      email: 'vet@test.com',
      role: 'VETERINARIAN',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/users')
      .set(authHeader('ADMIN'))
      .send({ fullName: 'Dr. García', email: 'vet@test.com', role: 'VETERINARIAN' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('VETERINARIAN');
  });

  it('no permite crear usuarios con rol ADMIN', async () => {
    const res = await request(app)
      .post('/api/users')
      .set(authHeader('ADMIN'))
      .send({ fullName: 'Super Admin', email: 'hack@test.com', role: 'ADMIN' });

    expect(res.status).toBe(400);
  });

  it('no permite crear usuarios con rol ADOPTER', async () => {
    const res = await request(app)
      .post('/api/users')
      .set(authHeader('ADMIN'))
      .send({ fullName: 'Test', email: 'adopter@test.com', role: 'ADOPTER' });

    expect(res.status).toBe(400);
  });

  it('retorna 400 si el correo ya existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });

    const res = await request(app)
      .post('/api/users')
      .set(authHeader('ADMIN'))
      .send({ fullName: 'Dup User', email: 'dup@test.com', role: 'VOLUNTEER' });

    expect(res.status).toBe(400);
  });

  it('VETERINARIAN recibe 403', async () => {
    const res = await request(app)
      .post('/api/users')
      .set(authHeader('VETERINARIAN'))
      .send({ fullName: 'Test', email: 'test@test.com', role: 'VOLUNTEER' });

    expect(res.status).toBe(403);
  });
});

// ─── PUT /api/users/me ─────────────────────────────────────────────────────────

describe('PUT /api/users/me', () => {
  it('usuario actualiza su propio perfil', async () => {
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      fullName: 'Nuevo Nombre',
      email: 'adopter@test.com',
      role: 'ADOPTER',
      status: 'ACTIVE',
    });

    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader('ADOPTER'))
      .send({ fullName: 'Nuevo Nombre' });

    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toBe('Nuevo Nombre');
  });
});

// ─── PUT /api/users/me/password ───────────────────────────────────────────────

describe('PUT /api/users/me/password', () => {
  it('retorna 400 si currentPassword es incorrecto', async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('correct-password', 10);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', passwordHash });

    const res = await request(app)
      .put('/api/users/me/password')
      .set(authHeader('ADOPTER'))
      .send({ currentPassword: 'wrong-password', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrecta/i);
  });

  it('cambia la contraseña correctamente', async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('current-password', 10);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', passwordHash });
    prismaMock.user.update.mockResolvedValue({});

    const res = await request(app)
      .put('/api/users/me/password')
      .set(authHeader('ADOPTER'))
      .send({ currentPassword: 'current-password', newPassword: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── PATCH /api/users/:id/deactivate ──────────────────────────────────────────

describe('PATCH /api/users/:id/deactivate', () => {
  it('ADMIN desactiva otro usuario', async () => {
    prismaMock.user.update.mockResolvedValue({ id: 'other-user', status: 'INACTIVE' });

    const res = await request(app)
      .patch('/api/users/other-user/deactivate')
      .set(authHeader('ADMIN', 'admin-id'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('no permite auto-desactivación', async () => {
    const res = await request(app)
      .patch('/api/users/admin-id/deactivate')
      .set(authHeader('ADMIN', 'admin-id'));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/propia cuenta/i);
  });

  it('VOLUNTEER recibe 403', async () => {
    const res = await request(app)
      .patch('/api/users/other-user/deactivate')
      .set(authHeader('VOLUNTEER'));

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/users/:id ────────────────────────────────────────────────────────

describe('GET /api/users/:id', () => {
  it('usuario ve su propio perfil', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', fullName: 'Test', email: 'test@test.com' });

    const res = await request(app).get('/api/users/user-1').set(authHeader('ADOPTER', 'user-1'));

    expect(res.status).toBe(200);
  });

  it('usuario no puede ver el perfil de otro usuario', async () => {
    const res = await request(app).get('/api/users/other-user').set(authHeader('ADOPTER', 'user-1'));

    expect(res.status).toBe(403);
  });

  it('ADMIN puede ver cualquier perfil', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'any-user', fullName: 'Other', email: 'other@test.com' });

    const res = await request(app).get('/api/users/any-user').set(authHeader('ADMIN', 'admin-id'));

    expect(res.status).toBe(200);
  });
});
