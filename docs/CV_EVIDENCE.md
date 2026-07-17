# CV_EVIDENCE — Rescue-Pet

Verifiable, interview-defensible material. All claims map to files in this repository.

## Resume bullets (pick & adapt)

- Built and deployed a full-stack animal-shelter adoption platform (React 19 + TypeScript frontend, Express 5 + TypeScript backend) covering the complete adoption lifecycle: pet management, clinical records, compatibility matching, applications, interviews, digitally-signed contracts, notifications, and admin reports (live demo on Vercel).
- Implemented authentication and authorization end to end: JWT with rotation, role-based access control (adopter/volunteer/vet/admin), account lockout on failed logins, email activation flows, password policy, and rate limiting — validated by dedicated RBAC and security test suites.
- Wrote 13 Jest test suites (~3,700 LOC, ~300 test cases) including an end-to-end adoption-lifecycle test, plus TypeScript typecheck and build gates in GitHub Actions CI.
- Designed a dual-mode persistence layer (local JSON with a custom async mutex for write serialization in development; Vercel Blob for serverless production) with public/private file handling for photos, documents, and contracts.
- Integrated PDF contract generation (PDFKit), QR codes, email delivery (Nodemailer), geolocation (Leaflet), and schema validation with Zod across a 12-router REST API.

## Skills matrix

| Skill | Evidence | Depth | Confidence |
|---|---|---|---|
| TypeScript (frontend + backend) | Entire monorepo; strict tsconfig, typecheck in CI | Deep | High |
| REST API design (Express 5) | `backend/src/routes/` (12 routers), `controllers/` (14) | Deep | High |
| AuthN/AuthZ & security engineering | `authMiddleware.ts`, `passwordPolicy.ts`, `rateLimiter.ts`; `rbac.test.ts`, `security.test.ts` | Medium-Deep | High |
| React 19 (hooks, context, protected routing) | `AuthContext.tsx`, `ProtectedRoute.tsx`, ~25 pages | Medium-Deep | High |
| Testing (Jest, integration + E2E) | 13 suites incl. `e2e-adoption-lifecycle.test.ts` | Medium-Deep | High |
| Concurrency awareness | Custom async `Mutex` in `utils/db.ts` | Medium | High |
| Serverless deployment (Vercel, Blob storage) | `vercel.json`, `api/index.ts`, blob-aware `db.ts` | Medium | High |
| Input validation (Zod) | Controllers throughout | Medium | High |
| Tailwind CSS + Radix UI + shadcn/ui patterns | `frontend/src/components/ui/` | Medium | High |
| PDF/QR/email services | `services/pdfService.ts`, `qrService.ts`, `emailService.ts` | Medium | High |

## What this project proves

- Strongest evidence in the portfolio for **product-scale full-stack work**: largest functional scope, deployed demo, security-first backend.
- First appearance of: RBAC, rate limiting, serverless deployment, blob storage, PDF generation, E2E testing, monorepo workspaces.
- Reinforces: TypeScript, React, REST, CI (shared with LuikiKart, Match-3, gga-soluciones).

## ATS keywords

TypeScript, React 19, Express, Node.js, REST API, JWT, RBAC, role-based access control, rate limiting, Zod, Jest, end-to-end testing, integration testing, GitHub Actions, CI/CD, Vercel, serverless, blob storage, Tailwind CSS, Radix UI, Vite, monorepo, npm workspaces, PDFKit, QR codes, Nodemailer, Leaflet, full-stack development, authentication, authorization, secure file uploads.
