import { PrismaClient, Role, AnimalStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // bcrypt hash for "password123"
  const dummyPasswordHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGgZqZgOu';

  const admin = await prisma.user.upsert({
    where: { email: 'admin@rescuepet.com' },
    update: {},
    create: {
      fullName: 'Admin General',
      email: 'admin@rescuepet.com',
      passwordHash: dummyPasswordHash,
      role: Role.ADMIN,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      phone: '+50688880001',
    },
  });

  const vet = await prisma.user.upsert({
    where: { email: 'vet@rescuepet.com' },
    update: {},
    create: {
      fullName: 'Dra. María Veterinaria',
      email: 'vet@rescuepet.com',
      passwordHash: dummyPasswordHash,
      role: Role.VETERINARIAN,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      phone: '+50688880002',
    },
  });

  const volunteer = await prisma.user.upsert({
    where: { email: 'volunteer@rescuepet.com' },
    update: {},
    create: {
      fullName: 'Juan Voluntario',
      email: 'volunteer@rescuepet.com',
      passwordHash: dummyPasswordHash,
      role: Role.VOLUNTEER,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      phone: '+50688880003',
    },
  });

  const adopter1 = await prisma.user.upsert({
    where: { email: 'adopter1@gmail.com' },
    update: {},
    create: {
      fullName: 'Carlos Adoptante',
      email: 'adopter1@gmail.com',
      passwordHash: dummyPasswordHash,
      role: Role.ADOPTER,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      phone: '+50688880004',
    },
  });

  const adopter2 = await prisma.user.upsert({
    where: { email: 'adopter2@gmail.com' },
    update: {},
    create: {
      fullName: 'Ana Adoptante',
      email: 'adopter2@gmail.com',
      passwordHash: dummyPasswordHash,
      role: Role.ADOPTER,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      phone: '+50688880005',
    },
  });

  console.log('✓ Usuarios creados');

  const animalsData = [
    {
      name: 'Max',
      species: 'Perro',
      estimatedBreed: 'Labrador Retriever',
      estimatedAge: 24,
      size: 'Grande',
      status: AnimalStatus.AVAILABLE,
      mainPhotoUrl: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400',
      energyLevel: 'HIGH',
      spaceNeed: 'LARGE',
      goodWithChildren: true,
      goodWithPets: true,
      rescueLocationText: 'San José, Costa Rica',
    },
    {
      name: 'Luna',
      species: 'Gato',
      estimatedBreed: 'Mestizo',
      estimatedAge: 6,
      size: 'Pequeño',
      status: AnimalStatus.QUARANTINE,
      mainPhotoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400',
      energyLevel: 'MEDIUM',
      spaceNeed: 'SMALL',
      goodWithChildren: false,
      goodWithPets: false,
    },
    {
      name: 'Rocky',
      species: 'Perro',
      estimatedBreed: 'Bulldog Francés',
      estimatedAge: 36,
      size: 'Mediano',
      status: AnimalStatus.TREATMENT,
      mainPhotoUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400',
      energyLevel: 'LOW',
      spaceNeed: 'MEDIUM',
      goodWithChildren: true,
      goodWithPets: false,
    },
    {
      name: 'Bella',
      species: 'Perro',
      estimatedBreed: 'Golden Retriever',
      estimatedAge: 12,
      size: 'Grande',
      status: AnimalStatus.ADOPTED,
      mainPhotoUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
      energyLevel: 'HIGH',
      spaceNeed: 'LARGE',
      goodWithChildren: true,
      goodWithPets: true,
    },
    {
      name: 'Milo',
      species: 'Gato',
      estimatedBreed: 'Siamés',
      estimatedAge: 48,
      size: 'Mediano',
      status: AnimalStatus.AVAILABLE,
      mainPhotoUrl: 'https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=400',
      energyLevel: 'MEDIUM',
      spaceNeed: 'MEDIUM',
      goodWithChildren: false,
      goodWithPets: true,
    },
    {
      name: 'Coco',
      species: 'Perro',
      estimatedBreed: 'Poodle',
      estimatedAge: 60,
      size: 'Pequeño',
      status: AnimalStatus.AVAILABLE,
      mainPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      energyLevel: 'LOW',
      spaceNeed: 'SMALL',
      goodWithChildren: true,
      goodWithPets: true,
    },
  ];

  for (const data of animalsData) {
    await prisma.animal.create({
      data: { ...data, createdByUserId: volunteer.id },
    });
  }

  console.log('✓ Animales creados');

  // Seed a clinical record for Max (required to move to AVAILABLE)
  const max = await prisma.animal.findFirst({ where: { name: 'Max' } });
  if (max) {
    const record = await prisma.clinicalRecord.create({ data: { animalId: max.id } });
    await prisma.clinicalEntry.create({
      data: {
        clinicalRecordId: record.id,
        animalId: max.id,
        veterinarianId: vet.id,
        datetime: new Date(),
        diagnosis: 'Revisión general al ingreso',
        treatment: 'Vitaminas y desparasitación',
        observations: 'Animal en buen estado general',
      },
    });
  }

  console.log('✓ Expediente clínico de ejemplo creado');
  console.log('\nUsuarios de prueba (contraseña: password123):');
  console.log('  admin@rescuepet.com      — ADMIN');
  console.log('  vet@rescuepet.com        — VETERINARIAN');
  console.log('  volunteer@rescuepet.com  — VOLUNTEER');
  console.log('  adopter1@gmail.com       — ADOPTER');
  console.log('  adopter2@gmail.com       — ADOPTER');
  console.log('\nSeeding finished.');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
