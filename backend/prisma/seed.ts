import { PrismaClient, Role, PetStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Contraseña de prueba simulada (bcrypt hash para "password123")
  const dummyPasswordHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGgZqZgOu';

  // 1. Crear usuarios con diferentes roles
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rescuepet.com' },
    update: {},
    create: {
      fullName: 'Admin General',
      email: 'admin@rescuepet.com',
      passwordHash: dummyPasswordHash,
      role: Role.ADMIN,
      phone: '+1234567890',
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
      phone: '+1234567891',
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
      phone: '+1234567892',
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
      phone: '+1234567893',
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
      phone: '+1234567894',
    },
  });

  console.log('Usuarios creados');

  // 2. Crear 6 mascotas con diferentes estados
  const pets = [
    {
      name: 'Max',
      species: 'Perro',
      breed: 'Labrador Retriever',
      estimatedAge: 24,
      size: 'Grande',
      status: PetStatus.AVAILABLE,
      energyLevel: 'HIGH',
      spaceNeed: 'LARGE',
      goodWithChildren: true,
      goodWithPets: true,
    },
    {
      name: 'Luna',
      species: 'Gato',
      breed: 'Mestizo',
      estimatedAge: 6,
      size: 'Pequeño',
      status: PetStatus.QUARANTINE,
      energyLevel: 'MEDIUM',
      spaceNeed: 'SMALL',
      goodWithChildren: false,
      goodWithPets: false,
    },
    {
      name: 'Rocky',
      species: 'Perro',
      breed: 'Bulldog Francés',
      estimatedAge: 36,
      size: 'Mediano',
      status: PetStatus.TREATMENT,
      energyLevel: 'LOW',
      spaceNeed: 'MEDIUM',
      goodWithChildren: true,
      goodWithPets: false,
    },
    {
      name: 'Bella',
      species: 'Perro',
      breed: 'Golden Retriever',
      estimatedAge: 12,
      size: 'Grande',
      status: PetStatus.ADOPTED,
      energyLevel: 'HIGH',
      spaceNeed: 'LARGE',
      goodWithChildren: true,
      goodWithPets: true,
    },
    {
      name: 'Milo',
      species: 'Gato',
      breed: 'Siamés',
      estimatedAge: 48,
      size: 'Mediano',
      status: PetStatus.AVAILABLE,
      energyLevel: 'MEDIUM',
      spaceNeed: 'MEDIUM',
      goodWithChildren: false,
      goodWithPets: true,
    },
    {
      name: 'Coco',
      species: 'Perro',
      breed: 'Poodle',
      estimatedAge: 60,
      size: 'Pequeño',
      status: PetStatus.AVAILABLE,
      energyLevel: 'LOW',
      spaceNeed: 'SMALL',
      goodWithChildren: true,
      goodWithPets: true,
    }
  ];

  for (const petData of pets) {
    await prisma.pet.create({
      data: petData
    });
  }

  console.log('Mascotas creadas');
  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
