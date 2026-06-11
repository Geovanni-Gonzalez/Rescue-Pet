import request from 'supertest';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import app from '../app';

jest.mock('../utils/db', () => ({
  __esModule: true,
  default: {
    animal: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    animalGallery: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    animalStatusHistory: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
    animalRescueLocationHistory: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
    clinicalRecord: { count: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
    clinicalEntry: { findMany: jest.fn(), delete: jest.fn() },
    vaccine: { findMany: jest.fn(), delete: jest.fn() },
    compatibilityScore: { findMany: jest.fn(), delete: jest.fn() },
    adoptionRequest: { findFirst: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
    adopterDocument: { findMany: jest.fn(), delete: jest.fn() },
    adoptionContract: { findMany: jest.fn(), delete: jest.fn() },
    interviewSlot: { findMany: jest.fn(), delete: jest.fn() },
    operationalTask: { findMany: jest.fn(), delete: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(),
  },
}));

jest.mock('../services/qrService', () => ({
  generatePetQrDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,fakeqrdata'),
}));

// Multer uses disk storage; in tests override with memoryStorage to avoid actual FS writes
jest.mock('../middlewares/upload', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const multer = require('multer');
  const m = multer({ storage: multer.memoryStorage() });
  return {
    uploadAnimalPhoto: m,
    uploadGalleryPhotos: m,
    uploadDocument: m,
    buildUploadUrl: jest.fn((sub: string, name: string) => `http://localhost:3000/uploads/${sub}/${name}`),
    cleanupUpload: jest.fn(),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dbMock = require('../utils/db').default;

const JWT_SECRET = 'test-secret-123';
const makeToken = (role: string, id = 'user-1') =>
  jwt.sign({ id, email: `${role.toLowerCase()}@test.com`, role }, JWT_SECRET);
const auth = (role: string) => ({ Authorization: `Bearer ${makeToken(role)}` });

// A minimal 1x1 PNG buffer
const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x00, 0x00, 0x00, 0x00, 0x3a, 0x7e, 0x9b, 0x55,
]);

const ANIMAL_FIXTURE = {
  id: 'animal-1',
  name: 'Max',
  species: 'Perro',
  status: 'QUARANTINE',
  mainPhotoUrl: 'http://localhost:3000/uploads/animals/photo.png',
  rescueLocationText: null,
  rescueLatitude: null,
  rescueLongitude: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  dbMock.auditLog.create.mockResolvedValue({});
  dbMock.$transaction.mockImplementation(async (fn: Function) => fn(dbMock));
});

// ─── GET /api/animals ─────────────────────────────────────────────────────────

describe('GET /api/animals', () => {
  it('ADMIN ve todos los animales', async () => {
    dbMock.animal.findMany.mockResolvedValue([ANIMAL_FIXTURE]);
    const res = await request(app).get('/api/animals').set(auth('ADMIN'));
    expect(res.status).toBe(200);
    expect(res.body.animals).toHaveLength(1);
  });

  it('ADOPTER solo ve animales AVAILABLE', async () => {
    dbMock.animal.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/animals').set(auth('ADOPTER'));
    expect(res.status).toBe(200);
    const call = dbMock.animal.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('AVAILABLE');
  });

  it('requiere autenticación', async () => {
    const res = await request(app).get('/api/animals');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/animals/:id ─────────────────────────────────────────────────────

describe('GET /api/animals/:id', () => {
  it('devuelve animal por id', async () => {
    dbMock.animal.findUnique.mockResolvedValue({ ...ANIMAL_FIXTURE, gallery: [] });
    const res = await request(app).get('/api/animals/animal-1').set(auth('ADMIN'));
    expect(res.status).toBe(200);
    expect(res.body.animal.id).toBe('animal-1');
  });

  it('retorna 404 si no existe', async () => {
    dbMock.animal.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/animals/nope').set(auth('ADMIN'));
    expect(res.status).toBe(404);
  });

  it('ADOPTER no puede ver animales no AVAILABLE', async () => {
    dbMock.animal.findUnique.mockResolvedValue({ ...ANIMAL_FIXTURE, gallery: [], status: 'QUARANTINE' });
    const res = await request(app).get('/api/animals/animal-1').set(auth('ADOPTER'));
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/animals ────────────────────────────────────────────────────────

describe('POST /api/animals', () => {
  it('VOLUNTEER crea animal con foto', async () => {
    dbMock.animal.create.mockResolvedValue({ ...ANIMAL_FIXTURE, id: 'new-1' });
    dbMock.animal.update.mockResolvedValue({ ...ANIMAL_FIXTURE, id: 'new-1', qrUrl: 'data:...' });

    const res = await request(app)
      .post('/api/animals')
      .set(auth('VOLUNTEER'))
      .field('name', 'Max')
      .field('species', 'Perro')
      .attach('mainPhoto', PNG_BUFFER, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('retorna 400 si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/api/animals')
      .set(auth('ADMIN'))
      .send({ name: 'Max' }); // missing species and photo

    expect(res.status).toBe(400);
  });

  it('ADOPTER no puede crear animales', async () => {
    const res = await request(app)
      .post('/api/animals')
      .set(auth('ADOPTER'))
      .field('name', 'Max')
      .field('species', 'Perro');
    expect(res.status).toBe(403);
  });
});

// ─── DELETE /api/animals ─────────────────────────────────────────────────────

describe('DELETE /api/animals', () => {
  it('ADMIN elimina todos los animales y registros asociados', async () => {
    dbMock.animal.findMany.mockResolvedValue([{ ...ANIMAL_FIXTURE, mainPhotoUrl: 'http://localhost:3000/uploads/animals/photo.png' }]);
    dbMock.animalGallery.findMany.mockResolvedValue([{ id: 'img-1', animalId: 'animal-1', fileUrl: 'http://localhost:3000/uploads/gallery/a.png' }]);
    dbMock.clinicalRecord.findMany.mockResolvedValue([{ id: 'record-1', animalId: 'animal-1' }]);
    dbMock.clinicalEntry.findMany.mockResolvedValue([{ id: 'entry-1', clinicalRecordId: 'record-1' }]);
    dbMock.vaccine.findMany.mockResolvedValueOnce([{ id: 'vaccine-1', animalId: 'animal-1' }]).mockResolvedValueOnce([]);
    dbMock.compatibilityScore.findMany.mockResolvedValue([{ id: 'score-1', animalId: 'animal-1' }]);
    dbMock.adoptionRequest.findMany.mockResolvedValue([{ id: 'request-1', animalId: 'animal-1' }]);
    dbMock.adopterDocument.findMany.mockResolvedValue([{ id: 'doc-1', applicationId: 'request-1', fileUrl: 'http://localhost:3000/uploads/documents/doc.pdf' }]);
    dbMock.adoptionContract.findMany.mockResolvedValue([{ id: 'contract-1', applicationId: 'request-1', pdfUrl: 'http://localhost:3000/uploads/contracts/c.pdf', signedPdfUrl: null }]);
    dbMock.interviewSlot.findMany.mockResolvedValue([{ id: 'slot-1', reservedByApplicationId: 'request-1' }]);
    dbMock.animalStatusHistory.findMany.mockResolvedValue([{ id: 'status-1', animalId: 'animal-1' }]);
    dbMock.animalRescueLocationHistory.findMany.mockResolvedValue([{ id: 'loc-1', animalId: 'animal-1' }]);
    dbMock.operationalTask.findMany.mockResolvedValue([{ id: 'task-1', animalId: 'animal-1' }]);

    const res = await request(app).delete('/api/animals').set(auth('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.deleted.animals).toBe(1);
    expect(dbMock.animal.delete).toHaveBeenCalledWith({ where: { id: 'animal-1' } });
    expect(dbMock.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'DELETE_ALL_ANIMALS', entityId: 'ALL' }),
    }));
  });

  it('rechaza borrado masivo para VOLUNTEER', async () => {
    const res = await request(app).delete('/api/animals').set(auth('VOLUNTEER'));
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/animals/:id/status ────────────────────────────────────────────

describe('DELETE /api/animals/:id', () => {
  it('ADMIN elimina un animal y sus registros asociados', async () => {
    dbMock.animal.findUnique.mockResolvedValue({ ...ANIMAL_FIXTURE, mainPhotoUrl: 'http://localhost:3000/uploads/animals/photo.png' });
    dbMock.animalGallery.findMany.mockResolvedValue([]);
    dbMock.clinicalRecord.findMany.mockResolvedValue([]);
    dbMock.adoptionRequest.findMany.mockResolvedValue([]);
    dbMock.animalStatusHistory.findMany.mockResolvedValue([]);
    dbMock.animalRescueLocationHistory.findMany.mockResolvedValue([]);
    dbMock.vaccine.findMany.mockResolvedValue([]);
    dbMock.compatibilityScore.findMany.mockResolvedValue([]);
    dbMock.operationalTask.findMany.mockResolvedValue([]);

    const res = await request(app).delete('/api/animals/animal-1').set(auth('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.deleted.animal).toBe(1);
    expect(dbMock.animal.delete).toHaveBeenCalledWith({ where: { id: 'animal-1' } });
    expect(dbMock.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'DELETE_ANIMAL', entityId: 'animal-1' }),
    }));
  });

  it('retorna 404 si el animal no existe', async () => {
    dbMock.animal.findUnique.mockResolvedValue(null);

    const res = await request(app).delete('/api/animals/nope').set(auth('ADMIN'));

    expect(res.status).toBe(404);
    expect(dbMock.animal.delete).not.toHaveBeenCalled();
  });

  it('rechaza borrado individual para VOLUNTEER', async () => {
    const res = await request(app).delete('/api/animals/animal-1').set(auth('VOLUNTEER'));

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/animals/:id/status', () => {
  it('transición válida QUARANTINE → TREATMENT', async () => {
    dbMock.animal.findUnique.mockResolvedValue(ANIMAL_FIXTURE);
    dbMock.animal.update.mockResolvedValue({ ...ANIMAL_FIXTURE, status: 'TREATMENT' });
    dbMock.animalStatusHistory.create = jest.fn().mockResolvedValue({});
    dbMock.$transaction.mockImplementation(async (fn: Function) => fn(dbMock));

    const res = await request(app)
      .patch('/api/animals/animal-1/status')
      .set(auth('ADMIN'))
      .send({ status: 'TREATMENT', reason: 'Infección' });

    expect(res.status).toBe(200);
    expect(res.body.animal.status).toBe('TREATMENT');
  });

  it('rechaza transición inválida QUARANTINE → ADOPTED', async () => {
    dbMock.animal.findUnique.mockResolvedValue(ANIMAL_FIXTURE);

    const res = await request(app)
      .patch('/api/animals/animal-1/status')
      .set(auth('ADMIN'))
      .send({ status: 'ADOPTED' });

    expect(res.status).toBe(400);
  });

  it('rechaza cambio en estado terminal DECEASED', async () => {
    dbMock.animal.findUnique.mockResolvedValue({ ...ANIMAL_FIXTURE, status: 'DECEASED' });

    const res = await request(app)
      .patch('/api/animals/animal-1/status')
      .set(auth('ADMIN'))
      .send({ status: 'AVAILABLE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/DECEASED/i);
  });

  it('VOLUNTEER no puede cambiar estado', async () => {
    const res = await request(app)
      .patch('/api/animals/animal-1/status')
      .set(auth('VOLUNTEER'))
      .send({ status: 'AVAILABLE' });
    expect(res.status).toBe(403);
  });

  it('requiere historial clínico para pasar a AVAILABLE', async () => {
    dbMock.animal.findUnique.mockResolvedValue(ANIMAL_FIXTURE);
    dbMock.clinicalRecord.count.mockResolvedValue(0);

    const res = await request(app)
      .patch('/api/animals/animal-1/status')
      .set(auth('ADMIN'))
      .send({ status: 'AVAILABLE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/historial clínico/i);
  });
});

// ─── PUT /api/animals/:id/rescue-location ─────────────────────────────────────

describe('PUT /api/animals/:id/rescue-location', () => {
  it('actualiza localización y archiva la anterior', async () => {
    dbMock.animal.findUnique.mockResolvedValue({
      ...ANIMAL_FIXTURE,
      rescueLocationText: 'Calle 5',
      rescueLatitude: 9.9,
    });
    dbMock.animalRescueLocationHistory.create.mockResolvedValue({});
    dbMock.animal.update.mockResolvedValue(ANIMAL_FIXTURE);

    const res = await request(app)
      .put('/api/animals/animal-1/rescue-location')
      .set(auth('ADMIN'))
      .send({ rescueLocationText: 'Nueva dirección' });

    expect(res.status).toBe(200);
    expect(dbMock.animalRescueLocationHistory.create).toHaveBeenCalled();
  });

  it('retorna 400 si no hay ubicación', async () => {
    dbMock.animal.findUnique.mockResolvedValue(ANIMAL_FIXTURE);

    const res = await request(app)
      .put('/api/animals/animal-1/rescue-location')
      .set(auth('ADMIN'))
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── GET /api/animals/:id/location-history ────────────────────────────────────

describe('GET /api/animals/:id/location-history', () => {
  it('devuelve historial de localizaciones', async () => {
    dbMock.animalRescueLocationHistory.findMany.mockResolvedValue([
      { id: 'loc-1', locationText: 'Antigua dirección', createdAt: new Date() },
    ]);

    const res = await request(app)
      .get('/api/animals/animal-1/location-history')
      .set(auth('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
  });
});

// ─── POST /api/animals/:id/gallery ────────────────────────────────────────────

describe('POST /api/animals/:id/gallery', () => {
  it('sube múltiples imágenes', async () => {
    dbMock.animal.findUnique.mockResolvedValue(ANIMAL_FIXTURE);
    dbMock.animalGallery.create
      .mockResolvedValueOnce({ id: 'img-1', fileUrl: 'http://localhost:3000/uploads/gallery/a.png' })
      .mockResolvedValueOnce({ id: 'img-2', fileUrl: 'http://localhost:3000/uploads/gallery/b.png' });

    const res = await request(app)
      .post('/api/animals/animal-1/gallery')
      .set(auth('ADMIN'))
      .attach('images', PNG_BUFFER, { filename: 'a.png', contentType: 'image/png' })
      .attach('images', PNG_BUFFER, { filename: 'b.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.images).toHaveLength(2);
  });

  it('retorna 400 sin imágenes', async () => {
    dbMock.animal.findUnique.mockResolvedValue(ANIMAL_FIXTURE);

    const res = await request(app)
      .post('/api/animals/animal-1/gallery')
      .set(auth('ADMIN'));

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/animals/:id/gallery/:imageId ─────────────────────────────────

describe('DELETE /api/animals/:id/gallery/:imageId', () => {
  it('elimina imagen secundaria', async () => {
    dbMock.animalGallery.findUnique.mockResolvedValue({
      id: 'img-1',
      animalId: 'animal-1',
      isMain: false,
    });
    dbMock.animalGallery.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/animals/animal-1/gallery/img-1')
      .set(auth('ADMIN'));

    expect(res.status).toBe(200);
  });

  it('no permite eliminar foto principal', async () => {
    dbMock.animalGallery.findUnique.mockResolvedValue({
      id: 'main-img',
      animalId: 'animal-1',
      isMain: true,
    });

    const res = await request(app)
      .delete('/api/animals/animal-1/gallery/main-img')
      .set(auth('ADMIN'));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/principal/i);
  });
});

// ─── POST /api/animals/:id/qr/regenerate ─────────────────────────────────────

describe('POST /api/animals/:id/qr/regenerate', () => {
  it('genera QR y lo guarda', async () => {
    dbMock.animal.findUnique.mockResolvedValue(ANIMAL_FIXTURE);
    dbMock.animal.update.mockResolvedValue({ ...ANIMAL_FIXTURE, qrUrl: 'data:image/png;base64,fakeqrdata' });

    const res = await request(app)
      .post('/api/animals/animal-1/qr/regenerate')
      .set(auth('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.qrUrl).toBeDefined();
  });
});

// Cleanup test uploads directory after all tests
afterAll(() => {
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (fs.existsSync(uploadsDir)) {
    // Only clean test files, not the directory structure
    ['animals', 'gallery'].forEach((subdir) => {
      const dir = path.join(uploadsDir, subdir);
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((file) => {
          try { fs.unlinkSync(path.join(dir, file)); } catch { /* ignore */ }
        });
      }
    });
  }
});
