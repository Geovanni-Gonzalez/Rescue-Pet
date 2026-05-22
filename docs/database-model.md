# Modelo de Datos: Rescue Pet

Este documento describe el esquema de base de datos implementado con Prisma para el prototipo funcional de Rescue Pet.

## Diagrama Conceptual

El sistema gira en torno a tres grandes ejes: **Usuarios**, **Mascotas (Pets)** y el **Proceso de Adopción**.

- **User**: Maneja la identidad y los roles dentro del sistema (Administrador, Veterinario, Voluntario, Adoptante).
- **Pet**: Almacena la información del animal, su estado actual y características.
- **MedicalRecord**: Es gestionado exclusivamente por los Veterinarios y está vinculado a un Pet y al User que lo creó.
- **AdoptionRequest**: Representa la intención de un Adoptante (User) de adoptar un Pet. Contiene el estado de la solicitud.
- **CompatibilityTest & CompatibilityScore**: Mecanismo para evaluar qué tan adecuado es un Adoptante general, y una calificación específica para una mascota.
- **Document & Contract**: Artefactos físicos/digitales generados durante el proceso de adopción, vinculados a la solicitud de adopción.
- **Notification & AuditLog**: Elementos transversales para seguimiento y comunicación en la plataforma.

## Entidades y Relaciones Clave

### 1. Gestión de Usuarios y Roles
La tabla `User` utiliza un Enum `Role` (`ADMIN`, `VETERINARIAN`, `VOLUNTEER`, `ADOPTER`).
- Un `User` puede tener múltiples `AdoptionRequests` si es adoptante.
- Un `User` (veterinario) puede crear múltiples `MedicalRecords`.
- Un `User` puede realizar múltiples `CompatibilityTests`.

### 2. Gestión de Animales (Pets)
La tabla `Pet` registra los datos del animal y utiliza el Enum `PetStatus` (`QUARANTINE`, `AVAILABLE`, `TREATMENT`, `ADOPTED`, `DECEASED`).
- Un `Pet` tiene múltiples `MedicalRecords` que narran su historia clínica.
- Un `Pet` puede tener múltiples `AdoptionRequests` a lo largo del tiempo (si intentos anteriores fallaron).
- Un `Pet` tiene una relación con `CompatibilityScore` para emparejarlo con adoptantes.

### 3. Flujo de Adopción
El corazón del prototipo.
- **AdoptionRequest**: Relaciona a un `User` (Adoptante) con un `Pet`. Tiene estados (`RECEIVED`, `INTERVIEW`, `VISIT`, `APPROVED`, `REJECTED`).
- Si una solicitud avanza, se le vinculan `Document`s (como comprobantes de domicilio o identificaciones).
- Si se aprueba, se genera un **Contract**. El `Contract` tiene un estado (`GENERATED`, `SIGNED`) y guarda la firma digital en `signatureImageUrl`.

### 4. Evaluaciones de Compatibilidad
Para facilitar el *match* entre adoptante y mascota:
- **CompatibilityTest**: Formulario que llena el adoptante indicando su tipo de vivienda, tiempo, experiencia, etc.
- **CompatibilityScore**: Un cálculo (que se implementará en la lógica de negocio) que califica de 0 a 100 qué tan buena es la coincidencia entre un `User` y un `Pet`.

### 5. Trazabilidad
- **Notification**: Notificaciones in-app simples para avisar al usuario sobre cambios en sus solicitudes o nuevos animales.
- **AuditLog**: Registro de acciones importantes (quién cambió el estado de un animal, quién aprobó una adopción), crucial para la rendición de cuentas.

## Consideraciones del Prototipo
- Se utilizan identificadores tipo **UUID** en lugar de auto-incrementables numéricos por seguridad y escalabilidad futura.
- En este modelo inicial los archivos (`fileUrl`, `pdfUrl`, `signatureImageUrl`) apuntarán a rutas de almacenamiento local simulado, con un tipo de dato `String`, lo cual permite migrar fácilmente a Supabase Storage insertando directamente las URLs generadas por la nube sin necesidad de cambiar el esquema de la base de datos.
- Las eliminaciones se manejarán lógicamente en la lógica de la aplicación usando el campo `isActive` de los usuarios o estados específicos, manteniendo la integridad referencial en `AdoptionRequest` y `AuditLog`.
