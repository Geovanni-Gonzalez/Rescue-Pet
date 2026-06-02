import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// bcrypt hash for "password123" (rounds: 12)
const DUMMY_HASH = '$2b$12$velfxLJDNk3URu.SvGZB2ubr6twcHjie24lEVg5iufVQmln8bJ9SO';

async function findOrCreateUser(email: string, data: Parameters<typeof prisma.user.create>[0]['data']) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data });
}

async function main() {
  console.log('Start seeding...');

  const admin = await findOrCreateUser('admin@rescuepet.com', {
    fullName: 'Admin General',
    email: 'admin@rescuepet.com',
    passwordHash: DUMMY_HASH,
    role: 'ADMIN',
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
    phone: '+50688880001',
  });

  const vet = await findOrCreateUser('vet@rescuepet.com', {
    fullName: 'Dra. María Veterinaria',
    email: 'vet@rescuepet.com',
    passwordHash: DUMMY_HASH,
    role: 'VETERINARIAN',
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
    phone: '+50688880002',
  });

  const volunteer = await findOrCreateUser('volunteer@rescuepet.com', {
    fullName: 'Juan Voluntario',
    email: 'volunteer@rescuepet.com',
    passwordHash: DUMMY_HASH,
    role: 'VOLUNTEER',
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
    phone: '+50688880003',
  });

  const adopter1 = await findOrCreateUser('adopter1@gmail.com', {
    fullName: 'Carlos Adoptante',
    email: 'adopter1@gmail.com',
    passwordHash: DUMMY_HASH,
    role: 'ADOPTER',
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
    phone: '+50688880004',
  });

  await findOrCreateUser('adopter2@gmail.com', {
    fullName: 'Ana Adoptante',
    email: 'adopter2@gmail.com',
    passwordHash: DUMMY_HASH,
    role: 'ADOPTER',
    status: 'ACTIVE',
    emailVerifiedAt: new Date(),
    phone: '+50688880005',
  });

  console.log('✓ Usuarios creados');

  const animalsData = [
    {
      name: 'Max',
      species: 'Perro',
      estimatedBreed: 'Labrador Retriever',
      estimatedAge: 24,
      size: 'Grande',
      status: 'AVAILABLE',
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
      status: 'QUARANTINE',
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
      status: 'TREATMENT',
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
      status: 'ADOPTED',
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
      status: 'AVAILABLE',
      mainPhotoUrl: 'https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=400',
      energyLevel: 'MEDIUM',
      spaceNeed: 'MEDIUM',
      goodWithChildren: false,
      goodWithPets: true,
    },
  ];

  // Only create animals if table is empty
  const existingCount = await prisma.animal.count();
  if (existingCount === 0) {
    for (const data of animalsData) {
      await prisma.animal.create({
        data: { ...data, createdByUserId: volunteer.id },
      });
    }
    console.log('✓ Animales creados');

    // Create clinical record for Max (required to move to AVAILABLE status)
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
      console.log('✓ Expediente clínico de Max creado');
    }
  } else {
    console.log('ℹ  Animales ya existen, omitiendo...');
  }

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
