import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    animal: { findMany: jest.fn(), findUnique: jest.fn() },
    compatibilityTest: { findUnique: jest.fn(), upsert: jest.fn() },
    compatibilityScore: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const prismaMock = require('../utils/prisma').default;

const JWT_SECRET = 'test-secret-123';
const makeToken = (role: string, id = 'user-1') =>
  jwt.sign({ id, email: `${role.toLowerCase()}@test.com`, role }, JWT_SECRET);
const auth = (role: string, id?: string) => ({ Authorization: `Bearer ${makeToken(role, id)}` });

const TEST_PAYLOAD = {
  housingType: 'HOUSE',
  hasYard: true,
  childrenCount: 0,
  hasOtherPets: false,
  dailyAvailableTime: 3,
  allergies: '',
  experienceLevel: 'BEGINNER',
};

const ANIMAL_FIXTURE = {
  id: 'animal-1',
  name: 'Luna',
  species: 'Perro',
  status: 'AVAILABLE',
  mainPhotoUrl: null,
  estimatedAge: 12,
  estimatedBreed: 'Mestizo',
  size: 'MEDIUM',
  energyLevel: 'MEDIUM',
  spaceNeed: 'MEDIUM',
  goodWithChildren: true,
  goodWithPets: true,
  createdAt: new Date('2024-01-01'),
};

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.auditLog.create.mockResolvedValue({});
});

// ─── GET /api/catalog/animals ─────────────────────────────────────────────────

describe('GET /api/catalog/animals', () => {
  it('devuelve solo mascotas AVAILABLE y requiere auth', async () => {
    prismaMock.animal.findMany.mockResolvedValue([ANIMAL_FIXTURE]);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/catalog/animals').set(auth('ADOPTER'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.animals).toHaveLength(1);
    // Verify the Prisma query filtered by AVAILABLE
    const call = prismaMock.animal.findMany.mock.calls[0][0];
    expect((call.where as Record<string, unknown>)['status']).toBe('AVAILABLE');
  });

  it('filtra por especie cuando se pasa query param', async () => {
    prismaMock.animal.findMany.mockResolvedValue([]);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([]);

    await request(app).get('/api/catalog/animals?species=Gato').set(auth('ADOPTER'));

    const call = prismaMock.animal.findMany.mock.calls[0][0];
    expect((call.where as Record<string, unknown>)['species']).toBe('Gato');
  });

  it('filtra por tamaño', async () => {
    prismaMock.animal.findMany.mockResolvedValue([]);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([]);

    await request(app).get('/api/catalog/animals?size=SMALL').set(auth('ADOPTER'));

    const call = prismaMock.animal.findMany.mock.calls[0][0];
    expect((call.where as Record<string, unknown>)['size']).toBe('SMALL');
  });

  it('filtra por rango de edad', async () => {
    prismaMock.animal.findMany.mockResolvedValue([]);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([]);

    await request(app).get('/api/catalog/animals?minAge=6&maxAge=24').set(auth('ADOPTER'));

    const call = prismaMock.animal.findMany.mock.calls[0][0];
    const ageFilter = (call.where as Record<string, unknown>)['estimatedAge'] as Record<string, number>;
    expect(ageFilter['gte']).toBe(6);
    expect(ageFilter['lte']).toBe(24);
  });

  it('adjunta puntaje de compatibilidad si existe y ordena desc', async () => {
    const animal2 = { ...ANIMAL_FIXTURE, id: 'animal-2', name: 'Toby' };
    prismaMock.animal.findMany.mockResolvedValue([ANIMAL_FIXTURE, animal2]);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([
      { animalId: 'animal-1', scorePercentage: 80, explanation: 'Buen espacio.' },
      { animalId: 'animal-2', scorePercentage: 45, explanation: 'Espacio limitado.' },
    ]);

    const res = await request(app).get('/api/catalog/animals').set(auth('ADOPTER'));

    expect(res.status).toBe(200);
    expect(res.body.sortedByCompatibility).toBe(true);
    expect(res.body.animals[0].compatibilityScore).toBe(80);
    expect(res.body.animals[0].compatibilityExplanation).toBe('Buen espacio.');
    expect(res.body.animals[1].compatibilityScore).toBe(45);
  });

  it('retorna sortedByCompatibility=false si no hay scores', async () => {
    prismaMock.animal.findMany.mockResolvedValue([ANIMAL_FIXTURE]);
    prismaMock.compatibilityScore.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/catalog/animals').set(auth('ADOPTER'));

    expect(res.body.sortedByCompatibility).toBe(false);
    expect(res.body.animals[0].compatibilityScore).toBeNull();
  });

  it('requiere autenticación', async () => {
    const res = await request(app).get('/api/catalog/animals');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/adopters/me/compatibility-test ──────────────────────────────────

describe('GET /api/adopters/me/compatibility-test', () => {
  it('devuelve el test del adoptante', async () => {
    prismaMock.compatibilityTest.findUnique.mockResolvedValue({ ...TEST_PAYLOAD, adopterId: 'user-1' });

    const res = await request(app).get('/api/adopters/me/compatibility-test').set(auth('ADOPTER'));

    expect(res.status).toBe(200);
    expect(res.body.test.housingType).toBe('HOUSE');
  });

  it('devuelve null si no hay test previo', async () => {
    prismaMock.compatibilityTest.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/adopters/me/compatibility-test').set(auth('ADOPTER'));

    expect(res.status).toBe(200);
    expect(res.body.test).toBeNull();
  });

  it('VETERINARIAN no puede acceder', async () => {
    const res = await request(app).get('/api/adopters/me/compatibility-test').set(auth('VETERINARIAN'));
    expect(res.status).toBe(403);
  });
});

// ─── PUT /api/adopters/me/compatibility-test ──────────────────────────────────

describe('PUT /api/adopters/me/compatibility-test', () => {
  it('guarda el test y recalcula para todos los animales disponibles', async () => {
    prismaMock.compatibilityTest.upsert.mockResolvedValue({ ...TEST_PAYLOAD, adopterId: 'user-1', id: 'test-1' });
    prismaMock.animal.findMany.mockResolvedValue([ANIMAL_FIXTURE]);
    prismaMock.compatibilityScore.upsert.mockResolvedValue({});

    const res = await request(app)
      .put('/api/adopters/me/compatibility-test')
      .set(auth('ADOPTER'))
      .send(TEST_PAYLOAD);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prismaMock.compatibilityScore.upsert).toHaveBeenCalledTimes(1);
  });

  it('rechaza body inválido con 400', async () => {
    const res = await request(app)
      .put('/api/adopters/me/compatibility-test')
      .set(auth('ADOPTER'))
      .send({ housingType: 'HOUSE' }); // faltan campos

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('ADMIN no puede usar este endpoint', async () => {
    const res = await request(app)
      .put('/api/adopters/me/compatibility-test')
      .set(auth('ADMIN'))
      .send(TEST_PAYLOAD);
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/adopters/me/compatibility/recalculate ─────────────────────────

describe('POST /api/adopters/me/compatibility/recalculate', () => {
  it('recalcula usando test guardado', async () => {
    prismaMock.compatibilityTest.findUnique.mockResolvedValue({ ...TEST_PAYLOAD, adopterId: 'user-1' });
    prismaMock.animal.findMany.mockResolvedValue([ANIMAL_FIXTURE]);
    prismaMock.compatibilityScore.upsert.mockResolvedValue({});

    const res = await request(app)
      .post('/api/adopters/me/compatibility/recalculate')
      .set(auth('ADOPTER'));

    expect(res.status).toBe(200);
    expect(res.body.recalculated).toBe(1);
  });

  it('retorna 400 si no hay test guardado', async () => {
    prismaMock.compatibilityTest.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/adopters/me/compatibility/recalculate')
      .set(auth('ADOPTER'));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── Algorithm unit-level tests (via PUT endpoint) ────────────────────────────

describe('Algoritmo de compatibilidad', () => {
  const setup = (animalOverride: Partial<typeof ANIMAL_FIXTURE>) => {
    prismaMock.compatibilityTest.upsert.mockImplementation(({ create }: { create: unknown }) =>
      Promise.resolve(create)
    );
    prismaMock.animal.findMany.mockResolvedValue([{ ...ANIMAL_FIXTURE, ...animalOverride }]);
    prismaMock.compatibilityScore.upsert.mockImplementation(
      ({ update }: { update: { scorePercentage: number; explanation: string } }) =>
        Promise.resolve(update)
    );
  };

  it('animal con spaceNeed=LARGE y adoptante sin patio baja el score', async () => {
    setup({ spaceNeed: 'LARGE' });

    const payload = { ...TEST_PAYLOAD, hasYard: false, housingType: 'APARTMENT' };

    await request(app).put('/api/adopters/me/compatibility-test').set(auth('ADOPTER')).send(payload);

    const upsertCall = prismaMock.compatibilityScore.upsert.mock.calls[0][0];
    expect(upsertCall.update.scorePercentage).toBeLessThan(65);
  });

  it('animal compatible con niños sube el score cuando hay niños en casa', async () => {
    setup({ goodWithChildren: true });

    const payload = { ...TEST_PAYLOAD, childrenCount: 2 };

    await request(app).put('/api/adopters/me/compatibility-test').set(auth('ADOPTER')).send(payload);

    const upsertCall = prismaMock.compatibilityScore.upsert.mock.calls[0][0];
    expect(upsertCall.update.scorePercentage).toBeGreaterThan(50);
  });

  it('alergias penalizan el score', async () => {
    setup({});

    const payloadSin = { ...TEST_PAYLOAD, allergies: '' };
    const payloadCon = { ...TEST_PAYLOAD, allergies: 'Pelo de gato' };

    await request(app).put('/api/adopters/me/compatibility-test').set(auth('ADOPTER')).send(payloadSin);
    const scoreSin = prismaMock.compatibilityScore.upsert.mock.calls[0][0].update.scorePercentage;

    jest.clearAllMocks();
    prismaMock.auditLog.create.mockResolvedValue({});
    setup({});
    prismaMock.compatibilityTest.upsert.mockImplementation(({ create }: { create: unknown }) =>
      Promise.resolve(create)
    );

    await request(app).put('/api/adopters/me/compatibility-test').set(auth('ADOPTER')).send(payloadCon);
    const scoreCon = prismaMock.compatibilityScore.upsert.mock.calls[0][0].update.scorePercentage;

    expect(scoreSin).toBeGreaterThan(scoreCon);
  });

  it('el score nunca sale del rango 0-100', async () => {
    // Worst-case: all negative factors
    setup({ spaceNeed: 'LARGE', goodWithChildren: false, goodWithPets: false, energyLevel: 'HIGH' });

    const payload = {
      ...TEST_PAYLOAD,
      hasYard: false,
      housingType: 'APARTMENT',
      childrenCount: 3,
      hasOtherPets: true,
      dailyAvailableTime: 0,
      allergies: 'Pelo',
      experienceLevel: 'NONE',
    };

    await request(app).put('/api/adopters/me/compatibility-test').set(auth('ADOPTER')).send(payload);

    const score = prismaMock.compatibilityScore.upsert.mock.calls[0][0].update.scorePercentage;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
