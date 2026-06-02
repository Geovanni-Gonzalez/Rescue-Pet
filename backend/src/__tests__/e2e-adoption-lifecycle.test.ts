/**
 * E2E Test: Full Adoption Lifecycle
 *
 * Simulates the complete happy-path flow from adopter registration
 * through contract signing. All 13 steps use mocked Prisma but
 * exercise the real Express routes, middleware, validators and
 * controller logic end-to-end.
 *
 * Steps tested:
 *  1. Registro de adoptante
 *  2. Activación de cuenta
 *  3. Login
 *  4. Registro de mascota (admin)
 *  5. Cambio de estado a Disponible (admin)
 *  6. Test de compatibilidad (adopter)
 *  7. Solicitud de adopción
 *  8. Agenda de entrevista
 *  9. Carga de documentos
 * 10. Aprobación de solicitud (admin)
 * 11. Generación de contrato
 * 12. Firma digital
 * 13. Verificar mascota en estado Adoptado
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockDb: Record<string, any> = {};

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    animal: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    animalStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    clinicalRecord: { count: jest.fn() },
    compatibilityTest: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    compatibilityScore: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    adoptionRequest: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    interviewSlot: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    adopterDocument: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    adoptionContract: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    notification: { create: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(),
  },
}));

jest.mock('../services/emailService', () => ({
  sendActivationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../middlewares/upload', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const multer = require('multer');
  const m = multer({ storage: multer.memoryStorage() });
  return {
    uploadAnimalPhoto: m,
    uploadGalleryPhotos: m,
    uploadDocument: m,
    buildUploadUrl: jest.fn(() => 'http://localhost:3000/uploads/test.jpg'),
    cleanupUpload: jest.fn(),
  };
});

jest.mock('../services/pdfService', () => ({
  generateContractPdf: jest.fn().mockResolvedValue('adoption-e2e.pdf'),
  generateSignedContractPdf: jest.fn().mockResolvedValue('adoption-e2e-signed.pdf'),
  buildContractUrl: jest.fn((f: string) => `http://localhost:3000/uploads/contracts/${f}`),
}));

jest.mock('../services/qrService', () => ({
  generatePetQrDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,AAAA'),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const prismaMock = require('../utils/prisma').default;

const JWT_SECRET = 'test-secret-123';

// UUIDs (RFC 4122 v4)
const ADOPTER_ID   = 'e1111111-1111-4111-8111-111111111111';
const ADMIN_ID     = 'e2222222-2222-4222-8222-222222222222';
const ANIMAL_ID    = 'e3333333-3333-4333-8333-333333333333';
const APP_ID       = 'e4444444-4444-4444-8444-444444444444';
const CONTRACT_ID  = 'e5555555-5555-4555-8555-555555555555';
const SLOT_ID      = 'e6666666-6666-4666-8666-666666666666';

const adopterToken = jwt.sign({ id: ADOPTER_ID, email: 'adopter@e2e.com', role: 'ADOPTER' }, JWT_SECRET);
const adminToken   = jwt.sign({ id: ADMIN_ID,   email: 'admin@e2e.com',   role: 'ADMIN' },   JWT_SECRET);

function auth(token: string) { return { Authorization: `Bearer ${token}` }; }

beforeEach(() => jest.clearAllMocks());

// ─── Step 1: Registro de adoptante ───────────────────────────────────────────

describe('E2E Adoption Lifecycle', () => {
  it('Step 1 — Register adopter', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: ADOPTER_ID, fullName: 'E2E Adoptante', email: 'adopter@e2e.com',
      role: 'ADOPTER', status: 'PENDING_VERIFICATION',
    });

    const res = await request(app).post('/api/auth/register-adopter').send({
      fullName: 'E2E Adoptante',
      email: 'adopter@e2e.com',
      password: 'secure1234',
      phone: '+50699990001',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.activationToken).toBeDefined();
    mockDb.activationToken = res.body.activationToken;
  });

  // ─── Step 2: Activación de cuenta ──────────────────────────────────────────

  it('Step 2 — Activate account', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: ADOPTER_ID, status: 'PENDING_VERIFICATION',
      activationToken: 'valid-token',
      activationTokenExpiresAt: new Date(Date.now() + 86400000),
    });
    prismaMock.user.update.mockResolvedValue({ id: ADOPTER_ID, status: 'ACTIVE' });

    const res = await request(app).get('/api/auth/activate?token=valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ─── Step 3: Login ─────────────────────────────────────────────────────────

  it('Step 3 — Login', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('secure1234', 12);

    prismaMock.user.findUnique.mockResolvedValue({
      id: ADOPTER_ID, email: 'adopter@e2e.com', passwordHash: hash,
      role: 'ADOPTER', status: 'ACTIVE', failedLoginCount: 0,
    });
    prismaMock.user.update.mockResolvedValue({});

    const res = await request(app).post('/api/auth/login').send({
      email: 'adopter@e2e.com',
      password: 'secure1234',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('ADOPTER');
  });

  // ─── Step 4: Registro de mascota (admin) ───────────────────────────────────

  it('Step 4 — Create animal (admin)', async () => {
    const newAnimal = {
      id: ANIMAL_ID, name: 'E2E Rex', species: 'Perro', status: 'QUARANTINE',
      mainPhotoUrl: 'http://localhost:3000/uploads/test.jpg',
    };
    prismaMock.animal.create.mockResolvedValue(newAnimal);
    prismaMock.animal.update.mockResolvedValue({ ...newAnimal, publicProfileUrl: '...', qrUrl: '...' });

    const res = await request(app)
      .post('/api/animals')
      .set(auth(adminToken))
      .attach('mainPhoto', Buffer.from('fake-jpg'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .field('name', 'E2E Rex')
      .field('species', 'Perro');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // ─── Step 5: Cambio de estado a Disponible ─────────────────────────────────

  it('Step 5 — Change animal status to AVAILABLE', async () => {
    prismaMock.animal.findUnique.mockResolvedValue({
      id: ANIMAL_ID, status: 'QUARANTINE', mainPhotoUrl: 'http://photo.jpg',
    });
    prismaMock.clinicalRecord.count.mockResolvedValue(1);
    prismaMock.$transaction.mockResolvedValue([
      { id: ANIMAL_ID, status: 'AVAILABLE' },
      {},
    ]);

    const res = await request(app)
      .patch(`/api/animals/${ANIMAL_ID}/status`)
      .set(auth(adminToken))
      .send({ status: 'AVAILABLE', reason: 'Examen clínico OK' });

    expect(res.status).toBe(200);
    expect(res.body.animal.status).toBe('AVAILABLE');
  });

  // ─── Step 6: Test de compatibilidad ────────────────────────────────────────

  it('Step 6 — Save compatibility test', async () => {
    prismaMock.compatibilityTest.upsert.mockResolvedValue({ id: 'ct1', adopterId: ADOPTER_ID });
    prismaMock.animal.findMany.mockResolvedValue([{
      id: ANIMAL_ID, spaceNeed: 'LARGE', goodWithChildren: true,
      goodWithPets: true, energyLevel: 'HIGH', status: 'AVAILABLE',
    }]);
    prismaMock.compatibilityScore.upsert.mockResolvedValue({});

    const res = await request(app)
      .put('/api/adopters/me/compatibility-test')
      .set(auth(adopterToken))
      .send({
        housingType: 'HOUSE', hasYard: true, childrenCount: 1,
        hasOtherPets: false, dailyAvailableTime: 3,
        experienceLevel: 'EXPERIENCED',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ─── Step 7: Solicitud de adopción ─────────────────────────────────────────

  it('Step 7 — Create adoption application', async () => {
    prismaMock.animal.findUnique.mockResolvedValue({ id: ANIMAL_ID, status: 'AVAILABLE', name: 'E2E Rex', species: 'Perro' });
    prismaMock.adoptionRequest.findFirst.mockResolvedValue(null);
    prismaMock.adoptionRequest.create.mockResolvedValue({
      id: APP_ID, adopterId: ADOPTER_ID, animalId: ANIMAL_ID, status: 'RECEIVED',
      animal: { id: ANIMAL_ID, name: 'E2E Rex', species: 'Perro' },
      adopter: { id: ADOPTER_ID, fullName: 'E2E Adoptante', email: 'adopter@e2e.com' },
    });
    prismaMock.user.findMany.mockResolvedValue([{ id: ADMIN_ID, role: 'ADMIN', status: 'ACTIVE' }]);

    const res = await request(app)
      .post('/api/adoption-applications')
      .set(auth(adopterToken))
      .send({ animalId: ANIMAL_ID });

    expect(res.status).toBe(201);
    expect(res.body.application.status).toBe('RECEIVED');
    expect(prismaMock.notification.create).toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });

  // ─── Step 8: Agenda de entrevista ──────────────────────────────────────────

  it('Step 8 — Schedule interview', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({
      id: APP_ID, adopterId: ADOPTER_ID, status: 'RECEIVED',
    });
    const updatedSlot = { id: SLOT_ID, status: 'reserved', reservedByApplicationId: APP_ID };
    prismaMock.$transaction.mockImplementation(async (fn: Function) => {
      prismaMock.interviewSlot.findUnique.mockResolvedValue({
        id: SLOT_ID, status: 'available',
      });
      prismaMock.interviewSlot.update.mockResolvedValue(updatedSlot);
      prismaMock.adoptionRequest.update.mockResolvedValue({
        id: APP_ID, status: 'INTERVIEW',
      });
      return [updatedSlot];
    });

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/schedule-interview`)
      .set(auth(adopterToken))
      .send({ slotId: SLOT_ID });

    expect(res.status).toBe(200);
    expect(res.body.slot.status).toBe('reserved');
  });

  // ─── Step 9: Carga de documentos ───────────────────────────────────────────

  it('Step 9 — Upload documents', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({
      id: APP_ID, adopterId: ADOPTER_ID, status: 'INTERVIEW',
      adopter: { fullName: 'E2E Adoptante' },
      animal: { name: 'E2E Rex' },
    });
    prismaMock.adopterDocument.findFirst.mockResolvedValue(null);
    prismaMock.adopterDocument.create.mockResolvedValue({
      id: 'doc1', documentType: 'ID_CARD', fileName: 'id.pdf', version: 1,
    });
    prismaMock.user.findMany.mockResolvedValue([{ id: ADMIN_ID }]);

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/documents`)
      .set(auth(adopterToken))
      .attach('file', Buffer.from('fake-pdf'), { filename: 'id.pdf', contentType: 'application/pdf' })
      .field('documentType', 'ID_CARD');

    expect(res.status).toBe(201);
    expect(res.body.document.documentType).toBe('ID_CARD');
  });

  // ─── Step 10: Aprobación de solicitud (admin) ──────────────────────────────

  it('Step 10 — Approve adoption application', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({
      id: APP_ID, adopterId: ADOPTER_ID, animalId: ANIMAL_ID, status: 'VISIT',
      animal: { id: ANIMAL_ID, name: 'E2E Rex', species: 'Perro' },
      adopter: { id: ADOPTER_ID, fullName: 'E2E Adoptante', email: 'adopter@e2e.com' },
    });
    prismaMock.adopterDocument.findMany.mockResolvedValue([
      { documentType: 'ID_CARD' },
      { documentType: 'ADDRESS_PROOF' },
    ]);
    prismaMock.adoptionRequest.update.mockResolvedValue({
      id: APP_ID, status: 'APPROVED',
      animal: { id: ANIMAL_ID, name: 'E2E Rex' },
      adopter: { id: ADOPTER_ID, fullName: 'E2E Adoptante' },
      documents: [], contract: null, interviewSlot: null,
    });
    prismaMock.adoptionContract.upsert.mockResolvedValue({ id: CONTRACT_ID });

    const res = await request(app)
      .patch(`/api/adoption-applications/${APP_ID}/status`)
      .set(auth(adminToken))
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('APPROVED');
    expect(prismaMock.notification.create).toHaveBeenCalled();
  });

  // ─── Step 11: Generación de contrato ───────────────────────────────────────

  it('Step 11 — Generate contract', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({
      id: APP_ID, adopterId: ADOPTER_ID, animalId: ANIMAL_ID, status: 'APPROVED',
      animal: { id: ANIMAL_ID, name: 'E2E Rex', species: 'Perro' },
      adopter: { fullName: 'E2E Adoptante', email: 'adopter@e2e.com' },
    });
    prismaMock.adoptionContract.upsert.mockResolvedValue({
      id: CONTRACT_ID, applicationId: APP_ID, status: 'GENERATED',
      pdfUrl: 'http://localhost:3000/uploads/contracts/adoption-e2e.pdf',
    });

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/contract/generate`)
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.contract.status).toBe('GENERATED');
    expect(res.body.contract.pdfUrl).toContain('.pdf');
  });

  // ─── Step 12: Firma digital ────────────────────────────────────────────────

  it('Step 12 — Sign contract', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({
      id: APP_ID, adopterId: ADOPTER_ID, animalId: ANIMAL_ID, status: 'APPROVED',
      animal: { id: ANIMAL_ID, name: 'E2E Rex', species: 'Perro' },
      adopter: { fullName: 'E2E Adoptante', email: 'adopter@e2e.com' },
      contract: { id: CONTRACT_ID, createdAt: new Date() },
    });
    const signedContract = {
      id: CONTRACT_ID, status: 'SIGNED', signedAt: new Date(),
      signedPdfUrl: 'http://localhost:3000/uploads/contracts/adoption-e2e-signed.pdf',
    };
    prismaMock.$transaction.mockResolvedValue([
      signedContract,
      { id: ANIMAL_ID, status: 'ADOPTED' },
      {},
      {},
    ]);
    prismaMock.user.findMany.mockResolvedValue([{ id: ADMIN_ID }]);

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/contract/sign`)
      .set(auth(adopterToken))
      .send({ signatureImageUrl: 'data:image/png;base64,fakeSignature==' });

    expect(res.status).toBe(200);
    expect(res.body.contract.status).toBe('SIGNED');
  });

  // ─── Step 13: Verificar mascota en estado Adoptado ─────────────────────────

  it('Step 13 — Verify animal is ADOPTED', async () => {
    prismaMock.animal.findUnique.mockResolvedValue({
      id: ANIMAL_ID, name: 'E2E Rex', status: 'ADOPTED', gallery: [],
    });

    const res = await request(app)
      .get(`/api/animals/${ANIMAL_ID}`)
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.animal.status).toBe('ADOPTED');
  });
});
