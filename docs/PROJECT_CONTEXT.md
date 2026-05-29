# Contexto del Proyecto: Rescue Pet (Prototipo Funcional)

## 1. Objetivo del Prototipo

Rescue Pet demuestra el flujo critico de un sistema de adopcion animal. El objetivo es validar la interaccion entre Administrador, Veterinario, Voluntario y Adoptante durante el proceso de rescate, tratamiento y adopcion de una mascota.

Esta fase no busca un producto comercial completo. El foco esta en la funcionalidad core, la arquitectura base y una experiencia de usuario clara para demos y validacion.

## 2. Stack Elegido

### Frontend

- Framework: React + Vite.
- Lenguaje: TypeScript.
- Estilos y componentes: Tailwind CSS + shadcn/ui.
- Iconos: lucide-react.
- QR: visualizacion de codigos generados por backend.

### Backend

- Entorno: Node.js.
- Framework: Express.
- Lenguaje: TypeScript.
- Base de datos: PostgreSQL.
- ORM: Prisma.
- Autenticacion: JWT + bcrypt.
- Validacion: Zod.

### Otros

- Storage: local/simulado en el prototipo.
- Notificaciones: in-app simples.
- Auditoria: registros en base de datos para acciones importantes.

## 3. Modulos del Prototipo

- Autenticacion y autorizacion: registro, inicio de sesion y roles.
- Gestion de usuarios: consulta y actualizacion controlada por permisos.
- Gestion de mascotas: registro, edicion, detalle, estado y QR.
- Historial medico: modelo definido; API/UI pendientes.
- Compatibilidad: test del adoptante y catalogo ordenado por afinidad.
- Solicitudes de adopcion: creacion, revision, cambio de estado y rechazo con motivo.
- Documentos: modelo definido; carga y almacenamiento pendientes.
- Contratos: modelo definido; generacion PDF y firma pendientes.
- Notificaciones: modelo y creacion parcial; UI/API de lectura pendientes.
- Auditoria: registros para acciones core.

## 4. Modulos Simulados o Fuera del Alcance Inicial

- Pasarela de pagos.
- Chat en tiempo real.
- Almacenamiento cloud completo.
- Geolocalizacion avanzada.
- Automatizaciones externas de correo/SMS.

## 5. Flujo Principal del Sistema

1. Un Voluntario o Admin registra un animal rescatado.
2. Un Veterinario actualiza el estado clinico y autoriza que la mascota pase a disponible.
3. Un Adoptante registrado revisa el catalogo y crea una solicitud.
4. Un Admin o responsable revisa la solicitud y la mueve por las fases definidas.
5. Si se aprueba, se debe generar un contrato de adopcion.
6. El adoptante firma digitalmente el contrato.
7. La mascota pasa a adoptada y el sistema notifica el cierre.

## 6. Entidades Principales

- `User`: credenciales, datos personales, rol y estado.
- `Pet`: mascota, estado, caracteristicas, foto y QR.
- `MedicalRecord`: historial clinico de una mascota.
- `CompatibilityTest`: respuestas del adoptante para calcular afinidad.
- `CompatibilityScore`: calificacion entre adoptante y mascota.
- `AdoptionRequest`: solicitud de adopcion y estado del proceso.
- `Document`: archivos asociados a adoptante o solicitud.
- `Contract`: contrato generado y firmado.
- `Notification`: avisos in-app para usuarios.
- `AuditLog`: trazabilidad de acciones relevantes.

## 7. Roles y Permisos

- Administrador: control total del sistema.
- Veterinario: actualiza historiales medicos y estado clinico/adopcion de mascotas.
- Voluntario: registra mascotas y participa en gestion operativa.
- Adoptante: consulta catalogo, completa test, crea solicitudes y firma contratos.

## 8. Decisiones Tecnicas

- Monorepo logico con carpetas `frontend`, `backend` y `docs`.
- Prisma + PostgreSQL para un modelo relacional tipado.
- JWT para autenticacion inicial del prototipo.
- Tailwind CSS y componentes reutilizables para acelerar UI.
- Storage local/simulado para no bloquear el prototipo con infraestructura cloud.
- Auditoria y notificaciones desde etapas tempranas para mantener trazabilidad.
