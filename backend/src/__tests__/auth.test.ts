import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app';

jest.mock('../utils/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('../services/emailService', () => ({
  sendActivationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dbMock = require('../utils/db').default;

beforeEach(() => {
  jest.clearAllMocks();
  dbMock.auditLog.create.mockResolvedValue({});
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('retorna 401 cuando el usuario no existe', async () => {
    dbMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'pass1234' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('retorna 401 para cuenta INACTIVE', async () => {
    dbMock.user.findUnique.mockResolvedValue({ status: 'INACTIVE' });

    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'pass1234' });

    expect(res.status).toBe(401);
  });

  it('retorna 401 con code PENDING_VERIFICATION para cuenta no activada', async () => {
    dbMock.user.findUnique.mockResolvedValue({ id: '1', email: 'x@x.com', status: 'PENDING_VERIFICATION' });

    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'pass1234' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('PENDING_VERIFICATION');
  });

  it('retorna 401 para cuenta BLOCKED con lockedUntil en el futuro', async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: '1',
      status: 'BLOCKED',
      lockedUntil: new Date(Date.now() + 60_000),
    });

    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'pass1234' });

    expect(res.status).toBe(401);
  });

  it('retorna token JWT con credenciales válidas', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    dbMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@test.com',
      fullName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
    });
    dbMock.user.update.mockResolvedValue({});

    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('bloquea cuenta después de 5 intentos fallidos', async () => {
    const passwordHash = await bcrypt.hash('correct', 10);
    dbMock.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'user@test.com',
      role: 'ADOPTER',
      status: 'ACTIVE',
      passwordHash,
      failedLoginCount: 4,
      lockedUntil: null,
    });
    dbMock.user.update.mockResolvedValue({});

    await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'wrongpassword' });

    const updateCall = dbMock.user.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('BLOCKED');
    expect(updateCall.data.lockedUntil).toBeDefined();
  });

  it('retorna 400 con datos de esquema inválidos', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

// ─── Register ─────────────────────────────────────────────────────────────────

describe('POST /api/auth/register-adopter', () => {
  it('crea cuenta y retorna 201', async () => {
    dbMock.user.findUnique.mockResolvedValue(null);
    dbMock.user.create.mockResolvedValue({ id: 'new-1', email: 'nuevo@test.com' });

    const res = await request(app).post('/api/auth/register-adopter').send({
      fullName: 'Juan Perez',
      email: 'nuevo@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('retorna 400 si el correo ya está registrado', async () => {
    dbMock.user.findUnique.mockResolvedValue({ id: 'existing' });

    const res = await request(app).post('/api/auth/register-adopter').send({
      fullName: 'Juan',
      email: 'existe@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(400);
  });

  it('retorna 400 si la contraseña tiene menos de 8 caracteres', async () => {
    const res = await request(app).post('/api/auth/register-adopter').send({
      fullName: 'Juan',
      email: 'nuevo@test.com',
      password: 'short',
    });

    expect(res.status).toBe(400);
  });

  it('expone activationToken en entorno no-producción', async () => {
    dbMock.user.findUnique.mockResolvedValue(null);
    dbMock.user.create.mockResolvedValue({ id: 'new-1', email: 'test@test.com' });

    const res = await request(app).post('/api/auth/register-adopter').send({
      fullName: 'Test User',
      email: 'test@test.com',
      password: 'password123',
    });

    expect(res.body.activationToken).toBeDefined();
  });
});

// ─── Activate ─────────────────────────────────────────────────────────────────

describe('GET /api/auth/activate', () => {
  it('activa cuenta con token válido', async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      activationToken: 'valid-token',
      activationTokenExpiresAt: new Date(Date.now() + 3_600_000),
    });
    dbMock.user.update.mockResolvedValue({});

    const res = await request(app).get('/api/auth/activate?token=valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('retorna 400 para token expirado', async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      activationToken: 'expired-token',
      activationTokenExpiresAt: new Date(Date.now() - 3_600_000),
    });

    const res = await request(app).get('/api/auth/activate?token=expired-token');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  it('retorna 400 para token inexistente', async () => {
    dbMock.user.findUnique.mockResolvedValue(null);
    dbMock.auditLog.create.mockResolvedValue({});

    const res = await request(app).get('/api/auth/activate?token=bad-token');

    expect(res.status).toBe(400);
  });

  it('retorna 400 si no se provee token', async () => {
    const res = await request(app).get('/api/auth/activate');
    expect(res.status).toBe(400);
  });
});

// ─── Forgot / Reset Password ───────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('siempre retorna 200 (previene enumeración de usuarios)', async () => {
    dbMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'noexiste@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('llama a sendPasswordResetEmail cuando existe el usuario', async () => {
    const { sendPasswordResetEmail } = await import('../services/emailService');
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@test.com', status: 'ACTIVE' });
    dbMock.user.update.mockResolvedValue({});

    await request(app).post('/api/auth/forgot-password').send({ email: 'user@test.com' });

    expect(sendPasswordResetEmail).toHaveBeenCalled();
  });
});

describe('POST /api/auth/reset-password', () => {
  it('restablece la contraseña con token válido', async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      resetToken: 'valid-reset',
      resetTokenExpiresAt: new Date(Date.now() + 3_600_000),
    });
    dbMock.user.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid-reset', password: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('retorna 400 para token expirado', async () => {
    dbMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      resetToken: 'expired-reset',
      resetTokenExpiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'expired-reset', password: 'newpassword123' });

    expect(res.status).toBe(400);
  });

  it('retorna 400 para token inexistente', async () => {
    dbMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'fake', password: 'newpassword123' });

    expect(res.status).toBe(400);
  });
});

// ─── Resend Activation ─────────────────────────────────────────────────────────

describe('POST /api/auth/resend-activation', () => {
  it('siempre retorna 200 (previene enumeración)', async () => {
    dbMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/resend-activation').send({ email: 'noexiste@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('llama a sendActivationEmail para cuenta PENDING_VERIFICATION', async () => {
    const { sendActivationEmail } = await import('../services/emailService');
    dbMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'pending@test.com',
      status: 'PENDING_VERIFICATION',
    });
    dbMock.user.update.mockResolvedValue({});

    await request(app).post('/api/auth/resend-activation').send({ email: 'pending@test.com' });

    expect(sendActivationEmail).toHaveBeenCalled();
  });
});
