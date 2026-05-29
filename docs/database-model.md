# Modelo de Datos: Rescue Pet

Este documento describe el esquema de base de datos implementado con Prisma para el prototipo funcional de Rescue Pet.

## Diagrama Conceptual

El sistema gira alrededor de tres ejes: usuarios, mascotas y proceso de adopcion.

- `User`: identidad, credenciales y roles.
- `Pet`: informacion del animal, estado actual y caracteristicas.
- `MedicalRecord`: historial clinico asociado a una mascota y a un veterinario/usuario creador.
- `AdoptionRequest`: intencion de un adoptante de adoptar una mascota.
- `CompatibilityTest` y `CompatibilityScore`: evaluacion de afinidad entre adoptante y mascota.
- `Document` y `Contract`: artefactos digitales del proceso de adopcion.
- `Notification` y `AuditLog`: comunicacion y trazabilidad.

## Entidades y Relaciones Clave

### 1. Usuarios y Roles

La tabla `User` usa el enum `Role`:

- `ADMIN`
- `VETERINARIAN`
- `VOLUNTEER`
- `ADOPTER`

Relaciones principales:

- Un usuario adoptante puede tener multiples `AdoptionRequest`.
- Un usuario veterinario puede crear multiples `MedicalRecord`.
- Un usuario puede tener multiples `CompatibilityTest`, `CompatibilityScore`, `Notification` y `AuditLog`.

### 2. Mascotas

La tabla `Pet` usa el enum `PetStatus`:

- `QUARANTINE`
- `AVAILABLE`
- `TREATMENT`
- `ADOPTED`
- `DECEASED`

Relaciones principales:

- Una mascota puede tener multiples historiales medicos.
- Una mascota puede tener multiples solicitudes de adopcion en el tiempo.
- Una mascota puede tener multiples puntajes de compatibilidad.

### 3. Solicitudes de Adopcion

`AdoptionRequest` relaciona un `User` adoptante con una `Pet`.

Estados disponibles:

- `RECEIVED`
- `INTERVIEW`
- `VISIT`
- `APPROVED`
- `REJECTED`

Una solicitud puede tener documentos y un contrato asociado.

### 4. Compatibilidad

- `CompatibilityTest`: formulario del adoptante con vivienda, patio, disponibilidad, alergias y experiencia.
- `CompatibilityScore`: puntaje de 0 a 100 entre adoptante y mascota, con una explicacion.

### 5. Documentos y Contratos

`Document` usa el enum `DocumentType`:

- `ID_CARD`
- `ADDRESS_PROOF`
- `CONTRACT`

`Contract` usa el enum `ContractStatus`:

- `GENERATED`
- `SIGNED`

El contrato puede guardar `pdfUrl`, `signedPdfUrl`, `signatureImageUrl` y `signedAt`.

### 6. Trazabilidad

- `Notification`: avisos in-app con titulo, mensaje, tipo, estado de lectura y enlace.
- `AuditLog`: accion, entidad, entidad afectada, usuario y detalles.

## Consideraciones del Prototipo

- Los IDs son UUID.
- Los campos de archivos guardan rutas o URLs como `String`.
- El almacenamiento local/simulado se podra migrar a Supabase Storage u otra solucion cloud sin cambiar el modelo principal.
- Las eliminaciones sensibles deben manejarse de forma logica con estados como `isActive` o estados terminales.
