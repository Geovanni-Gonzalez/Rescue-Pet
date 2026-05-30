import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    animal: { findUnique: jest.fn(), update: jest.fn() },
    adoptionRequest: {
      findUnique: jest.fn(), findFirst: jest.fn(),
      findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
    },
    adopterDocument: {
      findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
    },
    adoptionContract: {
      findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn(),
    },
    interviewSlot: {
      findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
    },
    animalStatusHistory: { create: jest.fn() },
    notification: { create: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(),
  },
}));

jest.mock('../middlewares/upload', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const multer = require('multer');
  const m = multer({ storage: multer.memoryStorage() });
  return {
    uploadAnimalPhoto: m,
    uploadGalleryPhotos: m,
    uploadDocument: m,
    buildUploadUrl: jest.fn(() => 'http://localhost:3000/uploads/documents/test.pdf'),
    cleanupUpload: jest.fn(),
  };
});

jest.mock('../services/pdfService', () => ({
  generateContractPdf: jest.fn().mockResolvedValue('adoption-test.pdf'),
  generateSignedContractPdf: jest.fn().mockResolvedValue('adoption-test-signed.pdf'),
  buildContractUrl: jest.fn((f: string) => `http://localhost:3000/uploads/contracts/${f}`),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const prismaMock = require('../utils/prisma').default;

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// RFC 4122 compliant UUIDs (version 4, variant 8x) — required by z.string().uuid() in Zod v4

const ANIMAL_ID   = 'a1111111-1111-4111-8111-111111111111';
const APP_ID      = 'a2222222-2222-4222-8222-222222222222';
const USER_ID     = 'a3333333-3333-4333-8333-333333333333';
const CONTRACT_ID = 'a4444444-4444-4444-8444-444444444444';
const ADMIN_ID    = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const EXISTING_ID = 'a5555555-5555-4555-8555-555555555555';
const SLOT_ID     = 'a6666666-6666-4666-8666-666666666666';

const JWT_SECRET = 'test-secret-123';
const makeToken = (role: string, id: string) =>
  jwt.sign({ id, email: `${role.toLowerCase()}@test.com`, role }, JWT_SECRET);
const auth = (role: string, id?: string) => ({
  Authorization: `Bearer ${makeToken(role, id ?? (role === 'ADMIN' ? ADMIN_ID : USER_ID))}`,
});

const ANIMAL = {
  id: ANIMAL_ID, name: 'Luna', species: 'Perro', status: 'AVAILABLE',
  mainPhotoUrl: null,
};

const APPLICATION = {
  id: APP_ID, adopterId: USER_ID, animalId: ANIMAL_ID,
  status: 'RECEIVED', rejectionReason: null,
  createdAt: new Date('2026-05-01'), updatedAt: new Date('2026-05-01'),
  animal: { ...ANIMAL, estimatedBreed: null, energyLevel: null, spaceNeed: null, goodWithChildren: false, goodWithPets: false },
  adopter: { id: USER_ID, fullName: 'Ana Perez', email: 'ana@test.com', phone: null },
  documents: [], contract: null, interviewSlot: null,
};

const CONTRACT = {
  id: CONTRACT_ID, applicationId: APP_ID, animalId: ANIMAL_ID, adopterId: USER_ID,
  pdfUrl: 'http://localhost:3000/uploads/contracts/adoption-test.pdf',
  signedPdfUrl: null, signatureImageUrl: null,
  status: 'GENERATED', createdAt: new Date(), signedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.auditLog.create.mockResolvedValue({});
  prismaMock.notification.create.mockResolvedValue({});
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
});

// ─── CU-16: Solicitud de adopcion ─────────────────────────────────────────────

describe('POST /api/adoption-applications (CU-16)', () => {
  it('crea solicitud para animal Disponible', async () => {
    prismaMock.animal.findUnique.mockResolvedValue(ANIMAL);
    prismaMock.adoptionRequest.findFirst.mockResolvedValue(null);
    prismaMock.adoptionRequest.create.mockResolvedValue({
      ...APPLICATION,
      animal: { id: ANIMAL_ID, name: 'Luna', species: 'Perro' },
      adopter: { id: USER_ID, fullName: 'Ana Perez', email: 'ana@test.com' },
    });

    const res = await request(app)
      .post('/api/adoption-applications')
      .set(auth('ADOPTER'))
      .send({ animalId: ANIMAL_ID });

    expect(res.status).toBe(201);
    expect(res.body.application.status).toBe('RECEIVED');
  });

  it('rechaza si animal no esta Disponible', async () => {
    prismaMock.animal.findUnique.mockResolvedValue({ ...ANIMAL, status: 'QUARANTINE' });

    const res = await request(app)
      .post('/api/adoption-applications')
      .set(auth('ADOPTER'))
      .send({ animalId: ANIMAL_ID });

    expect(res.status).toBe(400);
  });

  it('rechaza si ya existe solicitud activa — devuelve existingRequestId', async () => {
    prismaMock.animal.findUnique.mockResolvedValue(ANIMAL);
    prismaMock.adoptionRequest.findFirst.mockResolvedValue({ id: EXISTING_ID });

    const res = await request(app)
      .post('/api/adoption-applications')
      .set(auth('ADOPTER'))
      .send({ animalId: ANIMAL_ID });

    expect(res.status).toBe(400);
    expect(res.body.existingRequestId).toBe(EXISTING_ID);
  });

  it('ADMIN no puede crear solicitudes', async () => {
    const res = await request(app)
      .post('/api/adoption-applications')
      .set(auth('ADMIN'))
      .send({ animalId: ANIMAL_ID });
    expect(res.status).toBe(403);
  });

  it('rechaza UUID invalido', async () => {
    const res = await request(app)
      .post('/api/adoption-applications')
      .set(auth('ADOPTER'))
      .send({ animalId: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });
});

// ─── CU-18: Tablero de seguimiento ────────────────────────────────────────────

describe('GET /api/adoption-applications (CU-18)', () => {
  it('ADOPTER solo ve sus propias solicitudes (filtro por adopterId)', async () => {
    prismaMock.adoptionRequest.findMany.mockResolvedValue([APPLICATION]);
    await request(app).get('/api/adoption-applications').set(auth('ADOPTER', USER_ID));
    const call = prismaMock.adoptionRequest.findMany.mock.calls[0][0];
    expect(call.where.adopterId).toBe(USER_ID);
  });

  it('ADMIN ve todas las solicitudes (sin filtro adopterId)', async () => {
    prismaMock.adoptionRequest.findMany.mockResolvedValue([APPLICATION]);
    await request(app).get('/api/adoption-applications').set(auth('ADMIN'));
    const call = prismaMock.adoptionRequest.findMany.mock.calls[0][0];
    expect(call.where.adopterId).toBeUndefined();
  });

  it('puede filtrar por status', async () => {
    prismaMock.adoptionRequest.findMany.mockResolvedValue([]);
    await request(app).get('/api/adoption-applications?status=APPROVED').set(auth('ADMIN'));
    const call = prismaMock.adoptionRequest.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('APPROVED');
  });
});

describe('PATCH /api/adoption-applications/:id/status (CU-18)', () => {
  const appWithAnimalAdopter = (status: string) => ({
    ...APPLICATION, status,
    animal: { id: ANIMAL_ID, name: 'Luna', status: 'AVAILABLE', species: 'Perro' },
    adopter: { id: USER_ID, fullName: 'Ana', email: 'ana@test.com' },
  });

  it('ADMIN puede avanzar estado RECEIVED a INTERVIEW', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue(appWithAnimalAdopter('RECEIVED'));
    prismaMock.adoptionRequest.update.mockResolvedValue({
      ...APPLICATION, status: 'INTERVIEW', documents: [], contract: null, interviewSlot: null,
    });

    const res = await request(app)
      .patch(`/api/adoption-applications/${APP_ID}/status`)
      .set(auth('ADMIN'))
      .send({ status: 'INTERVIEW' });

    expect(res.status).toBe(200);
  });

  it('rechaza transicion invalida RECEIVED a APPROVED', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue(appWithAnimalAdopter('RECEIVED'));

    const res = await request(app)
      .patch(`/api/adoption-applications/${APP_ID}/status`)
      .set(auth('ADMIN'))
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Transici/); // "Transición inválida de..."
  });

  it('requiere motivo al rechazar', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue(appWithAnimalAdopter('RECEIVED'));

    const res = await request(app)
      .patch(`/api/adoption-applications/${APP_ID}/status`)
      .set(auth('ADMIN'))
      .send({ status: 'REJECTED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rechazo|motivo/i);
  });

  it('requiere documentos completos para APPROVED', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue(appWithAnimalAdopter('VISIT'));
    prismaMock.adopterDocument.findMany.mockResolvedValue([]);

    const res = await request(app)
      .patch(`/api/adoption-applications/${APP_ID}/status`)
      .set(auth('ADMIN'))
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(400);
    expect(res.body.missing).toContain('ID_CARD');
  });

  it('genera contrato PDF al aprobar con documentos completos', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue(appWithAnimalAdopter('VISIT'));
    prismaMock.adopterDocument.findMany.mockResolvedValue([
      { documentType: 'ID_CARD' }, { documentType: 'ADDRESS_PROOF' },
    ]);
    prismaMock.adoptionRequest.update.mockResolvedValue({
      ...APPLICATION, status: 'APPROVED', documents: [], contract: null, interviewSlot: null,
    });
    prismaMock.adoptionContract.upsert.mockResolvedValue(CONTRACT);

    const res = await request(app)
      .patch(`/api/adoption-applications/${APP_ID}/status`)
      .set(auth('ADMIN'))
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(200);
    expect(prismaMock.adoptionContract.upsert).toHaveBeenCalled();
  });

  it('ADOPTER no puede cambiar estado', async () => {
    const res = await request(app)
      .patch(`/api/adoption-applications/${APP_ID}/status`)
      .set(auth('ADOPTER'))
      .send({ status: 'INTERVIEW' });
    expect(res.status).toBe(403);
  });
});

// ─── CU-17: Agenda de entrevistas ─────────────────────────────────────────────

describe('POST /api/interview-slots (CU-17)', () => {
  it('ADMIN puede crear un slot', async () => {
    prismaMock.interviewSlot.create.mockResolvedValue({
      id: SLOT_ID,
      startsAt: new Date('2026-06-01T10:00:00Z'),
      endsAt: new Date('2026-06-01T11:00:00Z'),
      status: 'available',
    });

    const res = await request(app)
      .post('/api/interview-slots')
      .set(auth('ADMIN'))
      .send({ startsAt: '2026-06-01T10:00:00.000Z', endsAt: '2026-06-01T11:00:00.000Z' });

    expect(res.status).toBe(201);
    expect(res.body.slot.status).toBe('available');
  });

  it('ADOPTER no puede crear slots', async () => {
    const res = await request(app)
      .post('/api/interview-slots')
      .set(auth('ADOPTER'))
      .send({ startsAt: '2026-06-01T10:00:00.000Z', endsAt: '2026-06-01T11:00:00.000Z' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/interview-slots/available (CU-17)', () => {
  it('devuelve slots disponibles', async () => {
    prismaMock.interviewSlot.findMany.mockResolvedValue([
      { id: SLOT_ID, startsAt: new Date('2026-06-01T10:00:00Z'), endsAt: new Date('2026-06-01T11:00:00Z'), status: 'available' },
    ]);

    const res = await request(app)
      .get('/api/interview-slots/available')
      .set(auth('ADOPTER'));

    expect(res.status).toBe(200);
    expect(res.body.slots).toHaveLength(1);
  });
});

describe('POST /api/adoption-applications/:id/schedule-interview (CU-17)', () => {
  it('reserva slot con bloqueo transaccional', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({ ...APPLICATION, status: 'RECEIVED' });

    prismaMock.$transaction.mockImplementation(async (fn: Function) => {
      const fakeTx = {
        interviewSlot: {
          findUnique: jest.fn().mockResolvedValue({ id: SLOT_ID, status: 'available' }),
          update: jest.fn().mockResolvedValue({ id: SLOT_ID, status: 'reserved', reservedByApplicationId: APP_ID }),
        },
        adoptionRequest: {
          update: jest.fn().mockResolvedValue({ ...APPLICATION, status: 'INTERVIEW' }),
        },
      };
      return fn(fakeTx);
    });

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/schedule-interview`)
      .set(auth('ADOPTER'))
      .send({ slotId: SLOT_ID });

    expect(res.status).toBe(200);
  });

  it('retorna 409 si slot ya esta reservado', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({ ...APPLICATION, status: 'RECEIVED' });

    prismaMock.$transaction.mockImplementation(async (fn: Function) => {
      const fakeTx = {
        interviewSlot: {
          findUnique: jest.fn().mockResolvedValue({ id: SLOT_ID, status: 'reserved' }),
        },
        adoptionRequest: { update: jest.fn() },
      };
      return fn(fakeTx);
    });

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/schedule-interview`)
      .set(auth('ADOPTER'))
      .send({ slotId: SLOT_ID });

    expect(res.status).toBe(409);
  });
});

// ─── CU-19: Documentos ────────────────────────────────────────────────────────

describe('POST /api/adoption-applications/:id/documents (CU-19)', () => {
  const appWithAdopterAnimal = {
    ...APPLICATION,
    adopter: { id: USER_ID, fullName: 'Ana', email: 'a@test.com' },
    animal: { id: ANIMAL_ID, name: 'Luna' },
  };

  it('ADOPTER sube documento via multipart/form-data', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue(appWithAdopterAnimal);
    prismaMock.adopterDocument.findFirst.mockResolvedValue(null);
    prismaMock.adopterDocument.create.mockResolvedValue({
      id: 'doc-1', documentType: 'ID_CARD', fileName: 'cedula.pdf',
      fileUrl: 'http://localhost:3000/uploads/documents/abc.pdf', version: 1,
    });

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/documents`)
      .set(auth('ADOPTER'))
      .field('documentType', 'ID_CARD')
      .attach('file', Buffer.from('fake pdf'), { filename: 'cedula.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.document.documentType).toBe('ID_CARD');
  });

  it('rechaza documentType invalido', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue(appWithAdopterAnimal);

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/documents`)
      .set(auth('ADOPTER'))
      .field('documentType', 'INVALID_TYPE')
      .attach('file', Buffer.from('content'), { filename: 'f.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
  });

  it('archiva version anterior y crea version nueva', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue(appWithAdopterAnimal);
    prismaMock.adopterDocument.findFirst.mockResolvedValue({ id: 'old-doc-id', version: 1, status: 'ACTIVE' });
    prismaMock.adopterDocument.update.mockResolvedValue({ id: 'old-doc-id', status: 'ARCHIVED' });
    prismaMock.adopterDocument.create.mockResolvedValue({
      id: 'doc-2', documentType: 'ID_CARD', fileName: 'cedula_v2.pdf', version: 2,
    });

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/documents`)
      .set(auth('ADOPTER'))
      .field('documentType', 'ID_CARD')
      .attach('file', Buffer.from('v2'), { filename: 'cedula_v2.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(prismaMock.adopterDocument.update).toHaveBeenCalledWith({
      where: { id: 'old-doc-id' }, data: { status: 'ARCHIVED' },
    });
    expect(res.body.document.version).toBe(2);
  });

  it('falla si no hay archivo adjunto', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue(appWithAdopterAnimal);

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/documents`)
      .set(auth('ADOPTER'))
      .field('documentType', 'ID_CARD');
    // No .attach() — no file

    expect(res.status).toBe(400);
  });
});

// ─── CU-20: Contrato y firma digital ──────────────────────────────────────────

describe('POST /api/adoption-applications/:id/contract/generate (CU-20)', () => {
  it('ADMIN genera contrato PDF para solicitud APPROVED', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({
      ...APPLICATION, status: 'APPROVED',
      animal: { ...ANIMAL },
      adopter: { fullName: 'Ana', email: 'a@test.com' },
    });
    prismaMock.adoptionContract.upsert.mockResolvedValue(CONTRACT);

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/contract/generate`)
      .set(auth('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.contract.pdfUrl).toContain('contracts');
  });

  it('no genera contrato para solicitud no aprobada', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({
      ...APPLICATION, status: 'INTERVIEW',
      animal: ANIMAL, adopter: { fullName: 'Ana', email: 'a@test.com' },
    });

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/contract/generate`)
      .set(auth('ADMIN'));

    expect(res.status).toBe(400);
  });
});

describe('POST /api/adoption-applications/:id/contract/sign (CU-20)', () => {
  it('adoptante firma y mascota cambia a ADOPTADO', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({
      ...APPLICATION, status: 'APPROVED',
      animal: { ...ANIMAL },
      adopter: { fullName: 'Ana', email: 'a@test.com' },
      contract: { ...CONTRACT },
    });
    prismaMock.adoptionContract.update.mockResolvedValue({
      ...CONTRACT, status: 'SIGNED', signedPdfUrl: 'http://x/signed.pdf',
    });
    prismaMock.animal.update.mockResolvedValue({ ...ANIMAL, status: 'ADOPTED' });
    prismaMock.animalStatusHistory.create.mockResolvedValue({});

    prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/contract/sign`)
      .set(auth('ADOPTER', USER_ID))
      .send({ signatureImageUrl: 'data:image/png;base64,iVBORw0KGgo=' });

    expect(res.status).toBe(200);
    expect(prismaMock.animal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ADOPTED' } })
    );
  });

  it('solo el adoptante puede firmar (no otro usuario)', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({
      ...APPLICATION, status: 'APPROVED',
      animal: ANIMAL,
      adopter: { fullName: 'Ana', email: 'a@test.com' },
      contract: CONTRACT,
    });

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/contract/sign`)
      .set(auth('ADMIN', ADMIN_ID)) // different user ID
      .send({ signatureImageUrl: 'data:image/png;base64,abc' });

    expect(res.status).toBe(403);
  });

  it('no se puede firmar si solicitud no esta APPROVED', async () => {
    prismaMock.adoptionRequest.findUnique.mockResolvedValue({
      ...APPLICATION, status: 'INTERVIEW',
      animal: ANIMAL,
      adopter: { fullName: 'Ana', email: 'a@test.com' },
      contract: null,
    });

    const res = await request(app)
      .post(`/api/adoption-applications/${APP_ID}/contract/sign`)
      .set(auth('ADOPTER', USER_ID))
      .send({ signatureImageUrl: 'data:image/png;base64,abc' });

    expect(res.status).toBe(400);
  });
});
