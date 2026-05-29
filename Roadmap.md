# Roadmap de Desarrollo - Rescue Pet

Este archivo define el flujo de desarrollo del proyecto Rescue Pet. Se construye a partir de la documentacion en `docs/` y de la verificacion del codigo actualmente implementado en `backend/` y `frontend/`.

## Estado Actual Verificado

### Implementado

- Monorepo logico con `frontend`, `backend` y `docs`.
- Frontend con React, Vite, TypeScript, Tailwind CSS y componentes estilo shadcn/ui.
- Backend con Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT, bcrypt, Zod y CORS.
- Modelo Prisma para:
  - `User`
  - `Pet`
  - `MedicalRecord`
  - `CompatibilityTest`
  - `CompatibilityScore`
  - `AdoptionRequest`
  - `Document`
  - `Contract`
  - `Notification`
  - `AuditLog`
- Autenticacion backend:
  - `POST /auth/login`
  - `POST /auth/register-adopter`
  - `GET /auth/me`
- Gestion de usuarios backend:
  - `GET /users`
  - `GET /users/:id`
  - `PATCH /users/:id`
  - Restriccion para que solo `ADMIN` pueda cambiar `role` e `isActive`.
- Middleware de autenticacion y autorizacion por roles.
- Auditoria backend para login, registro, actualizacion de usuario, mascotas, QR y solicitudes.
- Gestion de mascotas backend:
  - Listado y detalle.
  - Creacion y edicion por `ADMIN` y `VOLUNTEER`.
  - Cambio de estado por `ADMIN` y `VETERINARIAN`.
  - Validacion de transiciones de estado.
  - Generacion de QR por mascota.
- Gestion de mascotas frontend:
  - Listado.
  - Detalle.
  - Creacion.
  - Edicion.
  - Selector de estado.
  - Visualizacion y descarga de QR.
- Test de compatibilidad backend:
  - Guardado/actualizacion del test del adoptante.
  - Calculo de afinidad por mascota disponible.
  - Catalogo ordenado por compatibilidad.
- Test de compatibilidad frontend:
  - Formulario de afinidad.
  - Catalogo inteligente para adoptantes.
  - Indicador y explicacion de compatibilidad.
- Solicitudes de adopcion backend:
  - Creacion por adoptante.
  - Listado general y listado propio.
  - Detalle con mascota, adoptante, documentos y contrato.
  - Cambio de estado con transiciones `RECEIVED -> INTERVIEW -> VISIT -> APPROVED/REJECTED`.
  - Motivo obligatorio para rechazo.
  - Notificaciones in-app creadas en base de datos para admins/adoptantes.
- Solicitudes de adopcion frontend:
  - Mis solicitudes.
  - Panel administrativo de solicitudes.
  - Detalle de solicitud.
  - Timeline de estado.
  - Acciones de transicion.
  - Dialogo para motivo de rechazo.
- Validaciones recientes:
  - Frontend lint pasa.
  - Frontend TypeScript pasa.
  - Frontend build de produccion pasa.
  - Backend TypeScript pasa.

### Parcialmente Implementado

- Registro de adoptantes:
  - Backend existe.
  - Frontend `/register` todavia usa pantalla placeholder.
- Perfil de usuario:
  - Backend permite consultar y actualizar usuarios.
  - Frontend `/profile` todavia usa pantalla placeholder.
- Notificaciones:
  - Modelo existe.
  - Backend crea notificaciones en eventos de adopcion.
  - Falta API de consulta/marcar como leida y UI para mostrarlas.
- Documentos:
  - Modelo existe.
  - El detalle de solicitud puede mostrar documentos si existen.
  - Falta carga, validacion, almacenamiento y gestion de documentos.
- Contratos:
  - Modelo existe.
  - El detalle de solicitud puede mostrar contrato si existe.
  - Al aprobar una solicitud solo hay placeholder para generacion.
- Historial medico:
  - Modelo `MedicalRecord` existe.
  - Falta API y UI para que veterinarios creen/consulten historiales medicos.
- Dashboard:
  - Rutas base existen.
  - Pantallas principales de dashboard/admin siguen como placeholders.

### Pendiente

- Generacion real de PDF de contrato.
- Firma digital del contrato.
- Cambio automatico de mascota a `ADOPTED` al cerrar adopcion aprobada y firmada.
- Servicio de almacenamiento local/simulado para archivos.
- UI de documentos, contratos, firma y notificaciones.
- Gestion completa de historiales medicos.
- Tests automatizados.
- Documentacion API completa para mascotas, compatibilidad, adopcion, documentos, contratos y notificaciones.
- Normalizacion de textos con caracteres especiales en documentos y UI.

## Flujo de Desarrollo

### Fase 1 - Estabilizacion del Prototipo Base

Estado: completada el 2026-05-29.

Objetivo: dejar la base tecnica confiable antes de ampliar funcionalidades.

- Mantener `frontend` sin errores de lint, TypeScript y build.
- Mantener `backend` sin errores de TypeScript.
- Revisar el uso de `npm/npx` en el entorno local, porque actualmente el CLI global esta roto en esta sesion.
- Corregir textos con codificacion incorrecta en README, docs y UI.
- Agregar `.env.example` actualizado para backend.
- Documentar comandos reales de desarrollo, build, seed y migracion.

Criterio de salida:
- `frontend`: lint, TypeScript y build pasan.
- `backend`: TypeScript pasa.
- README y docs se pueden leer sin caracteres corruptos.

Resultado ejecutado:
- README y documentos base en `docs/` fueron normalizados a texto ASCII para evitar problemas de codificacion en terminales Windows.
- `backend/.env.example` fue actualizado con `DATABASE_URL`, `JWT_SECRET`, `PORT` y `FRONTEND_URL`.
- `backend/package.json` ahora incluye scripts de `typecheck`, `build`, Prisma generate/migrate/seed y test placeholder no fallido.
- `frontend/package.json` ahora incluye `typecheck`.
- `frontend/index.html` quedo con `lang="es"` y titulo `Rescue Pet`.
- El mensaje de arranque del backend quedo en ASCII.
- Verificaciones ejecutadas:
  - Frontend lint: OK.
  - Frontend TypeScript: OK.
  - Frontend build de produccion: OK.
  - Backend TypeScript: OK.

### Fase 2 - Autenticacion, Registro y Perfil

Estado: completada el 2026-05-29.

Objetivo: completar el flujo de usuario basico.

- Implementar pantalla real de registro de adoptantes conectada a `POST /auth/register-adopter`.
- Implementar pantalla de perfil conectada a `GET /auth/me` y `PATCH /users/:id`.
- Validar errores de formulario de manera consistente.
- Mostrar estado de carga y feedback de exito/error.
- Revisar redireccion por rol despues de login/registro.

Criterio de salida:
- Un adoptante puede registrarse, iniciar sesion, ver su perfil y actualizar sus datos.

Resultado ejecutado:
- `/register` fue reemplazado por una pantalla real de registro de adoptantes conectada a `POST /auth/register-adopter`.
- Despues del registro, el frontend inicia sesion automaticamente con `POST /auth/login` y redirige segun el rol.
- `/profile` fue reemplazado por una pantalla real conectada a `GET /auth/me` y `PATCH /users/:id`.
- El contexto de autenticacion ahora permite actualizar el usuario en memoria y `localStorage` despues de editar perfil.
- Login fue limpiado para usar textos ASCII y `Link` de React Router.
- Verificaciones ejecutadas:
  - Frontend lint: OK.
  - Frontend TypeScript: OK.
  - Frontend build de produccion: OK.
  - Backend TypeScript: OK.
  - Backend build TypeScript: OK.

### Fase 3 - Mascotas e Historial Medico

Objetivo: cerrar el modulo de gestion animal definido en `docs/PROJECT_CONTEXT.md`.

- Crear endpoints para `MedicalRecord`:
  - Crear historial medico.
  - Listar historiales por mascota.
  - Ver detalle de historial.
- Restringir creacion/edicion de historiales a `VETERINARIAN` y `ADMIN`.
- Integrar historial medico en detalle de mascota.
- Mejorar formulario de mascota para cubrir todos los campos del modelo:
  - ubicacion de rescate
  - foto principal
  - compatibilidad con ninos
  - compatibilidad con mascotas
  - energia
  - espacio requerido
- Decidir si las fotos se guardaran como URL manual o mediante servicio local de archivos.

Criterio de salida:
- Una mascota puede registrarse, evaluarse clinicamente, pasar a disponible y exponer su QR/perfil.

### Fase 4 - Solicitudes de Adopcion

Objetivo: fortalecer el flujo de solicitud hasta aprobacion/rechazo.

- Permitir que `VOLUNTEER` gestione solicitudes si el alcance funcional lo requiere.
- Revisar permisos actuales: backend permite cambiar estado solo a `ADMIN`, mientras la documentacion menciona voluntarios/administradores.
- Agregar filtros, busqueda y estados vacios mas utiles en panel administrativo.
- Evitar solicitudes duplicadas cuando ya exista una aprobada o mascota adoptada.
- Registrar auditoria mas detallada por transicion.
- Preparar evento de aprobacion para iniciar contrato real.

Criterio de salida:
- El flujo `RECEIVED -> INTERVIEW -> VISIT -> APPROVED/REJECTED` funciona con permisos alineados a la documentacion.

### Fase 5 - Documentos y Almacenamiento

Objetivo: habilitar archivos requeridos para adopcion.

- Crear servicio de almacenamiento local/simulado.
- Crear endpoints para documentos:
  - Subir documento.
  - Listar documentos por adoptante/solicitud.
  - Asociar documento a solicitud.
  - Eliminar o reemplazar documento si aplica.
- Implementar UI para carga de documentos en solicitudes.
- Validar tipos permitidos: `ID_CARD`, `ADDRESS_PROOF`, `CONTRACT`.
- Definir estructura local de archivos y estrategia futura para Supabase Storage.

Criterio de salida:
- Una solicitud puede tener documentos visibles y descargables desde el detalle.

### Fase 6 - Contrato PDF y Firma Digital

Objetivo: formalizar la adopcion aprobada.

- Implementar generacion de contrato PDF al aprobar solicitud.
- Guardar `Contract` con `pdfUrl` y estado `GENERATED`.
- Crear pantalla de revision/firma del contrato para adoptantes.
- Capturar firma digital y guardarla como imagen.
- Generar PDF firmado y actualizar:
  - `signedPdfUrl`
  - `signatureImageUrl`
  - `status = SIGNED`
  - `signedAt`
- Al firmar, cerrar adopcion:
  - cambiar mascota a `ADOPTED`
  - notificar adoptante
  - auditar accion

Criterio de salida:
- Una adopcion aprobada termina con contrato firmado y mascota adoptada.

### Fase 7 - Notificaciones In-App

Objetivo: hacer visibles las notificaciones que ya se crean en backend.

- Crear endpoints:
  - Listar mis notificaciones.
  - Marcar una como leida.
  - Marcar todas como leidas.
- Agregar campana o panel de notificaciones en frontend.
- Mostrar enlaces hacia solicitud, contrato o mascota segun corresponda.
- Crear notificaciones para:
  - solicitud creada
  - cambio de estado
  - contrato generado
  - contrato firmado
  - adopcion cerrada

Criterio de salida:
- Los usuarios reciben y consultan avisos dentro de la aplicacion.

### Fase 8 - Dashboard y Gestion Administrativa

Objetivo: reemplazar placeholders por vistas utiles.

- Dashboard por rol:
  - `ADMIN`: resumen de usuarios, mascotas, solicitudes y adopciones.
  - `VETERINARIAN`: mascotas en cuarentena/tratamiento e historiales recientes.
  - `VOLUNTEER`: mascotas registradas y solicitudes pendientes.
  - `ADOPTER`: solicitudes propias, contrato pendiente y recomendaciones.
- Gestion de usuarios para `ADMIN`.
- Mejorar navegacion y estados vacios por rol.

Criterio de salida:
- Cada rol tiene una primera pantalla accionable despues de iniciar sesion.

### Fase 9 - Calidad, Seguridad y Pruebas

Objetivo: preparar el prototipo para demos confiables y futuras iteraciones.

- Agregar tests backend para:
  - auth
  - permisos
  - transiciones de mascota
  - transiciones de solicitud
  - compatibilidad
- Agregar tests frontend para flujos criticos.
- Revisar manejo global de errores.
- Revisar validaciones Zod y tipos compartidos.
- Evitar secretos por defecto en produccion.
- Revisar CORS y configuracion por entorno.
- Agregar seed confiable para todos los roles y datos demo.

Criterio de salida:
- Los flujos core estan cubiertos por pruebas y el prototipo es repetible desde cero.

### Fase 10 - Documentacion Final del Prototipo

Objetivo: dejar el proyecto entendible para desarrollo, demo y entrega.

- Completar docs de API:
  - mascotas
  - compatibilidad
  - solicitudes
  - documentos
  - contratos
  - notificaciones
- Actualizar modelo de datos si cambia el esquema.
- Documentar flujo de adopcion end-to-end.
- Documentar roles y permisos reales.
- Documentar limitaciones conocidas y decisiones futuras.

Criterio de salida:
- Cualquier desarrollador puede instalar, ejecutar, probar y entender el alcance del sistema.

## Orden Recomendado de Ejecucion

1. Estabilizacion y codificacion de textos.
2. Registro y perfil.
3. Historial medico.
4. Ajuste fino de solicitudes y permisos.
5. Documentos.
6. Contrato PDF.
7. Firma digital y cierre de adopcion.
8. Notificaciones visibles.
9. Dashboards por rol.
10. Pruebas y documentacion final.

## Riesgos y Decisiones Pendientes

- Definir si `VOLUNTEER` puede cambiar estados de solicitudes o solo revisarlas.
- Definir si el cambio a `ADOPTED` ocurre al aprobar solicitud o al firmar contrato. Recomendacion: al firmar contrato.
- Definir almacenamiento local de archivos antes de implementar documentos/contratos.
- Definir si `MedicalRecord` admite edicion o solo anexos inmutables.
- Definir estrategia de tipos compartidos entre frontend y backend para reducir duplicacion.
- Resolver el estado del CLI global de `npm/npx` en el entorno local.
