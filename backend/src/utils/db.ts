import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger';

type Row = Record<string, any>;
type Db = Record<ModelName, Row[]>;

type ModelName =
  | 'user'
  | 'animal'
  | 'animalGallery'
  | 'animalStatusHistory'
  | 'animalRescueLocationHistory'
  | 'clinicalRecord'
  | 'clinicalEntry'
  | 'vaccine'
  | 'compatibilityTest'
  | 'compatibilityScore'
  | 'adoptionRequest'
  | 'interviewSlot'
  | 'adopterDocument'
  | 'adoptionContract'
  | 'notification'
  | 'operationalTask'
  | 'auditLog';

const modelNames: ModelName[] = [
  'user',
  'animal',
  'animalGallery',
  'animalStatusHistory',
  'animalRescueLocationHistory',
  'clinicalRecord',
  'clinicalEntry',
  'vaccine',
  'compatibilityTest',
  'compatibilityScore',
  'adoptionRequest',
  'interviewSlot',
  'adopterDocument',
  'adoptionContract',
  'notification',
  'operationalTask',
  'auditLog',
];

const dateFields = new Set([
  'createdAt',
  'updatedAt',
  'emailVerifiedAt',
  'lastLoginAt',
  'lockedUntil',
  'activationTokenExpiresAt',
  'resetTokenExpiresAt',
  'appliedAt',
  'nextDueAt',
  'postponedTo',
  'datetime',
  'generatedAt',
  'signedAt',
  'startsAt',
  'endsAt',
  'uploadedAt',
  'scheduledAt',
  'completedAt',
  'readAt',
  'calculatedAt',
]);

const dataDir = process.env['JSON_DATA_DIR']
  ? path.resolve(process.env['JSON_DATA_DIR'])
  : process.env['VERCEL']
    ? path.join('/tmp', 'rescue-pet-data')
    : path.join(__dirname, '../../data');

const dbFile = path.join(dataDir, 'db.json');
const dbBlobPath = process.env['JSON_BLOB_PATH'] || 'rescue-pet/db.json';

const passwordHash = '$2b$12$XYHaSNfsiMhQ3MKLH2g1.OtjtIsGKJY.9ZANG8kq8pSvqqx7z9wOa';

function now() {
  return new Date();
}

function emptyDb(): Db {
  return Object.fromEntries(modelNames.map((name) => [name, []])) as unknown as Db;
}

function createSeedDb(): Db {
  const db = emptyDb();
  const createdAt = now();

  db.user.push(
    {
      id: 'admin-seed',
      fullName: 'Administrador Rescue Pet',
      email: 'admin@rescuepet.com',
      passwordHash,
      phone: null,
      photoUrl: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: createdAt,
      lastLoginAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      activationToken: null,
      activationTokenExpiresAt: null,
      resetToken: null,
      resetTokenExpiresAt: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'vet-seed',
      fullName: 'Veterinario Rescue Pet',
      email: 'vet@rescuepet.com',
      passwordHash,
      phone: null,
      photoUrl: null,
      role: 'VETERINARIAN',
      status: 'ACTIVE',
      emailVerifiedAt: createdAt,
      lastLoginAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      activationToken: null,
      activationTokenExpiresAt: null,
      resetToken: null,
      resetTokenExpiresAt: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'volunteer-seed',
      fullName: 'Voluntario Rescue Pet',
      email: 'volunteer@rescuepet.com',
      passwordHash,
      phone: null,
      photoUrl: null,
      role: 'VOLUNTEER',
      status: 'ACTIVE',
      emailVerifiedAt: createdAt,
      lastLoginAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      activationToken: null,
      activationTokenExpiresAt: null,
      resetToken: null,
      resetTokenExpiresAt: null,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'adopter-seed',
      fullName: 'Adoptante Demo',
      email: 'adopter1@gmail.com',
      passwordHash,
      phone: null,
      photoUrl: null,
      role: 'ADOPTER',
      status: 'ACTIVE',
      emailVerifiedAt: createdAt,
      lastLoginAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      activationToken: null,
      activationTokenExpiresAt: null,
      resetToken: null,
      resetTokenExpiresAt: null,
      createdAt,
      updatedAt: createdAt,
    },
  );

  return db;
}

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reviveDates) as T;
  if (!value || typeof value !== 'object') return value;

  const copy: Row = {};
  for (const [key, val] of Object.entries(value as Row)) {
    if (val == null) copy[key] = val;
    else if (dateFields.has(key) && typeof val === 'string') copy[key] = new Date(val);
    else copy[key] = reviveDates(val);
  }
  return copy as T;
}

function ensureDbFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, serialize(createSeedDb()), 'utf8');
}

function isBlobEnabled() {
  return Boolean(process.env['BLOB_READ_WRITE_TOKEN']);
}

function loadBlobSdk(): {
  put: (pathname: string, body: string, options: Row) => Promise<{ url: string }>;
  list: (options: Row) => Promise<{ blobs: { url: string; uploadedAt?: Date | string }[] }>;
  get: (url: string) => Promise<{ text: () => Promise<string> }>;
} {
  try {
    // Vercel installs this dependency in production. Local development can use JSON files without it.
    return require('@vercel/blob');
  } catch {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN esta definido, pero falta @vercel/blob. Ejecuta npm install en el proyecto antes de desplegar.',
    );
  }
}

function clone<T>(value: T): T {
  return reviveDates(JSON.parse(JSON.stringify(value)));
}

function readLocalDb(): Db {
  ensureDbFile();
  const parsed = JSON.parse(fs.readFileSync(dbFile, 'utf8')) as Partial<Db>;
  const db = emptyDb();
  for (const name of modelNames) db[name] = reviveDates(parsed[name] ?? []);
  return db;
}

function writeLocalDb(db: Db) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const tempFile = `${dbFile}.tmp`;
  fs.writeFileSync(tempFile, serialize(db), 'utf8');
  fs.renameSync(tempFile, dbFile);
}

async function readBlobDb(): Promise<Db> {
  const { list, get } = loadBlobSdk();
  const { blobs } = await list({ prefix: dbBlobPath, limit: 1 });
  const blob = blobs
    .filter((item) => item.url)
    .sort((a, b) => new Date(b.uploadedAt ?? 0).getTime() - new Date(a.uploadedAt ?? 0).getTime())[0];

  if (!blob) {
    const seeded = createSeedDb();
    await writeBlobDb(seeded);
    return seeded;
  }

  const response = await get(blob.url);
  const parsed = JSON.parse(await response.text()) as Partial<Db>;
  const db = emptyDb();
  for (const name of modelNames) db[name] = reviveDates(parsed[name] ?? []);
  return db;
}

async function writeBlobDb(db: Db) {
  const { put } = loadBlobSdk();
  await put(dbBlobPath, serialize(db), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

async function readDb(): Promise<Db> {
  if (!isBlobEnabled()) return readLocalDb();
  try {
    return await readBlobDb();
  } catch (error) {
    logger.error('Failed to read JSON database from Vercel Blob', { error: (error as Error).message });
    throw error;
  }
}

async function writeDb(db: Db) {
  if (!isBlobEnabled()) {
    writeLocalDb(db);
    return;
  }
  try {
    await writeBlobDb(db);
  } catch (error) {
    logger.error('Failed to write JSON database to Vercel Blob', { error: (error as Error).message });
    throw error;
  }
}

function generateId() {
  return crypto.randomUUID();
}

function normalizeData(data: Row): Row {
  const normalized: Row = {};
  for (const [key, value] of Object.entries(data)) {
    normalized[key] = value === undefined ? null : value;
  }
  return normalized;
}

function isPlainObject(value: unknown): value is Row {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function comparable(value: unknown) {
  return value instanceof Date ? value.getTime() : value;
}

function matchesCondition(value: unknown, condition: unknown): boolean {
  if (isPlainObject(condition)) {
    const filter = condition as Row;
    if ('in' in condition) return (condition['in'] as unknown[]).includes(value);
    if ('contains' in condition) {
      return String(value ?? '').includes(String(filter['contains'] ?? ''));
    }
    if ('equals' in condition) {
      const expected = filter['equals'];
      if (filter['mode'] === 'insensitive') {
        return String(value ?? '').toLowerCase() === String(expected ?? '').toLowerCase();
      }
      return value === expected;
    }
    if ('not' in condition && value === filter['not']) return false;
    if ('gte' in condition && (comparable(value) as any) < (comparable(filter['gte']) as any)) return false;
    if ('lte' in condition && (comparable(value) as any) > (comparable(filter['lte']) as any)) return false;
    if ('gt' in condition && (comparable(value) as any) <= (comparable(filter['gt']) as any)) return false;
    if ('lt' in condition && (comparable(value) as any) >= (comparable(filter['lt']) as any)) return false;
    return true;
  }

  return value === condition;
}

function matchesWhere(row: Row, where?: Row): boolean {
  if (!where) return true;

  for (const [key, condition] of Object.entries(where)) {
    if (key === 'AND') {
      if (!(condition as Row[]).every((item) => matchesWhere(row, item))) return false;
      continue;
    }
    if (key === 'OR') {
      if (!(condition as Row[]).some((item) => matchesWhere(row, item))) return false;
      continue;
    }
    if (!matchesCondition(row[key], condition)) return false;
  }

  return true;
}

function compareRows(orderBy: any) {
  const rules = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  return (a: Row, b: Row) => {
    for (const rule of rules) {
      const [[field, direction]] = Object.entries(rule);
      const av = comparable(a[field]) as any;
      const bv = comparable(b[field]) as any;
      if (av === bv) continue;
      const result = (av as any) > bv ? 1 : -1;
      return direction === 'desc' ? -result : result;
    }
    return 0;
  };
}

function uniqueMatch(row: Row, where: Row): boolean {
  if ('adopterId_animalId' in where) {
    const composite = where['adopterId_animalId'];
    return row['adopterId'] === composite.adopterId && row['animalId'] === composite.animalId;
  }
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function defaultValues(model: ModelName): Row {
  switch (model) {
    case 'user':
      return {
        phone: null,
        photoUrl: null,
        role: 'ADOPTER',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        lastLoginAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
        activationToken: null,
        activationTokenExpiresAt: null,
        resetToken: null,
        resetTokenExpiresAt: null,
      };
    case 'animal':
      return {
        estimatedBreed: null,
        estimatedAge: null,
        size: null,
        status: 'QUARANTINE',
        mainPhotoUrl: null,
        rescueLocationText: null,
        rescueLatitude: null,
        rescueLongitude: null,
        publicProfileUrl: null,
        qrUrl: null,
        energyLevel: null,
        spaceNeed: null,
        goodWithChildren: false,
        goodWithPets: false,
        createdByUserId: null,
      };
    case 'animalGallery':
      return { isMain: false, uploadedByUserId: null };
    case 'vaccine':
      return { clinicalEntryId: null, nextDueAt: null, status: 'PENDING', postponedTo: null };
    case 'adoptionRequest':
      return { status: 'RECEIVED', rejectionReason: null };
    case 'interviewSlot':
      return { status: 'available', reservedByApplicationId: null };
    case 'adopterDocument':
      return { applicationId: null, version: 1, status: 'ACTIVE' };
    case 'adoptionContract':
      return { animalId: null, adopterId: null, pdfUrl: null, signedPdfUrl: null, signatureImageUrl: null, status: 'GENERATED', signedAt: null };
    case 'notification':
      return { readAt: null, resourceType: null, resourceId: null };
    case 'operationalTask':
      return { animalId: null, status: 'PENDING', description: null, completedAt: null, completedById: null, comment: null, createdById: null };
    case 'auditLog':
      return { metadataJson: null, ipAddress: null };
    default:
      return {};
  }
}

function dateDefaults(model: ModelName): Row {
  const at = now();
  switch (model) {
    case 'adopterDocument':
      return { uploadedAt: at };
    case 'compatibilityScore':
      return { calculatedAt: at };
    case 'auditLog':
    case 'animalGallery':
    case 'animalStatusHistory':
    case 'animalRescueLocationHistory':
    case 'clinicalEntry':
    case 'notification':
      return { createdAt: at };
    case 'user':
    case 'animal':
    case 'clinicalRecord':
    case 'vaccine':
    case 'compatibilityTest':
    case 'adoptionRequest':
    case 'interviewSlot':
    case 'operationalTask':
      return { createdAt: at, updatedAt: at };
    default:
      return {};
  }
}

function touchUpdate(model: ModelName, row: Row) {
  if (['user', 'animal', 'clinicalRecord', 'vaccine', 'compatibilityTest', 'adoptionRequest', 'interviewSlot', 'operationalTask'].includes(model)) {
    row['updatedAt'] = now();
  }
}

function applySelect(row: any, select?: Row): any {
  if (!select || row == null) return row;
  const selected: Row = {};
  for (const [key, value] of Object.entries(select)) {
    if (value === true) selected[key] = row[key];
    else if (value && row[key] !== undefined) selected[key] = applyQuery(row[key], value as Row);
  }
  return selected;
}

function applyQuery(value: any, query: Row): any {
  if (Array.isArray(value)) {
    let result = value;
    if (query.where) result = result.filter((row) => matchesWhere(row, query.where));
    if (query.orderBy) result = [...result].sort(compareRows(query.orderBy));
    if (query.skip) result = result.slice(query.skip);
    if (query.take !== undefined) result = result.slice(0, query.take);
    if (query.include || query.select) {
      return result.map((item) => applyProjection(item, query));
    }
    return result;
  }

  return applyProjection(value, query);
}

function applyProjection(row: any, args: Row = {}): any {
  if (row == null) return null;
  if (args.select) return applySelect(row, args.select);
  return row;
}

class JsonDelegate {
  constructor(
    private readonly model: ModelName,
    private readonly client: JsonDataClient,
  ) {}

  async findMany(args: Row = {}): Promise<any[]> {
    const db = await this.client.load();
    let rows = db[this.model].filter((row) => matchesWhere(row, args.where));
    if (args.distinct) {
      const distinctFields = args.distinct as string[];
      const seen = new Set<string>();
      rows = rows.filter((row) => {
        const key = distinctFields.map((field) => row[field]).join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (args.orderBy) rows = [...rows].sort(compareRows(args.orderBy));
    if (args.skip) rows = rows.slice(args.skip);
    if (args.take !== undefined) rows = rows.slice(0, args.take);
    return rows.map((row) => this.client.hydrate(this.model, clone(row), args, db));
  }

  async findFirst(args: Row = {}): Promise<any | null> {
    const rows = await this.findMany({ ...args, take: 1 });
    return rows[0] ?? null;
  }

  async findUnique(args: Row): Promise<any | null> {
    const db = await this.client.load();
    const row = db[this.model].find((item) => uniqueMatch(item, args.where));
    return row ? this.client.hydrate(this.model, clone(row), args, db) : null;
  }

  async count(args: Row = {}): Promise<number> {
    const db = await this.client.load();
    return db[this.model].filter((row) => matchesWhere(row, args.where)).length;
  }

  async create(args: Row): Promise<any> {
    const db = await this.client.load();
    const row = {
      id: generateId(),
      ...defaultValues(this.model),
      ...dateDefaults(this.model),
      ...normalizeData(args.data ?? {}),
    };
    db[this.model].push(row);
    await this.client.save(db);
    return this.client.hydrate(this.model, clone(row), args, db);
  }

  async update(args: Row): Promise<any> {
    const db = await this.client.load();
    const index = db[this.model].findIndex((row) => uniqueMatch(row, args.where));
    if (index < 0) throw new Error(`${this.model} not found`);
    const row = db[this.model][index];
    Object.assign(row, normalizeData(args.data ?? {}));
    touchUpdate(this.model, row);
    await this.client.save(db);
    return this.client.hydrate(this.model, clone(row), args, db);
  }

  async updateMany(args: Row): Promise<{ count: number }> {
    const db = await this.client.load();
    let count = 0;
    for (const row of db[this.model]) {
      if (!matchesWhere(row, args.where)) continue;
      Object.assign(row, normalizeData(args.data ?? {}));
      touchUpdate(this.model, row);
      count += 1;
    }
    await this.client.save(db);
    return { count };
  }

  async delete(args: Row): Promise<any> {
    const db = await this.client.load();
    const index = db[this.model].findIndex((row) => uniqueMatch(row, args.where));
    if (index < 0) throw new Error(`${this.model} not found`);
    const [deleted] = db[this.model].splice(index, 1);
    await this.client.save(db);
    return clone(deleted);
  }

  async upsert(args: Row): Promise<any> {
    const existing = await this.findUnique({ where: args.where });
    if (existing) {
      return this.update({ where: args.where, data: args.update, include: args.include, select: args.select });
    }
    return this.create({ data: args.create, include: args.include, select: args.select });
  }
}

class JsonDataClient {
  user = new JsonDelegate('user', this);
  animal = new JsonDelegate('animal', this);
  animalGallery = new JsonDelegate('animalGallery', this);
  animalStatusHistory = new JsonDelegate('animalStatusHistory', this);
  animalRescueLocationHistory = new JsonDelegate('animalRescueLocationHistory', this);
  clinicalRecord = new JsonDelegate('clinicalRecord', this);
  clinicalEntry = new JsonDelegate('clinicalEntry', this);
  vaccine = new JsonDelegate('vaccine', this);
  compatibilityTest = new JsonDelegate('compatibilityTest', this);
  compatibilityScore = new JsonDelegate('compatibilityScore', this);
  adoptionRequest = new JsonDelegate('adoptionRequest', this);
  interviewSlot = new JsonDelegate('interviewSlot', this);
  adopterDocument = new JsonDelegate('adopterDocument', this);
  adoptionContract = new JsonDelegate('adoptionContract', this);
  notification = new JsonDelegate('notification', this);
  operationalTask = new JsonDelegate('operationalTask', this);
  auditLog = new JsonDelegate('auditLog', this);

  async load() {
    return readDb();
  }

  async save(db: Db) {
    await writeDb(db);
  }

  async $disconnect() {
    return undefined;
  }

  async $transaction<T>(input: (tx: any) => Promise<T> | T): Promise<T>;
  async $transaction<T>(input: Promise<T>[]): Promise<T[]>;
  async $transaction(input: any): Promise<any> {
    if (typeof input === 'function') return input(this);
    return Promise.all(input);
  }

  hydrate(model: ModelName, row: Row, args: Row = {}, db: Db) {
    let hydrated = this.attachRelations(model, row, args.include ?? args.select, db);
    hydrated = applyProjection(hydrated, args);
    return hydrated;
  }

  private attachRelations(model: ModelName, row: Row, relationArgs: Row | undefined, db: Db): Row {
    const includeKeys = relationArgs ? Object.keys(relationArgs).filter((key) => isRelation(model, key) || key === '_count') : [];
    const shouldInclude = (key: string) => includeKeys.includes(key);
    const relQuery = (key: string) => (relationArgs?.[key] === true ? {} : relationArgs?.[key] ?? {});

    if (model === 'animal') {
      if (shouldInclude('gallery')) row.gallery = applyQuery(db.animalGallery.filter((g) => g.animalId === row.id), relQuery('gallery'));
      if (shouldInclude('vaccines')) row.vaccines = applyQuery(db.vaccine.filter((v) => v.animalId === row.id), relQuery('vaccines'));
      if (shouldInclude('clinicalRecord')) {
        const record = db.clinicalRecord.find((r) => r.animalId === row.id) ?? null;
        row.clinicalRecord = record ? this.attachRelations('clinicalRecord', clone(record), relQuery('clinicalRecord').include ?? relQuery('clinicalRecord').select, db) : null;
        row.clinicalRecord = applyProjection(row.clinicalRecord, relQuery('clinicalRecord'));
      }
      if (shouldInclude('_count')) {
        row._count = { gallery: db.animalGallery.filter((g) => g.animalId === row.id).length };
      }
    }

    if (model === 'animalGallery' && shouldInclude('uploadedBy')) {
      row.uploadedBy = this.relatedUser(row.uploadedByUserId, relQuery('uploadedBy'), db);
    }

    if (model === 'animalStatusHistory' && shouldInclude('changedBy')) {
      row.changedBy = this.relatedUser(row.changedByUserId, relQuery('changedBy'), db);
    }

    if (model === 'animalRescueLocationHistory' && shouldInclude('changedBy')) {
      row.changedBy = this.relatedUser(row.changedByUserId, relQuery('changedBy'), db);
    }

    if (model === 'clinicalRecord' && shouldInclude('entries')) {
      row.entries = applyQuery(
        db.clinicalEntry.filter((entry) => entry.clinicalRecordId === row.id).map((entry) => this.attachRelations('clinicalEntry', clone(entry), relQuery('entries').include ?? relQuery('entries').select, db)),
        relQuery('entries'),
      );
    }

    if (model === 'clinicalEntry') {
      if (shouldInclude('veterinarian')) row.veterinarian = this.relatedUser(row.veterinarianId, relQuery('veterinarian'), db);
      if (shouldInclude('vaccines')) row.vaccines = applyQuery(db.vaccine.filter((v) => v.clinicalEntryId === row.id), relQuery('vaccines'));
    }

    if (model === 'vaccine' && shouldInclude('animal')) {
      const animal = db.animal.find((a) => a.id === row.animalId) ?? null;
      row.animal = animal ? applyProjection(clone(animal), relQuery('animal')) : null;
    }

    if (model === 'compatibilityScore' && shouldInclude('animal')) {
      const animal = db.animal.find((a) => a.id === row.animalId) ?? null;
      row.animal = animal ? applyProjection(clone(animal), relQuery('animal')) : null;
    }

    if (model === 'adoptionRequest') {
      if (shouldInclude('animal')) row.animal = this.relatedAnimal(row.animalId, relQuery('animal'), db);
      if (shouldInclude('adopter')) row.adopter = this.relatedUser(row.adopterId, relQuery('adopter'), db);
      if (shouldInclude('documents')) row.documents = applyQuery(db.adopterDocument.filter((doc) => doc.applicationId === row.id), relQuery('documents'));
      if (shouldInclude('contract')) {
        const contract = db.adoptionContract.find((item) => item.applicationId === row.id) ?? null;
        row.contract = contract ? applyProjection(clone(contract), relQuery('contract')) : null;
      }
      if (shouldInclude('interviewSlot')) {
        const slot = db.interviewSlot.find((item) => item.reservedByApplicationId === row.id) ?? null;
        row.interviewSlot = slot ? applyProjection(clone(slot), relQuery('interviewSlot')) : null;
      }
    }

    if (model === 'operationalTask') {
      if (shouldInclude('animal')) row.animal = this.relatedAnimal(row.animalId, relQuery('animal'), db);
      if (shouldInclude('createdBy')) row.createdBy = this.relatedUser(row.createdById, relQuery('createdBy'), db);
      if (shouldInclude('completedBy')) row.completedBy = this.relatedUser(row.completedById, relQuery('completedBy'), db);
    }

    if (model === 'auditLog' && shouldInclude('user')) {
      row.user = this.relatedUser(row.userId, relQuery('user'), db);
    }

    return row;
  }

  private relatedUser(id: string | null, query: Row, db: Db) {
    const user = id ? db.user.find((item) => item.id === id) : null;
    return user ? applyProjection(clone(user), query) : null;
  }

  private relatedAnimal(id: string | null, query: Row, db: Db) {
    const animal = id ? db.animal.find((item) => item.id === id) : null;
    return animal ? applyProjection(clone(animal), query) : null;
  }
}

function isRelation(model: ModelName, key: string): boolean {
  const relations: Record<ModelName, string[]> = {
    user: [],
    animal: ['gallery', 'vaccines', 'clinicalRecord'],
    animalGallery: ['uploadedBy'],
    animalStatusHistory: ['changedBy'],
    animalRescueLocationHistory: ['changedBy'],
    clinicalRecord: ['entries'],
    clinicalEntry: ['veterinarian', 'vaccines'],
    vaccine: ['animal'],
    compatibilityTest: [],
    compatibilityScore: ['animal'],
    adoptionRequest: ['animal', 'adopter', 'documents', 'contract', 'interviewSlot'],
    interviewSlot: [],
    adopterDocument: [],
    adoptionContract: [],
    notification: [],
    operationalTask: ['animal', 'createdBy', 'completedBy'],
    auditLog: ['user'],
  };
  return relations[model].includes(key);
}

const db = new JsonDataClient();

export default db;
