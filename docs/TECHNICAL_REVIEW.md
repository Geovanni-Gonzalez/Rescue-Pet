# TECHNICAL_REVIEW — Rescue-Pet

Fecha de revisión: 2026-07-16
Método: análisis estático de código, enunciados en `docs/Proyecto {1,2,3} RQS.md`, configuración, CI y git. Suite Jest ejecutada localmente: 12 suites / 236 tests pasan; CI ahora ejecuta `npm test` para backend.

## 1. Comprensión del proyecto

Plataforma full-stack de gestión de adopciones para refugios: mascotas, expedientes clínicos, test de compatibilidad, solicitudes, entrevistas, contratos con firma, notificaciones, auditoría y reportes. Monorepo npm workspaces: `backend/` (Express 5 + TypeScript + Zod + JWT) y `frontend/` (React 19 + Vite + Tailwind + Radix). Demo desplegada en Vercel (serverless + Vercel Blob).

## 2. Arquitectura

| Capa | Evidencia |
|---|---|
| Backend por capas: routes → controllers → services/domain → utils | `backend/src/routes/` (12 routers), `controllers/` (14), `services/` (email, PDF, QR, auditoría, scheduler de inmunización), `domain/animalRules.ts` |
| Persistencia JSON con mutex asíncrono propio para serializar escrituras concurrentes | `backend/src/utils/db.ts` → clase `Mutex` (cola de promesas) |
| Adaptación dual local/serverless: filesystem en dev, Vercel Blob en producción | `utils/db.ts`, `middlewares/upload.ts`, `privateUploads.ts` |
| Seguridad: JWT, RBAC por rol, rate limiting, política de contraseñas, bloqueo por intentos, uploads privados | `middlewares/authMiddleware.ts`, `rateLimiter.ts`, `utils/passwordPolicy.ts`; tests `rbac.test.ts`, `security.test.ts` |
| Frontend: rutas protegidas por rol, contexto de auth, ~30 componentes y ~25 páginas | `frontend/src/components/ProtectedRoute.tsx`, `context/AuthContext.tsx`, `router.tsx` |

## 3. Cumplimiento del enunciado

Los tres enunciados RQS piden un prototipo web funcional por iteraciones. 🟨 Inferido desde documentación: el alcance implementado (roles, flujos de adopción, expediente clínico, reportes, auditoría) cubre y excede lo pedido en `Proyecto 3 RQS.md`; no hay matriz de requisitos numerados en los enunciados que permita un checklist ítem por ítem.

## 4. Calidad y pruebas

- ✅ 12 suites Jest / 236 tests: auth, RBAC, seguridad, matchmaking, adopción E2E, notificaciones, reportes, auditoría, tareas, usuarios, animales.
- ✅ CI (GitHub Actions): typecheck backend + frontend y build de frontend en Node 20.
- ✅ **CI ejecuta la suite Jest de backend** después del typecheck.
- Sin TODO/FIXME en `backend/src` ni `frontend/src`.

## 5. Fortalezas

1. Alcance funcional de producto real (17 entidades de datos) con demo pública desplegada — el proyecto más cercano a producción del portafolio.
2. Seguridad tratada como requisito de primera clase: RBAC probado, rate limiting, bloqueo de cuenta, activación por email, documentos privados detrás de middleware.
3. Solución de concurrencia consciente (mutex sobre el store JSON) en lugar de ignorar el problema.
4. Suite de pruebas amplia incluyendo un E2E del ciclo de adopción.

## 6. Debilidades y riesgos

| Riesgo | Severidad | Nota |
|---|---|---|
| Persistencia JSON no transaccional ni multi-proceso | Media | Aceptable para prototipo; el mutex solo protege dentro del proceso |
| Persistencia prototipo JSON/Blob | Media | Suficiente para demo, no sustituye migraciones/ORM en producción |
| ~~Backup de datos con hashes bcrypt trackeado~~ | — | Corregido en esta pasada: `git rm --cached` + patrón en `.gitignore` |
| `tmp_inflate.js` (script de perf) en la raíz | Baja | Mover a `scripts/` o eliminar |
| Licencia ISC poco común para portafolio | Baja | Considerar MIT por reconocimiento |

## 7. Evaluación profesional

- 30 segundos: README con caso de estudio, badge CI, demo pública y screenshots — impresión fuerte.
- 5 minutos: la estructura backend limpia y la carpeta `__tests__` sostienen la impresión; el store JSON revela el carácter de prototipo.
- Nivel demostrado: **Mid** en desarrollo full-stack TypeScript. Justificación: dominio de extremo a extremo (auth completo, RBAC, files, PDF, QR, email, deploy serverless) con testing amplio; queda debajo de Mid+ por la persistencia prototipo y CI incompleto.

## 8. Recomendaciones

Ver `IMPROVEMENT_ROADMAP.md`. P0 de CI aplicado; siguiente foco: persistencia versionada y cobertura publicada.
