import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

jest.mock('../utils/db', () => ({
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
const dbMock = require('../utils/db').default;

const JWT_SECRET = 'test-secret-123';

const makeToken = (role: string, id = 'user-1') =>
  jwt.sign({ id, email: `${role.toLowerCase()}@test.com`, role }, JWT_SECRET);

const authHeader = (role: string, id?: string) => ({
  Authorization: `Bearer ${makeToken(role, id)}`,
});

beforeEach(() => {
  jest.clearAllMocks();
  dbMock.auditLog.create.mockResolvedValue({});
});

// ─── GET /api/users ────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  it('ADMIN obtiene la lista de usuarios', async () => {
    dbMock.user.findMany.mockResolvedValue([]);

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
    dbMock.user.findUnique.mockResolvedValue(null);
    dbMock.user.create.mockResolvedValue({
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
    dbMock.user.findUnique.mockResolvedValue({ id: 'existing' });

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
    dbMock.user.update.mockResolvedValue({
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

  it('usuario actualiza su correo electrónico si no está en uso', async () => {
    dbMock.user.findUnique.mockResolvedValue(null);
    dbMock.user.update.mockResolvedValue({
      id: 'user-1',
      fullName: 'Test',
      email: 'nuevo@test.com',
      role: 'ADOPTER',
      status: 'ACTIVE',
    });

    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader('ADOPTER'))
      .send({ email: 'nuevo@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('nuevo@test.com');
  });

  it('CU-10 4E: rechaza un correo que pertenece a otra cuenta', async () => {
    dbMock.user.findUnique.mockResolvedValue({ id: 'otro-usuario', email: 'dup@test.com' });

    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader('ADOPTER'))
      .send({ email: 'dup@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El correo electrónico ya está en uso por otra cuenta.');
    expect(dbMock.user.update).not.toHaveBeenCalled();
  });

  it('CU-10 3E: rechaza con 403 y registra en auditoría el intento de cambiar el propio rol', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader('ADOPTER'))
      .send({ fullName: 'Nombre', role: 'ADMIN' });

    expect(res.status).toBe(403);
    expect(dbMock.user.update).not.toHaveBeenCalled();
    expect(dbMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'SELF_ROLE_CHANGE_DENIED' }),
      })
    );
  });

  it('rechaza campos obligatorios vacíos', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader('ADOPTER'))
      .send({ fullName: '', email: 'no-es-un-correo' });

    expect(res.status).toBe(400);
    expect(dbMock.user.update).not.toHaveBeenCalled();
  });
});

// ─── PATCH /api/users/:id (admin) ─────────────────────────────────────────────

describe('PATCH /api/users/:id', () => {
  it('ADMIN cambia el rol de otro usuario', async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: 'other-user',
      email: 'other@test.com',
      role: 'VOLUNTEER',
      status: 'ACTIVE',
    });
    dbMock.user.update.mockResolvedValue({
      id: 'other-user',
      fullName: 'Otro',
      email: 'other@test.com',
      role: 'VETERINARIAN',
      status: 'ACTIVE',
    });

    const res = await request(app)
      .patch('/api/users/other-user')
      .set(authHeader('ADMIN', 'admin-id'))
      .send({ role: 'VETERINARIAN' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('VETERINARIAN');
    expect(dbMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'CHANGE_ROLE' }),
      })
    );
  });

  it('ADMIN no puede cambiar su propio rol', async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: 'admin-id',
      email: 'admin@test.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const res = await request(app)
      .patch('/api/users/admin-id')
      .set(authHeader('ADMIN', 'admin-id'))
      .send({ role: 'ADOPTER' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/propio rol/i);
    expect(dbMock.user.update).not.toHaveBeenCalled();
  });

  it('retorna 404 si el usuario no existe', async () => {
    dbMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/users/no-existe')
      .set(authHeader('ADMIN', 'admin-id'))
      .send({ fullName: 'Nuevo Nombre' });

    expect(res.status).toBe(404);
  });

  it('VOLUNTEER recibe 403', async () => {
    const res = await request(app)
      .patch('/api/users/other-user')
      .set(authHeader('VOLUNTEER'))
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
  });
});

// ─── PUT /api/users/me/password ───────────────────────────────────────────────

describe('PUT /api/users/me/password', () => {
  it('retorna 400 si currentPassword es incorrecto', async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('correct-password', 10);
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', passwordHash });

    const res = await request(app)
      .put('/api/users/me/password')
      .set(authHeader('ADOPTER'))
      .send({ currentPassword: 'wrong-password', newPassword: 'NuevaClave123!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrecta/i);
  });

  it('CU-10 4E2: rechaza una contraseña que no cumple la política y detalla los requisitos', async () => {
    const res = await request(app)
      .put('/api/users/me/password')
      .set(authHeader('ADOPTER'))
      .send({ currentPassword: 'current-password', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/requisitos/i);
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThan(0);
    expect(dbMock.user.update).not.toHaveBeenCalled();
  });

  it('cambia la contraseña correctamente e invalida sesiones previas', async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('current-password', 10);
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', passwordHash });
    dbMock.user.update.mockResolvedValue({});

    const res = await request(app)
      .put('/api/users/me/password')
      .set(authHeader('ADOPTER'))
      .send({ currentPassword: 'current-password', newPassword: 'NuevaClave123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // passwordChangedAt habilita la invalidación de tokens previos en el middleware
    expect(dbMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordChangedAt: expect.any(Date) }),
      })
    );
  });

  it('CU-10 3A: un token emitido antes del cambio de contraseña queda invalidado', async () => {
    const oldIat = Math.floor(Date.now() / 1000) - 3600; // emitido hace 1 hora
    const oldToken = jwt.sign(
      { id: 'user-1', email: 'adopter@test.com', role: 'ADOPTER', iat: oldIat },
      JWT_SECRET
    );
    dbMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'ADOPTER',
      status: 'ACTIVE',
      passwordChangedAt: new Date(), // contraseña cambiada después de emitir el token
    });

    const res = await request(app)
      .put('/api/users/me')
      .set({ Authorization: `Bearer ${oldToken}` })
      .send({ fullName: 'No debería aplicarse' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/token/i);
  });

  it('un usuario con baja lógica (INACTIVE) no puede usar tokens existentes', async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'ADOPTER',
      status: 'INACTIVE',
    });

    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader('ADOPTER'))
      .send({ fullName: 'No debería aplicarse' });

    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/users/:id/deactivate ──────────────────────────────────────────

describe('PATCH /api/users/:id/deactivate', () => {
  it('ADMIN desactiva otro usuario', async () => {
    dbMock.user.update.mockResolvedValue({ id: 'other-user', status: 'INACTIVE' });

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
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', fullName: 'Test', email: 'test@test.com' });

    const res = await request(app).get('/api/users/user-1').set(authHeader('ADOPTER', 'user-1'));

    expect(res.status).toBe(200);
  });

  it('usuario no puede ver el perfil de otro usuario', async () => {
    const res = await request(app).get('/api/users/other-user').set(authHeader('ADOPTER', 'user-1'));

    expect(res.status).toBe(403);
  });

  it('ADMIN puede ver cualquier perfil', async () => {
    dbMock.user.findUnique.mockResolvedValue({ id: 'any-user', fullName: 'Other', email: 'other@test.com' });

    const res = await request(app).get('/api/users/any-user').set(authHeader('ADMIN', 'admin-id'));

    expect(res.status).toBe(200);
  });
});
