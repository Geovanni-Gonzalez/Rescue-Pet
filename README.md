# Rescue Pet

[![CI](https://github.com/Geovanni-Gonzalez/Rescue-Pet/actions/workflows/ci.yml/badge.svg)](https://github.com/Geovanni-Gonzalez/Rescue-Pet/actions/workflows/ci.yml)

Sistema integral de gestion de adopcion de animales rescatados. Permite a refugios administrar mascotas, coordinar procesos de adopcion, gestionar expedientes clinicos, y conectar adoptantes con animales compatibles.

## Caso de estudio

### Problema
Los refugios suelen coordinar adopciones, expedientes clinicos, documentos y entrevistas con herramientas separadas. Eso dificulta saber que mascota esta disponible, quien debe revisar una solicitud, que documentos faltan y si una adopcion ya puede cerrarse.

### Solucion
Rescue Pet centraliza el ciclo completo de adopcion en una plataforma full stack: gestion de mascotas, roles de equipo, expediente veterinario, test de compatibilidad, solicitudes, entrevistas, documentos, contratos, firma digital, notificaciones y reportes administrativos.

### Decisiones tecnicas destacadas
- Backend Express/TypeScript con validacion Zod, JWT, RBAC por rol y auditoria de acciones.
- Frontend React/Vite con rutas protegidas, paneles por rol, tablas operativas y componentes reutilizables.
- Persistencia local en JSON para desarrollo y adaptacion a Vercel Blob para despliegue serverless.
- Pruebas unitarias, de seguridad, RBAC y ciclo E2E de adopcion para cubrir los flujos criticos.

### Flujos principales
- Adoptante: registro, activacion, test de afinidad, catalogo y solicitud.
- Voluntario: registro de mascotas, galeria, documentos y seguimiento de solicitudes.
- Veterinario: expediente clinico, vacunas, alertas y transiciones medicas.
- Administrador: usuarios, entrevistas, contratos, reportes, auditoria y exportaciones.

## Demo y vistas

- Demo publica: [rescue-pet.vercel.app](https://rescue-pet.vercel.app)

![Vista principal de Rescue Pet](frontend/src/assets/hero.png)

![Pantalla de acceso de Rescue Pet](frontend/src/assets/login-family-pets.webp)

## Arquitectura

```
Rescue-Pet/
  backend/    Express + TypeScript + JSON local
  frontend/   React 19 + Vite + TypeScript + Tailwind CSS
  docs/       Documentacion funcional y tecnica
```

| Capa | Tecnologias |
|------|-------------|
| **Frontend** | React 19, Vite 8, TypeScript, Tailwind CSS, Radix UI, Leaflet, Axios, React Router 7 |
| **Backend** | Node.js, Express 5, TypeScript, Zod 4, JWT, bcrypt, PDFKit, QRCode, Nodemailer |
| **Datos** | JSON local en desarrollo y Vercel Blob para persistencia en despliegue |
| **Autenticacion** | JWT con rotacion, bloqueo por intentos fallidos, activacion por email |

## Requisitos previos

- **Node.js** >= 18
- **npm** >= 9

## Instalacion rapida

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd Rescue-Pet
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

El backend se ejecuta en `http://localhost:3000`. En el primer arranque crea automaticamente `backend/data/db.json` con usuarios de prueba.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

El frontend se ejecuta en `http://localhost:5173`.

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripcion | Valor por defecto |
|----------|-------------|-------------------|
| `JSON_DATA_DIR` | Directorio opcional donde guardar `db.json` en desarrollo | `backend/data` |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob para persistir `db.json`, fotos y documentos | _(vacio = modo local)_ |
| `JSON_BLOB_PATH` | Ruta del archivo de datos dentro de Blob | `rescue-pet/db.json` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | `cambia-esta-clave-en-produccion` |
| `PORT` | Puerto del servidor API | `3000` |
| `FRONTEND_URL` | URL del frontend (para CORS y QR) | `http://localhost:5173` |
| `BACKEND_URL` | URL publica del backend (para URLs de archivos) | `http://localhost:3000` |
| `NODE_ENV` | Entorno (`development` / `production`) | `development` |
| `SMTP_HOST` | Servidor SMTP para emails | _(vacio = consola)_ |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USER` | Usuario SMTP | _(vacio)_ |
| `SMTP_PASS` | Contrasena SMTP | _(vacio)_ |
| `SMTP_FROM` | Remitente de emails | `Rescue Pet <noreply@rescuepet.com>` |

### Frontend (`frontend/.env`)

| Variable | Descripcion | Valor por defecto |
|----------|-------------|-------------------|
| `VITE_API_URL` | URL base de la API backend | `http://localhost:3000` |

## Datos persistentes

En desarrollo, el backend usa `backend/data/db.json` como almacenamiento local. Si el archivo no existe, se crea con usuarios iniciales. El archivo esta ignorado por Git para no versionar datos de ejecucion.

Para reiniciar los datos en desarrollo, detén el servidor y elimina `backend/data/db.json`; se generara de nuevo al arrancar.

En Vercel, conecta Vercel Blob al proyecto. Cuando exista `BLOB_READ_WRITE_TOKEN`, el backend guarda `db.json` en Blob usando `JSON_BLOB_PATH`, sube fotos/galeria como blobs publicos y guarda documentos/contratos como blobs privados servidos por `/uploads/documents/:filename` y `/uploads/contracts/:filename`.

## Usuarios de prueba

El primer arranque crea usuarios con contrasena `password123`:

| Email | Rol | Permisos |
|-------|-----|----------|
| `admin@rescuepet.com` | ADMIN | Gestion completa: usuarios, mascotas, solicitudes, reportes, auditoria |
| `vet@rescuepet.com` | VETERINARIAN | Expedientes clinicos, vacunas, cambio de estado medico |
| `volunteer@rescuepet.com` | VOLUNTEER | Registro de mascotas, gestion de galeria, solicitudes |
| `adopter1@gmail.com` | ADOPTER | Catalogo, test de afinidad, solicitudes de adopcion |

## Comandos de verificacion

### Backend

```bash
cd backend
npm run typecheck     # Verificacion de tipos TypeScript
npm run build         # Compilacion a JavaScript
npm test              # Ejecutar suite completa de tests
npm run test:coverage # Tests con reporte de cobertura
npm run test:watch    # Tests en modo watch
```

### Frontend

```bash
cd frontend
npm run typecheck     # Verificacion de tipos
npm run lint          # ESLint
npm run build         # Build de produccion
```

## Suite de pruebas

El proyecto incluye **170+ tests** organizados en las siguientes categorias:

| Archivo | Categoria | Tests |
|---------|-----------|-------|
| `auth.test.ts` | Autenticacion (login, registro, activacion, reset) | 14 |
| `users.test.ts` | Gestion de usuarios y perfil | 12 |
| `animals.test.ts` | CRUD de mascotas y estados | 10 |
| `matchmaking.test.ts` | Test de compatibilidad y catalogo | 8 |
| `adoption.test.ts` | Flujo de adopcion completo | 18 |
| `notifications.test.ts` | Centro de notificaciones | 10 |
| `tasks.test.ts` | Tareas operativas e idempotencia | 8 |
| `audit.test.ts` | Registro de auditoria | 5 |
| `reports.test.ts` | Reportes, filtros y exportacion PDF/CSV | 18 |
| `e2e-adoption-lifecycle.test.ts` | E2E: 13 pasos del ciclo de adopcion | 13 |
| `rbac.test.ts` | Validacion RBAC por rol en cada endpoint | 20 |
| `security.test.ts` | Seguridad: JWT, inyeccion, XSS, errores | 16 |

## Modulos implementados

### Fase 1 — Autenticacion y usuarios
- Registro de adoptantes con activacion por email
- Login con JWT (8h de expiracion)
- Bloqueo por 5 intentos fallidos (15 min)
- Recuperacion de contrasena
- Gestion de perfil y roles (ADMIN, VETERINARIAN, VOLUNTEER, ADOPTER)

### Fase 2 — Gestion de mascotas
- CRUD completo con foto principal obligatoria
- Galeria de imagenes (hasta 10 por mascota)
- Maquina de estados: QUARANTINE -> AVAILABLE -> TREATMENT -> ADOPTED/DECEASED
- Validacion de transiciones (requiere expediente clinico para AVAILABLE)
- Codigo QR unico por mascota
- Historial de ubicacion de rescate con mapa Leaflet

### Fase 3 — Veterinaria
- Expediente clinico por mascota
- Entradas clinicas (diagnostico, tratamiento, medicamentos)
- Calendario de vacunas con alertas de 72 horas
- Postergacion y confirmacion de vacunas

### Fase 4 — Matchmaking inteligente
- Test de compatibilidad para adoptantes (vivienda, patio, ninos, experiencia)
- Algoritmo de afinidad por mascota (0-100%)
- Catalogo inteligente ordenado por compatibilidad
- Recalculo automatico al actualizar test

### Fase 5 — Proceso de adopcion
- Solicitud de adopcion con validacion de disponibilidad
- Flujo de estados: RECEIVED -> INTERVIEW -> VISIT -> APPROVED/REJECTED
- Agenda de entrevistas con reserva atomica (sin doble-booking)
- Repositorio documental (ID, comprobante de domicilio) con versionado
- Generacion automatica de contrato PDF al aprobar
- Firma digital con imagen del adoptante
- Transicion automatica de mascota a ADOPTED al firmar

### Fase 6 — Notificaciones, tareas y auditoria
- Centro de notificaciones in-app con badge en tiempo real (polling 30s)
- Notificaciones por solicitudes, documentos, contratos y tareas
- Tareas operativas con asignacion por rol (Veterinario/Voluntario)
- Confirmacion de tarea con proteccion contra doble clic (idempotency key)
- Registro de auditoria inalterable (INSERT-only) para todas las acciones

### Fase 7 — Reportes administrativos
- Reporte de adopciones con filtros por fecha, especie, estado y metricas de afinidad
- Reporte de salud con filtros por tratamiento activo y vacunas pendientes
- Vista previa tabular con tarjetas de resumen
- Exportacion PDF (tablas profesionales con PDFKit)
- Exportacion CSV (compatible con Excel, UTF-8 BOM)
- Bloqueo de exportacion cuando no hay datos

### Fase 8 — Integracion y pruebas finales
- Test E2E del ciclo completo de adopcion (13 pasos)
- Validacion RBAC exhaustiva por endpoint y rol
- Tests de seguridad: JWT, inyeccion SQL, XSS, errores
- Validacion de logs y auditoria en denegacion de acceso

## Endpoints principales de la API

### Autenticacion (`/api/auth`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/login` | Iniciar sesion |
| POST | `/register-adopter` | Registrar adoptante |
| GET | `/activate?token=` | Activar cuenta |
| POST | `/resend-activation` | Reenviar email de activacion |
| POST | `/forgot-password` | Solicitar reset de contrasena |
| POST | `/reset-password` | Restablecer contrasena |
| GET | `/me` | Obtener perfil del usuario autenticado |

### Mascotas (`/api/animals`)
| Metodo | Ruta | Roles | Descripcion |
|--------|------|-------|-------------|
| GET | `/` | Todos | Listar mascotas |
| POST | `/` | ADMIN, VOLUNTEER | Crear mascota |
| GET | `/:id` | Todos | Detalle de mascota |
| PATCH | `/:id` | ADMIN, VOLUNTEER | Editar mascota |
| PATCH | `/:id/status` | ADMIN, VET | Cambiar estado |
| GET | `/:id/clinical-record` | ADMIN, VET | Expediente clinico |
| POST | `/:id/vaccines` | ADMIN, VET | Registrar vacuna |

### Adopcion (`/api/adoption-applications`)
| Metodo | Ruta | Roles | Descripcion |
|--------|------|-------|-------------|
| POST | `/` | ADOPTER | Crear solicitud |
| GET | `/` | Todos | Listar solicitudes |
| PATCH | `/:id/status` | ADMIN | Cambiar estado de solicitud |
| POST | `/:id/documents` | ADOPTER, ADMIN | Cargar documento |
| POST | `/:id/contract/generate` | ADMIN | Generar contrato PDF |
| POST | `/:id/contract/sign` | ADOPTER | Firmar contrato |

### Reportes (`/api/reports`) — Solo ADMIN
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/adoptions` | Reporte de adopciones |
| GET | `/adoptions/export/pdf` | Exportar adopciones a PDF |
| GET | `/adoptions/export/csv` | Exportar adopciones a CSV |
| GET | `/health` | Reporte de salud |
| GET | `/health/export/pdf` | Exportar salud a PDF |
| GET | `/health/export/csv` | Exportar salud a CSV |

### Otros
| Ruta | Roles | Descripcion |
|------|-------|-------------|
| `/api/notifications` | Todos | Centro de notificaciones |
| `/api/tasks` | Staff | Tareas operativas |
| `/api/audit` | ADMIN | Registro de auditoria |
| `/api/reports/species` | ADMIN | Lista de especies (filtros) |
| `/health` | Publico | Health check del servidor |

## Seguridad

- **Autenticacion**: JWT firmado con secreto configurable, expiracion de 8 horas
- **Bloqueo de cuenta**: 5 intentos fallidos = bloqueo temporal de 15 minutos
- **Hashing**: bcrypt con 12 rondas de salt
- **Validacion**: Zod en todos los endpoints (tipos, formatos, rangos)
- **RBAC**: middleware `authorizeRoles()` en cada ruta protegida
- **Auditoria**: registro inmutable de acciones criticas (login, cambios de estado, denegaciones)
- **Archivos**: validacion de MIME type y tamano maximo (5MB fotos, 10MB documentos)
- **Persistencia local**: acceso a datos encapsulado en un adaptador JSON; no se construyen consultas SQL
- **XSS**: datos almacenados tal cual; sanitizacion en el frontend (React escapa por defecto)
- **Enumeracion de usuarios**: mensajes genericos en registro y recuperacion de contrasena

## Estructura del proyecto

```
backend/
  src/
    controllers/     Logica de cada endpoint
    domain/          Reglas de negocio (transiciones de estado)
    middlewares/      Auth, RBAC, upload, logging, errores
    models/          (reservado)
    routes/          Definicion de rutas Express
    services/        Servicios: email, PDF, QR, notificaciones, auditoria
    types/           Enums y tipos de dominio
    utils/           Adaptador JSON, logger
    __tests__/       Suite completa de tests
  data/
    db.json          Datos locales generados en ejecucion (ignorado por Git)

frontend/
  src/
    components/      Componentes reutilizables (UI, layout, formularios)
    context/         AuthContext (estado global de sesion)
    lib/             Cliente API (axios)
    pages/           Paginas por funcionalidad
```

## Despliegue

### Vercel

El repositorio incluye configuracion para desplegar en Vercel desde la raiz:

- `vercel.json` construye `frontend/dist` y enruta `/api/*`, `/health` y `/uploads/*` al backend Express como Function.
- `api/index.ts` exporta la app Express para Vercel.
- `package.json` raiz usa workspaces para instalar dependencias y construir el frontend.

En Vercel configura el proyecto con estos valores:

| Campo | Valor |
|-------|-------|
| Root Directory | `.` |
| Install Command | `npm install` |
| Build Command | `npm run vercel-build` |
| Output Directory | `frontend/dist` |

Variables requeridas en Vercel:

```env
NODE_ENV=production
JWT_SECRET=<clave-aleatoria-de-64-caracteres>
FRONTEND_URL=https://<tu-proyecto>.vercel.app
BACKEND_URL=https://<tu-proyecto>.vercel.app
BLOB_READ_WRITE_TOKEN=<inyectado-por-vercel-blob>
JSON_BLOB_PATH=rescue-pet/db.json
```

`VITE_API_URL` es opcional cuando frontend y API viven en el mismo despliegue de Vercel; si no se define, el frontend llama a `/api` en el mismo dominio. Para SMTP, agrega `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM` si quieres enviar correos reales.

Importante: Vercel Functions no ofrecen filesystem persistente. Sin `BLOB_READ_WRITE_TOKEN`, el backend usa fallback local temporal en `/tmp` dentro de Vercel. Con Vercel Blob conectado, `db.json`, fotos, documentos y contratos quedan persistidos en Blob.

### Build de produccion

```bash
# Backend
cd backend
npm run build
# Resultado en backend/dist/

# Frontend
cd frontend
npm run build
# Resultado en frontend/dist/
```

### Variables de produccion

```env
NODE_ENV=production
JWT_SECRET=<clave-aleatoria-de-64-caracteres>
FRONTEND_URL=https://tudominio.com
BACKEND_URL=https://api.tudominio.com
BLOB_READ_WRITE_TOKEN=<token-de-vercel-blob>
JSON_BLOB_PATH=rescue-pet/db.json
SMTP_HOST=smtp.tuproveedor.com
SMTP_USER=noreply@tudominio.com
SMTP_PASS=<password>
```

### Ejecucion en produccion

```bash
# Backend (Node.js)
cd backend
node dist/index.js

# Frontend (servir archivos estaticos con nginx, Vercel, etc.)
# Configurar proxy reverso para /api -> backend
```

### Docker (ejemplo)

```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
COPY data/ ./data/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Pruebas

El backend incluye 13 suites de Jest (~300 casos) que cubren autenticacion, RBAC, seguridad, matchmaking, notificaciones, reportes, auditoria, tareas, usuarios, animales y un E2E del ciclo completo de adopcion (`backend/src/__tests__/`).

```bash
cd backend
npm test              # suite completa
npm run test:coverage # con reporte de cobertura
```

## Licencia

ISC
