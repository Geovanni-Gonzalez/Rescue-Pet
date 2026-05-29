# Rescue-Pet

Sistema de gestion de adopcion de mascotas.

## Requisitos

- Node.js
- PostgreSQL
- Prisma

## Estructura

- `backend`: API Express + TypeScript + Prisma.
- `frontend`: React + Vite + TypeScript + Tailwind CSS.
- `docs`: documentacion funcional y tecnica.
- `Roadmap.md`: flujo de desarrollo del proyecto.

## Configuracion del Backend

1. Crear la base de datos PostgreSQL:

   ```sql
   CREATE DATABASE rescue_pet;
   ```

2. Copiar variables de entorno:

   ```bash
   cd backend
   cp .env.example .env
   ```

3. Configurar `backend/.env`:

   ```env
   DATABASE_URL="postgresql://usuario:password@localhost:5432/rescue_pet?schema=public"
   JWT_SECRET="cambia-esta-clave-en-desarrollo"
   PORT=3000
   FRONTEND_URL="http://localhost:5173"
   ```

4. Instalar dependencias y preparar Prisma:

   ```bash
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. Ejecutar backend:

   ```bash
   npm run dev
   ```

El backend se ejecuta en `http://localhost:3000`.

## Configuracion del Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend se ejecuta en `http://localhost:5173` o en el siguiente puerto disponible.

## Comandos de Verificacion

### Backend

```bash
cd backend
npm run typecheck
npm run build
```

### Frontend

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

> Nota: si `npm` o `npx` global fallan en Windows por una instalacion corrupta, se pueden usar los binarios locales despues de instalar dependencias, por ejemplo `.\node_modules\.bin\tsc.cmd --noEmit` o `.\node_modules\.bin\vite.cmd build`.

## Modulos Implementados

- Gestion de mascotas.
- Sistema de usuarios, autenticacion y autorizacion por roles.
- Pruebas de compatibilidad.
- Catalogo inteligente para adoptantes.
- Solicitudes de adopcion:
  - Creacion de solicitudes por adoptantes.
  - Gestion de estados: Recibida -> Entrevista -> Visita -> Aprobada/Rechazada.
  - Panel administrativo para gestionar solicitudes.
  - Panel de adoptantes para ver sus solicitudes.
  - Registro de auditoria y notificaciones en base de datos.
- Generacion de codigo QR por mascota.

## Usuarios de Prueba

La semilla crea usuarios de prueba con password `password123`.

### Administrador

- Email: `admin@rescuepet.com`
- Rol: `ADMIN`
- Permisos: gestion completa del sistema.

### Veterinario

- Email: `vet@rescuepet.com`
- Rol: `VETERINARIAN`
- Permisos: gestion de estado medico de mascotas.

### Voluntario

- Email: `volunteer@rescuepet.com`
- Rol: `VOLUNTEER`
- Permisos: gestion de mascotas y solicitudes.

### Adoptantes

- Email: `adopter1@gmail.com`
- Email: `adopter2@gmail.com`
- Rol: `ADOPTER`
- Permisos: ver catalogo, solicitar adopcion y consultar solicitudes propias.

## Modo Prototipo

Si el backend no esta disponible, el frontend permite login mock:

- Email que contenga `admin@...`: rol `ADMIN`.
- Email que contenga `vet@...`: rol `VETERINARIAN`.
- Email que contenga `vol@...`: rol `VOLUNTEER`.
- Cualquier otro email: rol `ADOPTER`.
