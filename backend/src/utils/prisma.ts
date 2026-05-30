import { PrismaClient } from '@prisma/client';

// Validate DATABASE_URL early to give a clear error instead of Prisma's generic ones.
// NOTE: dotenv must be loaded with override:true in index.ts BEFORE this module is imported.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    '[Prisma] DATABASE_URL no está definida en process.env.\n' +
    '  1. Asegúrate de que el archivo backend/.env existe.\n' +
    '  2. index.ts debe importar dotenv con override:true como primera instrucción.\n' +
    '  Formato esperado: sqlserver://localhost:1433;database=rescue_pet;integratedSecurity=true;trustServerCertificate=true',
  );
}

const prisma = new PrismaClient();

export default prisma;
