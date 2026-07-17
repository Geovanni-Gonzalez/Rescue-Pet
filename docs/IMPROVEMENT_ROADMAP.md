# IMPROVEMENT_ROADMAP — Rescue-Pet

Backlog priorizado. Impacto/Esfuerzo: Alto/Medio/Bajo.

## Quick Wins

| # | Mejora | Impacto | Esfuerzo | Prioridad |
|---|---|---|---|---|
| 1 | ✅ Aplicado: `npm test --prefix backend --workspaces=false -- --runInBand` corre en CI | Alto | Bajo | P0 |
| 2 | Commitear el untracking de `backend/data/db.backup-*.json` (aplicado en esta revisión: contenía hashes bcrypt de usuarios seed) | Alto | Bajo | P0 |
| 3 | Mover `tmp_inflate.js` a `scripts/` con un nombre descriptivo (`seed-perf-data.js`) o eliminarlo | Medio | Bajo | P1 |
| 4 | GitHub Topics: `react`, `typescript`, `express`, `fullstack`, `jwt`, `rbac`, `vercel` + descripción con link a la demo | Medio | Bajo | P1 |
| 5 | ✅ Aplicado: sección "Pruebas" en README con comandos y suite Jest | Medio | Bajo | P1 |

## Mejoras técnicas

| # | Mejora | Impacto | Esfuerzo | Prioridad |
|---|---|---|---|---|
| 6 | Reporte de cobertura (`jest --coverage`) publicado como badge o artefacto de CI | Medio | Bajo | P1 |
| 7 | Tests de frontend (React Testing Library) — hoy toda la cobertura es backend | Medio | Medio | P2 |
| 8 | Migrar persistencia JSON a SQLite/Postgres (p. ej. Prisma) manteniendo la interfaz de `utils/db.ts` — elimina el riesgo multi-proceso y suma ORM al portafolio | Alto | Alto | P2 |
| 9 | Validar `JWT_SECRET` en producción (rechazar arranque con el valor por defecto) | Medio | Bajo | P1 |

## Mejoras arquitectónicas

| # | Mejora | Impacto | Esfuerzo | Prioridad |
|---|---|---|---|---|
| 10 | Extraer capa de repositorio explícita (controllers hoy acceden al store directamente) para facilitar la migración de BD | Medio | Medio | P2 |
| 11 | Colas/worker para email y generación de PDF (hoy inline en el request) | Bajo | Medio | P3 |

## Mejoras de GitHub

Ya presentes: README con caso de estudio y screenshots, badge de CI, LICENSE, `.env.example` en ambos paquetes, demo pública. Faltan: Topics/descripción (item 4), badge de cobertura (item 6), CHANGELOG.
