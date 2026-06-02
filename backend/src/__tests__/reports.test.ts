import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    adoptionRequest: { findMany: jest.fn() },
    animal: { findMany: jest.fn() },
    compatibilityScore: { findMany: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    user: { findMany: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const prismaMock = require('../utils/prisma').default;

const adminToken = jwt.sign({ id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' }, 'test-secret-123');
const adopterToken = jwt.sign({ id: 'user-1', email: 'user@test.com', role: 'ADOPTER' }, 'test-secret-123');

beforeEach(() => jest.clearAllMocks());

// ─── Adoption Report ─────────────────────────────────────────────────────────

describe('GET /api/reports/adoptions', () => {
  const mockApps = [
    {
      id: 'a1', status: 'APPROVED', updatedAt: new Date('2025-06-01'), adopterId: 'u1', animalId: 'an1',
      animal: { id: 'an1', name: 'Rex', species: 'Perro' },
      adopter: { id: 'u1', fullName: 'Juan', email: 'j@x.com' },
    },
    {
      id: 'a2', status: 'REJECTED', updatedAt: new Date('2025-06-10'), adopterId: 'u2', animalId: 'an2',
      animal: { id: 'an2', name: 'Mia', species: 'Gato' },
      adopter: { id: 'u2', fullName: 'Ana', email: 'a@x.com' },
    },
  ];

  it('retorna reporte con resumen y datos enriquecidos con afinidad', async () => {
    prismaMock.adoptionRequest.findMany.mockResolvedValue(mockApps);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([
      { adopterId: 'u1', animalId: 'an1', scorePercentage: 87.5 },
    ]);

    const res = await request(app).get('/api/reports/adoptions').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.total).toBe(2);
    expect(res.body.summary.approved).toBe(1);
    expect(res.body.summary.rejected).toBe(1);
    expect(res.body.applications[0].compatibilityScore).toBe(87.5);
    expect(res.body.applications[1].compatibilityScore).toBeNull();
  });

  it('filtra por especie', async () => {
    prismaMock.adoptionRequest.findMany.mockResolvedValue(mockApps);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/reports/adoptions?species=Gato').set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].animal.name).toBe('Mia');
  });

  it('filtra por rango de fechas', async () => {
    prismaMock.adoptionRequest.findMany.mockResolvedValue([]);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/reports/adoptions?from=2025-06-01&to=2025-06-30')
      .set('Authorization', `Bearer ${adminToken}`);

    const call = prismaMock.adoptionRequest.findMany.mock.calls[0][0];
    expect(call.where.updatedAt).toBeDefined();
    expect(call.where.updatedAt.gte).toEqual(new Date('2025-06-01'));
  });

  it('filtra por estado específico', async () => {
    prismaMock.adoptionRequest.findMany.mockResolvedValue([]);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/reports/adoptions?status=APPROVED')
      .set('Authorization', `Bearer ${adminToken}`);

    const call = prismaMock.adoptionRequest.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('APPROVED');
  });

  it('retorna 403 para no-ADMIN', async () => {
    const res = await request(app).get('/api/reports/adoptions').set('Authorization', `Bearer ${adopterToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Health Report ───────────────────────────────────────────────────────────

describe('GET /api/reports/health', () => {
  const mockAnimals = [
    {
      id: 'an1', name: 'Rex', species: 'Perro', status: 'TREATMENT',
      vaccines: [{ id: 'v1', vaccineType: 'Rabia', status: 'PENDING', nextDueAt: new Date() }],
      clinicalRecord: { entries: [{ diagnosis: 'Dermatitis', treatment: 'Crema', datetime: new Date() }] },
    },
    {
      id: 'an2', name: 'Luna', species: 'Gato', status: 'AVAILABLE',
      vaccines: [],
      clinicalRecord: null,
    },
  ];

  it('retorna reporte de salud con resumen', async () => {
    prismaMock.animal.findMany.mockResolvedValue(mockAnimals);

    const res = await request(app).get('/api/reports/health').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.totalAnimals).toBe(2);
    expect(res.body.summary.inTreatment).toBe(1);
    expect(res.body.summary.withPendingVaccines).toBe(1);
    expect(res.body.summary.totalVaccinesPending).toBe(1);
  });

  it('filtra por tratamiento activo', async () => {
    prismaMock.animal.findMany.mockResolvedValue([mockAnimals[0]]);

    await request(app)
      .get('/api/reports/health?treatmentActive=true')
      .set('Authorization', `Bearer ${adminToken}`);

    const call = prismaMock.animal.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('TREATMENT');
  });

  it('filtra solo animales con vacunas pendientes', async () => {
    prismaMock.animal.findMany.mockResolvedValue(mockAnimals);

    const res = await request(app)
      .get('/api/reports/health?vaccinePending=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.animals).toHaveLength(1);
    expect(res.body.animals[0].name).toBe('Rex');
  });

  it('retorna 403 para no-ADMIN', async () => {
    const res = await request(app).get('/api/reports/health').set('Authorization', `Bearer ${adopterToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Species List ────────────────────────────────────────────────────────────

describe('GET /api/reports/species', () => {
  it('retorna lista de especies distintas', async () => {
    prismaMock.animal.findMany.mockResolvedValue([{ species: 'Gato' }, { species: 'Perro' }]);

    const res = await request(app).get('/api/reports/species').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.species).toEqual(['Gato', 'Perro']);
  });
});

// ─── Export — blocks when no data ────────────────────────────────────────────

describe('Export endpoints block when no data', () => {
  beforeEach(() => {
    prismaMock.adoptionRequest.findMany.mockResolvedValue([]);
    prismaMock.animal.findMany.mockResolvedValue([]);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([]);
  });

  it('GET /api/reports/adoptions/export/pdf retorna 400 sin datos', async () => {
    const res = await request(app).get('/api/reports/adoptions/export/pdf').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No hay datos');
  });

  it('GET /api/reports/adoptions/export/csv retorna 400 sin datos', async () => {
    const res = await request(app).get('/api/reports/adoptions/export/csv').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('GET /api/reports/health/export/pdf retorna 400 sin datos', async () => {
    const res = await request(app).get('/api/reports/health/export/pdf').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('GET /api/reports/health/export/csv retorna 400 sin datos', async () => {
    const res = await request(app).get('/api/reports/health/export/csv').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});

// ─── Export — produces output when data exists ───────────────────────────────

describe('Export endpoints produce output with data', () => {
  const mockApps = [
    {
      id: 'a1', status: 'APPROVED', updatedAt: new Date(), adopterId: 'u1', animalId: 'an1',
      animal: { id: 'an1', name: 'Rex', species: 'Perro' },
      adopter: { id: 'u1', fullName: 'Juan', email: 'j@x.com' },
    },
  ];

  const mockAnimals = [
    {
      id: 'an1', name: 'Rex', species: 'Perro', status: 'TREATMENT',
      vaccines: [{ id: 'v1', vaccineType: 'Rabia', status: 'PENDING', nextDueAt: new Date() }],
      clinicalRecord: { entries: [{ diagnosis: 'Tos', treatment: 'Antibiótico', datetime: new Date() }] },
    },
  ];

  it('GET /api/reports/adoptions/export/csv retorna CSV con BOM', async () => {
    prismaMock.adoptionRequest.findMany.mockResolvedValue(mockApps);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/reports/adoptions/export/csv').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Animal');
    expect(res.text).toContain('Rex');
  });

  it('GET /api/reports/health/export/csv retorna CSV', async () => {
    prismaMock.animal.findMany.mockResolvedValue(mockAnimals);

    const res = await request(app).get('/api/reports/health/export/csv').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Rex');
    expect(res.text).toContain('Tos');
  });

  it('GET /api/reports/adoptions/export/pdf retorna PDF', async () => {
    prismaMock.adoptionRequest.findMany.mockResolvedValue(mockApps);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/reports/adoptions/export/pdf')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    // PDF starts with %PDF
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });

  it('GET /api/reports/health/export/pdf retorna PDF', async () => {
    prismaMock.animal.findMany.mockResolvedValue(mockAnimals);

    const res = await request(app)
      .get('/api/reports/health/export/pdf')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });
});
