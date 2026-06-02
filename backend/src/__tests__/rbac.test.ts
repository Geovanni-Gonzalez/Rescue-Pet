/**
 * RBAC Validation Tests
 *
 * Validates that every protected endpoint enforces correct role-based access.
 * Tests both positive (allowed) and negative (denied) access per role.
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
    animal: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    animalStatusHistory: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    animalRescueLocationHistory: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    clinicalRecord: { count: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    clinicalEntry: { create: jest.fn() },
    vaccine: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    compatibilityTest: { findUnique: jest.fn(), upsert: jest.fn() },
    compatibilityScore: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    adoptionRequest: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
    adopterDocument: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
    adoptionContract: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    interviewSlot: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
    notification: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), count: jest.fn().mockResolvedValue(0), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn() },
    operationalTask: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}), findFirst: jest.fn() },
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
  generateContractPdf: jest.fn().mockResolvedValue('f.pdf'),
  generateSignedContractPdf: jest.fn().mockResolvedValue('fs.pdf'),
  buildContractUrl: jest.fn((f: string) => f),
}));
jest.mock('../services/qrService', () => ({ generatePetQrDataUrl: jest.fn().mockResolvedValue('qr') }));

const JWT_SECRET = 'test-secret-123';
const makeToken = (role: string) =>
  jwt.sign({ id: `${role.toLowerCase()}-id`, email: `${role.toLowerCase()}@t.com`, role }, JWT_SECRET);

const tokens: Record<string, string> = {
  ADMIN: makeToken('ADMIN'),
  VETERINARIAN: makeToken('VETERINARIAN'),
  VOLUNTEER: makeToken('VOLUNTEER'),
  ADOPTER: makeToken('ADOPTER'),
};

function hdr(role: string) { return { Authorization: `Bearer ${tokens[role]}` }; }

beforeEach(() => jest.clearAllMocks());

// Helper: test that a route returns 403 for denied roles and NOT 403 for allowed roles
async function expectAccess(
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  path: string,
  allowedRoles: string[],
  body?: Record<string, unknown>,
) {
  const allRoles = ['ADMIN', 'VETERINARIAN', 'VOLUNTEER', 'ADOPTER'];
  const deniedRoles = allRoles.filter((r) => !allowedRoles.includes(r));

  for (const role of deniedRoles) {
    const req = (request(app) as any)[method](path).set(hdr(role));
    if (body) req.send(body);
    const res = await req;
    expect(res.status).toBe(403);
  }

  for (const role of allowedRoles) {
    const req = (request(app) as any)[method](path).set(hdr(role));
    if (body) req.send(body);
    const res = await req;
    expect(res.status).not.toBe(403);
  }
}

// ─── No token → 401 ─────────────────────────────────────────────────────────

describe('Unauthenticated access returns 401', () => {
  const protectedRoutes = [
    ['get', '/api/animals'],
    ['get', '/api/notifications'],
    ['get', '/api/tasks'],
    ['get', '/api/adoption-applications'],
    ['get', '/api/reports/adoptions'],
    ['get', '/api/audit'],
  ] as const;

  for (const [method, path] of protectedRoutes) {
    it(`${method.toUpperCase()} ${path}`, async () => {
      const res = await (request(app) as any)[method](path);
      expect(res.status).toBe(401);
    });
  }
});

// ─── Animal routes RBAC ──────────────────────────────────────────────────────

describe('Animal routes RBAC', () => {
  it('PATCH /:id — edit animal — ADMIN, VOLUNTEER, VETERINARIAN', async () => {
    await expectAccess('patch', '/api/animals/fake-id', ['ADMIN', 'VOLUNTEER', 'VETERINARIAN'], {});
  });

  it('PATCH /:id/status — only ADMIN, VETERINARIAN', async () => {
    await expectAccess('patch', '/api/animals/fake-id/status', ['ADMIN', 'VETERINARIAN'], { status: 'AVAILABLE' });
  });

  it('POST /:id/gallery — only ADMIN, VOLUNTEER', async () => {
    await expectAccess('post', '/api/animals/fake-id/gallery', ['ADMIN', 'VOLUNTEER']);
  });

  it('GET /:id/clinical-record — only ADMIN, VETERINARIAN', async () => {
    await expectAccess('get', '/api/animals/fake-id/clinical-record', ['ADMIN', 'VETERINARIAN']);
  });

  it('GET /:id/medical-summary — ADMIN, VETERINARIAN, VOLUNTEER', async () => {
    await expectAccess('get', '/api/animals/fake-id/medical-summary', ['ADMIN', 'VETERINARIAN', 'VOLUNTEER']);
  });
});

// ─── Matchmaking routes RBAC ─────────────────────────────────────────────────

describe('Matchmaking routes RBAC', () => {
  it('GET /me/compatibility-test — only ADOPTER', async () => {
    await expectAccess('get', '/api/adopters/me/compatibility-test', ['ADOPTER']);
  });

  it('PUT /me/compatibility-test — only ADOPTER', async () => {
    await expectAccess('put', '/api/adopters/me/compatibility-test', ['ADOPTER'], {
      housingType: 'HOUSE', hasYard: true, childrenCount: 0,
      hasOtherPets: false, dailyAvailableTime: 2, experienceLevel: 'BEGINNER',
    });
  });
});

// ─── Adoption application RBAC ───────────────────────────────────────────────

describe('Adoption application RBAC', () => {
  it('POST / — only ADOPTER', async () => {
    await expectAccess('post', '/api/adoption-applications', ['ADOPTER'], {
      animalId: 'e1111111-1111-4111-8111-111111111111',
    });
  });

  it('PATCH /:id/status — only ADMIN', async () => {
    await expectAccess('patch', '/api/adoption-applications/fake-id/status', ['ADMIN'], { status: 'INTERVIEW' });
  });

  it('POST /:id/contract/generate — only ADMIN', async () => {
    await expectAccess('post', '/api/adoption-applications/fake-id/contract/generate', ['ADMIN']);
  });

  it('POST /:id/contract/sign — only ADOPTER', async () => {
    await expectAccess('post', '/api/adoption-applications/fake-id/contract/sign', ['ADOPTER'], {
      signatureImageUrl: 'data:image/png;base64,fake',
    });
  });
});

// ─── Task routes RBAC ────────────────────────────────────────────────────────

describe('Task routes RBAC', () => {
  it('GET /tasks — only ADMIN, VETERINARIAN, VOLUNTEER', async () => {
    await expectAccess('get', '/api/tasks', ['ADMIN', 'VETERINARIAN', 'VOLUNTEER']);
  });

  it('GET /tasks/alerts — only ADMIN, VETERINARIAN, VOLUNTEER', async () => {
    await expectAccess('get', '/api/tasks/alerts', ['ADMIN', 'VETERINARIAN', 'VOLUNTEER']);
  });

  it('POST /tasks — only ADMIN, VETERINARIAN', async () => {
    await expectAccess('post', '/api/tasks', ['ADMIN', 'VETERINARIAN'], {
      type: 'HEALTH', assignedRole: 'VETERINARIAN',
      scheduledAt: new Date().toISOString(),
    });
  });

  it('POST /tasks/:id/complete — only ADMIN, VETERINARIAN, VOLUNTEER', async () => {
    await expectAccess('post', '/api/tasks/fake-id/complete', ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'], {});
  });

  it('GET /tasks/completions — only ADMIN', async () => {
    await expectAccess('get', '/api/tasks/completions', ['ADMIN']);
  });
});

// ─── Report routes RBAC ──────────────────────────────────────────────────────

describe('Report routes RBAC', () => {
  it('GET /reports/adoptions — only ADMIN', async () => {
    await expectAccess('get', '/api/reports/adoptions', ['ADMIN']);
  });

  it('GET /reports/health — only ADMIN', async () => {
    await expectAccess('get', '/api/reports/health', ['ADMIN']);
  });
});

// ─── Audit routes RBAC ──────────────────────────────────────────────────────

describe('Audit routes RBAC', () => {
  it('GET /audit — only ADMIN', async () => {
    await expectAccess('get', '/api/audit', ['ADMIN']);
  });

  it('GET /audit/actions — only ADMIN', async () => {
    await expectAccess('get', '/api/audit/actions', ['ADMIN']);
  });
});
