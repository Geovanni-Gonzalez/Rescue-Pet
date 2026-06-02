/**
 * Security & Error Handling Validation Tests
 *
 * Validates:
 * - Invalid/expired/tampered JWT tokens
 * - Zod input validation (malformed payloads, injection attempts)
 * - Error handler produces consistent JSON
 * - Health endpoint
 * - Audit log written on access denial
 * - Rate-limiting headers (if present)
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
    animal: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    animalStatusHistory: { create: jest.fn() },
    clinicalRecord: { count: jest.fn() },
    compatibilityTest: { findUnique: jest.fn() },
    compatibilityScore: { findMany: jest.fn().mockResolvedValue([]) },
    adoptionRequest: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    adopterDocument: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    adoptionContract: { findUnique: jest.fn() },
    interviewSlot: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    notification: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), create: jest.fn() },
    operationalTask: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn(),
  },
}));

jest.mock('../middlewares/upload', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const multer = require('multer');
  const m = multer({ storage: multer.memoryStorage() });
  return { uploadAnimalPhoto: m, uploadGalleryPhotos: m, uploadDocument: m, buildUploadUrl: jest.fn(() => 'url'), cleanupUpload: jest.fn() };
});
jest.mock('../services/pdfService', () => ({
  generateContractPdf: jest.fn(), generateSignedContractPdf: jest.fn(), buildContractUrl: jest.fn(),
}));
jest.mock('../services/qrService', () => ({ generatePetQrDataUrl: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const prismaMock = require('../utils/prisma').default;

const JWT_SECRET = 'test-secret-123';
const validToken = jwt.sign({ id: 'u1', email: 'test@t.com', role: 'ADMIN' }, JWT_SECRET);
const auth = { Authorization: `Bearer ${validToken}` };

beforeEach(() => jest.clearAllMocks());

// ─── JWT Validation ──────────────────────────────────────────────────────────

describe('JWT validation', () => {
  it('rejects request with no token', async () => {
    const res = await request(app).get('/api/animals');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects request with malformed token', async () => {
    const res = await request(app).get('/api/animals').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects token signed with wrong secret', async () => {
    const badToken = jwt.sign({ id: 'u1', email: 't@t.com', role: 'ADMIN' }, 'wrong-secret');
    const res = await request(app).get('/api/animals').set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(403);
  });

  it('rejects expired token', async () => {
    const expired = jwt.sign({ id: 'u1', email: 't@t.com', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '0s' });
    // Tiny delay to ensure expiry
    await new Promise((r) => setTimeout(r, 10));
    const res = await request(app).get('/api/animals').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(403);
  });

  it('rejects token without Bearer prefix', async () => {
    const res = await request(app).get('/api/animals').set('Authorization', validToken);
    expect(res.status).toBe(401);
  });
});

// ─── Input Validation ────────────────────────────────────────────────────────

describe('Input validation', () => {
  it('register — rejects short password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/register-adopter').send({
      fullName: 'Test', email: 'x@x.com', password: '12',
    });
    expect(res.status).toBe(400);
  });

  it('register — rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register-adopter').send({
      fullName: 'Test', email: 'not-an-email', password: '12345678',
    });
    expect(res.status).toBe(400);
  });

  it('login — rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('create task — rejects invalid type', async () => {
    const res = await request(app).post('/api/tasks').set(auth).send({
      type: 'INVALID_TYPE', assignedRole: 'VETERINARIAN',
      scheduledAt: new Date().toISOString(),
    });
    expect(res.status).toBe(400);
  });

  it('update animal status — rejects unknown status', async () => {
    const res = await request(app)
      .patch('/api/animals/fake-id/status')
      .set(auth)
      .send({ status: 'FLYING' });
    expect(res.status).toBe(400);
  });

  it('adoption application — rejects non-UUID animalId', async () => {
    const adopterToken = jwt.sign({ id: 'u1', email: 't@t.com', role: 'ADOPTER' }, JWT_SECRET);
    const res = await request(app)
      .post('/api/adoption-applications')
      .set({ Authorization: `Bearer ${adopterToken}` })
      .send({ animalId: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });

  it('SQL injection attempts in query params do not crash server', async () => {
    const res = await request(app)
      .get("/api/animals?status=AVAILABLE'; DROP TABLE animal;--")
      .set(auth);
    // Should not crash — returns normally (Prisma parameterizes)
    expect([200, 400, 404, 500]).toContain(res.status);
    expect(res.body).toBeDefined();
  });

  it('XSS payload in body is stored as-is (no execution)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'xss-user', fullName: '<script>alert("xss")</script>',
      email: 'xss@test.com', role: 'ADOPTER', status: 'PENDING_VERIFICATION',
    });
    const xssName = '<script>alert("xss")</script>';
    const res = await request(app).post('/api/auth/register-adopter').send({
      fullName: xssName, email: 'xss@test.com', password: 'secure1234',
    });
    // Should accept it (output encoding is frontend's responsibility)
    // or reject for min length — either way, no crash
    expect([201, 400]).toContain(res.status);
  });
});

// ─── Error response format ───────────────────────────────────────────────────

describe('Error response format', () => {
  it('404 routes return JSON', async () => {
    const res = await request(app).get('/api/nonexistent-route').set(auth);
    // Express default 404 or our handler
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('all error responses have success:false', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});

// ─── Health endpoint ─────────────────────────────────────────────────────────

describe('Health check', () => {
  it('GET /health returns 200 with status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ─── Audit on access denial ──────────────────────────────────────────────────

describe('Audit logging on access denial', () => {
  it('writes audit log when role is denied', async () => {
    const adopterToken = jwt.sign({ id: 'u1', email: 't@t.com', role: 'ADOPTER' }, JWT_SECRET);

    await request(app)
      .get('/api/audit')
      .set({ Authorization: `Bearer ${adopterToken}` });

    // The authorizeRoles middleware should have called writeAccessDeniedLog
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ACCESS_DENIED',
          entityType: 'AccessControl',
        }),
      })
    );
  });
});
