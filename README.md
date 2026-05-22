# Rescue-Pet

Sistema de gestión de adopción de mascotas.

## Comandos de Ejecución

### Backend
```bash
cd backend
npm install
npm run dev
```
El backend se ejecuta en http://localhost:3000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
El frontend se ejecuta en http://localhost:5173 (o el puerto disponible)

## Módulos Implementados

- Gestión de Mascotas
- Sistema de Usuarios y Autenticación
- Pruebas de Compatibilidad
- **Solicitudes de Adopción** (nuevo)
  - Creación de solicitudes por adoptantes
  - Gestión de estados (Recibida → Entrevista → Visita → Aprobada/Rechazada)
  - Panel de administración para gestionar solicitudes
  - Panel de adoptantes para ver sus solicitudes
  - Registro de auditoría y notificaciones

## Requisitos

- Node.js
- PostgreSQL
- Prisma

## Configuración de la Base de Datos

1. **Crear base de datos PostgreSQL**:
   ```bash
   # En PostgreSQL
   CREATE DATABASE rescue_pet;
   ```

2. **Configurar variables de entorno**:
   - Copia `.env.example` a `.env` en el directorio `backend`
   - Configura la URL de tu base de datos:
   ```
   DATABASE_URL="postgresql://usuario:password@localhost:5432/rescue_pet?schema=public"
   JWT_SECRET="tu-clave-secreta-aqui"
   ```

3. **Ejecutar migraciones**:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   ```

4. **(Opcional) Cargar datos de prueba**:
   ```bash
   npx prisma db seed
   ```

## Usuarios de Prueba

Para iniciar sesión, puedes usar los siguientes usuarios (contraseña: `password123`):

### Administrador
- Email: `admin@rescuepet.com`
- Rol: ADMIN
- Permisos: Gestión completa del sistema

### Veterinario
- Email: `vet@rescuepet.com`
- Rol: VETERINARIAN
- Permisos: Gestión de estado médico de mascotas

### Voluntario
- Email: `volunteer@rescuepet.com`
- Rol: VOLUNTEER
- Permisos: Gestión de mascotas y solicitudes

### Adoptantes
- Email: `adopter1@gmail.com` (Carlos Adoptante)
- Email: `adopter2@gmail.com` (Ana Adoptante)
- Rol: ADOPTER
- Permisos: Ver catálogo, solicitar adopción, ver sus solicitudes

## Nota de Prototipo

Si el backend no está disponible, el frontend tiene un modo de prueba (mock) que permite iniciar sesión usando:
- Cualquier email que contenga `admin@...` → Rol ADMIN
- Cualquier email que contenga `vet@...` → Rol VETERINARIAN
- Cualquier email que contenga `vol@...` → Rol VOLUNTEER
- Cualquier otro email → Rol ADOPTER