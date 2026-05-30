# Rescue Pet — Base de Desarrollo Derivada del Manual de Casos de Uso

**Documento fuente:** `Manual Casos de Uso – Rescue Pet.pdf`  
**Curso:** IC5821 - Requerimientos de Software  
**Proyecto:** Rescue Pet  
**Propósito de este archivo:** servir como guía técnica y funcional para desarrollar el sistema por fases usando Codex.

> Este `.md` no es una transcripción literal del PDF. Es una versión estructurada para implementación: módulos, casos de uso, entidades, reglas, flujos críticos, endpoints sugeridos, fases de desarrollo, criterios de aceptación y prompts para Codex.

---

## 1. Visión general del sistema

Rescue Pet es una plataforma para gestionar animales rescatados, su historial veterinario, adopciones, documentos, contratos, notificaciones, tareas operativas y reportes administrativos. El sistema contempla usuarios con roles diferenciados y aplica control de acceso basado en roles desde el backend.

### Roles principales

| Rol | Descripción | Capacidades generales |
|---|---|---|
| Administrador | Usuario con máximo control del sistema | Gestiona usuarios, mascotas, solicitudes, documentos, contratos, reportes, configuración y permisos |
| Veterinario | Responsable clínico | Gestiona expedientes clínicos, tratamientos, vacunas, alertas médicas y estados relacionados |
| Voluntario | Personal operativo del refugio | Registra mascotas, localizaciones, fotos, tareas de mantenimiento y consulta información básica |
| Adoptante | Usuario externo interesado en adoptar | Se registra, consulta catálogo, realiza test, solicita adopción, agenda entrevista, carga documentos y firma contrato |
| Sistema | Actor automático | Genera QR, alertas, notificaciones, cálculos de compatibilidad, contratos y registros de auditoría |

---

## 2. Módulos funcionales

| Módulo | Nombre | Casos de uso |
|---|---|---|
| Módulo 1 | Gestión de mascotas | CU-01 a CU-05 |
| Módulo 2 | Veterinaria | CU-06 a CU-08 |
| Módulo 3 | Usuarios y roles | CU-09 a CU-12 |
| Módulo 4 | Matchmaking con IA | CU-13 a CU-15 |
| Módulo 5 | Adopción del animal | CU-16 a CU-20 |
| Módulo 6 | Notificaciones y tareas | CU-21 a CU-24 |
| Configuración | Base de datos relacional | CU-25 |

---

## 3. Orden recomendado de implementación

Aunque el PDF presenta primero la gestión de mascotas, para desarrollo conviene implementar en este orden:

1. **Fase 0 — Arquitectura base y base de datos**
2. **Fase 1 — Usuarios, autenticación y roles**
3. **Fase 2 — Gestión de mascotas**
4. **Fase 3 — Veterinaria e historial clínico**
5. **Fase 4 — Catálogo y matchmaking**
6. **Fase 5 — Proceso de adopción**
7. **Fase 6 — Notificaciones, tareas y auditoría**
8. **Fase 7 — Reportes administrativos**
9. **Fase 8 — Pruebas, integración y despliegue**

Justificación: usuarios, roles, base de datos y mascotas son dependencias centrales. Los módulos de IA, adopción, notificaciones y reportes dependen de esas bases.

---

## 4. Reglas de negocio globales

### 4.1 Seguridad y acceso

- Toda funcionalidad interna requiere autenticación.
- El control de acceso debe validarse en backend, no únicamente en frontend.
- Se debe implementar RBAC: Role-Based Access Control.
- Las solicitudes no autorizadas a endpoints deben bloquearse y registrarse en logs.
- Las contraseñas deben almacenarse con hashing seguro.
- Los tokens o sesiones deben expirar por inactividad.
- Los documentos legales y contratos deben tener acceso privado.

### 4.2 Estados de mascota

Estados definidos:

```text
En Cuarentena -> Disponible -> En Tratamiento -> Adoptado / Fallecido
```

Reglas:

- Toda mascota nueva inicia en estado `En Cuarentena`.
- Solo las mascotas en estado `Disponible` aparecen en el catálogo público.
- Las mascotas `En Cuarentena`, `En Tratamiento`, `Adoptado` o `Fallecido` no aparecen en el catálogo público.
- El estado `Fallecido` es terminal.
- El estado `Adoptado` debe asignarse automáticamente al cerrar una adopción con contrato firmado.
- Las transiciones deben validarse en backend y en base de datos.
- Cada cambio de estado debe registrarse con usuario responsable, fecha y hora.

### 4.3 Estados de solicitud de adopción

Estados definidos:

```text
Recibida -> Entrevista -> Visita -> Aprobada / Rechazada
```

Reglas:

- Toda solicitud inicia como `Recibida`.
- `Aprobada` y `Rechazada` son estados terminales.
- No se puede aprobar si faltan documentos requeridos.
- Al aprobar, se debe generar contrato PDF.
- No se puede cerrar formalmente una adopción sin contrato firmado.

### 4.4 Archivos

Formatos permitidos:

| Tipo de archivo | Formatos |
|---|---|
| Fotos de mascota | JPG, PNG, WEBP |
| Documentos de adoptante | PDF, JPG, PNG |
| Código QR | PNG |
| Contrato | PDF |
| Reportes | PDF, Excel |

Reglas:

- Toda mascota debe tener fotografía principal obligatoria.
- La fotografía principal no puede eliminarse desde galería.
- La galería debe cargar de forma eficiente.
- Los documentos de adoptante son privados.
- Las versiones anteriores de documentos reemplazados deben archivarse.

---

## 5. Entidades de dominio sugeridas

### 5.1 Usuario

Campos sugeridos:

```text
id
full_name
email
password_hash
phone
photo_url
role_id
status: active | inactive | pending_verification | blocked
email_verified_at
last_login_at
created_at
updated_at
```

Relaciones:

- Usuario pertenece a un rol.
- Adoptante puede tener solicitudes de adopción.
- Veterinario puede estar asociado a expedientes o entradas clínicas.
- Usuario puede generar registros de auditoría.

### 5.2 Rol y permisos

```text
roles
- id
- name: Administrador | Veterinario | Voluntario | Adoptante

permissions
- id
- code
- description

role_permissions
- role_id
- permission_id
```

### 5.3 Mascota / Animal

```text
id
name
species
estimated_breed
estimated_age
size
status
main_photo_url
rescue_location_text
rescue_latitude
rescue_longitude
public_profile_url
qr_url
created_by_user_id
created_at
updated_at
```

### 5.4 Galería multimedia

```text
id
animal_id
file_url
file_type
is_main
uploaded_by_user_id
created_at
```

### 5.5 Historial de estado de mascota

```text
id
animal_id
previous_status
new_status
changed_by_user_id
reason
created_at
```

### 5.6 Expediente clínico

```text
id
animal_id
created_at
updated_at
```

### 5.7 Entrada clínica

```text
id
clinical_record_id
animal_id
veterinarian_id
datetime
diagnosis
treatment
medicine
dose
duration
observations
created_at
```

Regla: una entrada clínica debe ser inalterable después de guardada.

### 5.8 Vacuna / alerta de inmunización

```text
id
animal_id
clinical_entry_id
vaccine_type
applied_at
next_due_at
status: pending | completed | postponed
postponed_to
created_at
updated_at
```

### 5.9 Test de compatibilidad

```text
id
adopter_id
housing_type
has_yard
children_count
has_other_pets
daily_available_time
allergies
experience_level
created_at
updated_at
```

### 5.10 Índice de compatibilidad

```text
id
adopter_id
animal_id
score_percentage
calculated_at
```

### 5.11 Solicitud de adopción

```text
id
adopter_id
animal_id
status: Recibida | Entrevista | Visita | Aprobada | Rechazada
rejection_reason
created_at
updated_at
```

### 5.12 Slot de entrevista

```text
id
starts_at
ends_at
status: available | reserved | cancelled
reserved_by_application_id
created_by_admin_id
created_at
updated_at
```

### 5.13 Documento de adoptante

```text
id
adopter_id
application_id
document_type: identity | address_proof
file_url
version
status: active | archived
uploaded_at
```

### 5.14 Contrato de adopción

```text
id
application_id
animal_id
adopter_id
pdf_url
signed_pdf_url
signature_image_url
status: generated | signed
created_at
signed_at
```

### 5.15 Notificación

```text
id
user_id
type
title
message
resource_type
resource_id
read_at
created_at
```

### 5.16 Tarea operativa

```text
id
animal_id
type: health | medication | cleaning | feeding | maintenance
assigned_role
scheduled_at
status: pending | completed
created_at
updated_at
```

### 5.17 Auditoría

```text
id
user_id
action
entity_type
entity_id
metadata_json
ip_address
created_at
```

---

## 6. Casos de uso convertidos a requerimientos de desarrollo

## Módulo 1 — Gestión de mascotas

### CU-01 — Registrar Mascota

**Objetivo:** registrar un animal rescatado con datos básicos, foto principal, QR y estado inicial.

**Actores:** Voluntario, Administrador.

**Requisitos funcionales:**

- Crear formulario de registro de mascota.
- Campos: nombre, especie, raza estimada, edad, tamaño.
- Permitir ubicación opcional de rescate.
- Exigir fotografía principal.
- Validar formato y tamaño de imagen.
- Guardar mascota con estado inicial `En Cuarentena`.
- Generar QR único automáticamente.
- Mostrar confirmación y opción de descarga del QR.

**Criterios de aceptación:**

- No se puede guardar sin foto principal.
- No se puede guardar con campos obligatorios vacíos.
- El QR queda asociado a la mascota.
- La mascota no aparece en catálogo público hasta estar `Disponible`.

**Endpoints sugeridos:**

```http
POST /api/animals
GET /api/animals/:id
```

---

### CU-02 — Registrar Localización de Rescate

**Objetivo:** registrar o actualizar coordenadas o dirección física del rescate.

**Actores:** Voluntario, Administrador.

**Requisitos funcionales:**

- Mostrar sección de localización en perfil de mascota.
- Integrar Google Maps o componente equivalente.
- Permitir selección de coordenadas.
- Permitir dirección manual si el mapa falla.
- Archivar localización anterior si se modifica.
- Advertir si coordenadas están fuera de Costa Rica.

**Criterios de aceptación:**

- Debe guardarse al menos coordenada o texto.
- Si falla el mapa, se mantiene opción manual.
- La localización es visible para roles internos.

**Endpoints sugeridos:**

```http
PUT /api/animals/:id/rescue-location
GET /api/animals/:id/location-history
```

---

### CU-03 — Gestionar Galería Multimedia

**Objetivo:** cargar, visualizar y eliminar imágenes adicionales de una mascota.

**Actores:** Voluntario, Administrador.

**Requisitos funcionales:**

- Mostrar carrusel de imágenes.
- Permitir subir una o varias fotos.
- Permitir captura desde cámara móvil.
- Validar JPG, PNG y WEBP.
- Mostrar progreso de carga.
- Permitir eliminar imágenes secundarias.
- Bloquear eliminación de fotografía principal.

**Criterios de aceptación:**

- Un archivo inválido no detiene la carga de archivos válidos.
- Si falla almacenamiento, se cancelan archivos parciales.
- La galería carga en máximo 3 segundos como objetivo de rendimiento.

**Endpoints sugeridos:**

```http
POST /api/animals/:id/gallery
DELETE /api/animals/:id/gallery/:imageId
GET /api/animals/:id/gallery
```

---

### CU-04 — Actualizar Estado de Mascota

**Objetivo:** controlar el ciclo de vida de la mascota mediante una máquina de estados.

**Actores:** Administrador, Veterinario.

**Requisitos funcionales:**

- Mostrar estado actual y transiciones disponibles.
- Solicitar confirmación antes de cambiar estado.
- Validar transición en backend y base de datos.
- Registrar cambio con timestamp y usuario.
- Actualizar visibilidad pública según estado.
- Si se cambia a `Disponible`, validar foto e historial clínico básico.
- Para `Fallecido`, requerir doble confirmación y causa opcional.

**Criterios de aceptación:**

- Transiciones inválidas son rechazadas.
- Estado `Fallecido` no permite transiciones posteriores.
- Mascota con solicitud activa no puede cambiarse sin resolver conflicto.

**Endpoints sugeridos:**

```http
PATCH /api/animals/:id/status
GET /api/animals/:id/status-history
```

---

### CU-05 — Generar y Descargar Código QR

**Objetivo:** generar QR único por mascota para redirigir a perfil público.

**Actores:** Sistema, Administrador, Voluntario.

**Requisitos funcionales:**

- Generar QR al crear mascota.
- Usar URL pública del perfil.
- Usar corrección de errores alta.
- Permitir descarga en PNG.
- Permitir regenerar QR.
- Si falla acortador de URL, usar URL completa.

**Criterios de aceptación:**

- El QR se mantiene disponible en el perfil.
- El perfil puede existir aunque el QR falle inicialmente.
- El sistema registra errores de generación y programa reintento.

**Endpoints sugeridos:**

```http
POST /api/animals/:id/qr/regenerate
GET /api/animals/:id/qr/download
```

---

## Módulo 2 — Veterinaria

### CU-06 — Registrar Entrada en Historial Clínico

**Objetivo:** registrar información médica cronológica e inalterable por mascota.

**Actores:** Veterinario, Administrador.

**Requisitos funcionales:**

- Crear expediente clínico por mascota.
- Listar entradas en orden cronológico.
- Agregar nueva entrada clínica.
- Campos: fecha/hora, diagnóstico, tratamiento, medicamento, dosis, duración, veterinario responsable, observaciones.
- Bloquear edición y eliminación de registros anteriores.

**Criterios de aceptación:**

- No se guarda sin diagnóstico y tratamiento.
- Si falla SQL Server, se conserva la información en pantalla.
- Voluntario solo puede ver resumen básico.

**Endpoints sugeridos:**

```http
GET /api/animals/:id/clinical-record
POST /api/animals/:id/clinical-record/entries
```

---

### CU-07 — Gestionar Alertas de Inmunización

**Objetivo:** calcular próximas dosis y generar alertas preventivas.

**Actores:** Sistema, Veterinario, Voluntario, Administrador.

**Requisitos funcionales:**

- Ejecutar motor periódico de reglas.
- Calcular próxima dosis según última vacuna.
- Generar alerta 72 horas antes.
- Permitir confirmar aplicación.
- Permitir postergar tratamiento con nueva fecha.
- Notificar al Administrador si una vacuna no tiene intervalo configurado.

**Criterios de aceptación:**

- Alertas inconsistentes no se generan para evitar medicación errónea.
- Ajustes manuales quedan registrados.

**Endpoints sugeridos:**

```http
GET /api/immunization-alerts
POST /api/immunization-alerts/:id/complete
POST /api/immunization-alerts/:id/postpone
```

---

### CU-08 — Consultar Expediente Médico por Rol

**Objetivo:** mostrar información médica según rol.

**Actores:** Administrador, Veterinario, Voluntario, Adoptante.

**Requisitos funcionales:**

- Administrador: acceso completo.
- Veterinario: acceso completo a animales bajo su cargo.
- Voluntario: solo resumen básico.
- Adoptante: acceso denegado.
- Ocultar botones restringidos en frontend, pero validar en backend.

**Criterios de aceptación:**

- Adoptante recibe error de autorización.
- Voluntario no ve diagnósticos detallados ni tratamientos.
- Veterinario no accede a expedientes fuera de su responsabilidad.

**Endpoints sugeridos:**

```http
GET /api/animals/:id/medical-summary
GET /api/animals/:id/clinical-record
```

---

## Módulo 3 — Usuarios y roles

### CU-09 — Autenticar Usuario

**Objetivo:** iniciar sesión de forma segura.

**Actores:** Administrador, Veterinario, Voluntario, Adoptante.

**Requisitos funcionales:**

- Login con correo y contraseña.
- Comparar contraseña con hash almacenado.
- Validar cuenta activa y verificada.
- Crear sesión o token con expiración.
- Redirigir según rol.
- Recuperar contraseña mediante token temporal.
- Cerrar sesión por inactividad.
- Bloquear temporalmente ante múltiples intentos fallidos.

**Criterios de aceptación:**

- Mensaje de error genérico para credenciales inválidas.
- Cuenta no verificada muestra opción de reenviar activación.
- Todo inicio de sesión se registra en log.

**Endpoints sugeridos:**

```http
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/resend-activation
```

---

### CU-10 — Gestionar Perfil de Usuario

**Objetivo:** crear, consultar, modificar y desactivar perfiles.

**Actores:** Administrador, Veterinario, Voluntario, Adoptante.

**Requisitos funcionales:**

- Cada usuario puede editar su información de contacto.
- Cada usuario puede cambiar su contraseña.
- Administrador puede crear Veterinarios y Voluntarios.
- Administrador puede modificar roles.
- Administrador puede desactivar usuarios.
- La baja es lógica, no física.

**Criterios de aceptación:**

- Un usuario no administrador no puede modificar su rol.
- No se permiten correos duplicados.
- Cambiar contraseña invalida sesiones anteriores.

**Endpoints sugeridos:**

```http
GET /api/users/me
PUT /api/users/me
PUT /api/users/me/password
POST /api/users
PUT /api/users/:id
PATCH /api/users/:id/deactivate
```

---

### CU-11 — Controlar Acceso por Rol

**Objetivo:** aplicar RBAC en cada solicitud.

**Actores:** Sistema, Administrador.

**Requisitos funcionales:**

- Middleware de autorización por recurso y acción.
- Matriz de permisos por rol.
- Panel para modificar permisos de Veterinario y Voluntario.
- Cambios aplican en la siguiente solicitud del usuario afectado.
- Registrar intentos no autorizados.

**Criterios de aceptación:**

- Un endpoint restringido no puede ejecutarse aunque el usuario fuerce la URL.
- El frontend oculta acciones no permitidas.
- El backend registra IP, usuario, rol y recurso.

**Endpoints sugeridos:**

```http
GET /api/roles
GET /api/permissions
PUT /api/roles/:id/permissions
```

---

### CU-12 — Registrar Adoptante

**Objetivo:** permitir registro público de adoptantes con verificación por correo.

**Actores:** Adoptante, Sistema.

**Requisitos funcionales:**

- Formulario público sin autenticación previa.
- Campos: nombre completo, correo, contraseña, confirmación.
- Validar formato de correo y política de contraseña.
- Crear cuenta pendiente de verificación.
- Generar token de activación.
- Enviar correo de activación.
- Activar cuenta y asignar rol `Adoptante`.

**Criterios de aceptación:**

- No revelar si una cuenta duplicada está activa o inactiva.
- Token vencido permite solicitar nuevo correo.
- Token inválido se registra como evento de seguridad.

**Endpoints sugeridos:**

```http
POST /api/auth/register-adopter
GET /api/auth/activate?token=...
POST /api/auth/resend-activation
```

---

## Módulo 4 — Matchmaking con IA

### CU-13 — Visualizar Catálogo con Filtros e IA

**Objetivo:** mostrar mascotas disponibles y reordenarlas por afinidad.

**Actores:** Adoptante, Voluntario, Administrador.

**Requisitos funcionales:**

- Mostrar solo mascotas `Disponible`.
- Tarjetas con foto, nombre, especie, tamaño y edad.
- Filtros por especie, tamaño y edad.
- Si hay test, ordenar por compatibilidad.
- Si no hay test, ordenar por fecha de ingreso.
- Usar placeholder si falla imagen.

**Criterios de aceptación:**

- Si filtros no arrojan resultados, mostrar mensaje claro.
- Catálogo debe ser responsive.

**Endpoints sugeridos:**

```http
GET /api/catalog/animals
GET /api/catalog/animals/:id
```

---

### CU-14 — Completar Test de Compatibilidad

**Objetivo:** recopilar datos del estilo de vida del adoptante.

**Actor:** Adoptante.

**Requisitos funcionales:**

- Formulario con secciones: entorno, convivencia, disponibilidad, salud y experiencia.
- Campos: tipo de vivienda, patio, niños, otras mascotas, tiempo disponible, alergias, experiencia.
- Validar preguntas obligatorias.
- Guardar respuestas en SQL Server.
- Permitir modificar respuestas anteriores.
- Disparar recálculo de afinidad.

**Criterios de aceptación:**

- No se puede finalizar con campos obligatorios vacíos.
- Si falla guardado, no se pierden respuestas.

**Endpoints sugeridos:**

```http
GET /api/adopters/me/compatibility-test
PUT /api/adopters/me/compatibility-test
```

---

### CU-15 — Calcular Índice de Compatibilidad

**Objetivo:** calcular porcentaje de afinidad entre adoptante y mascotas disponibles.

**Actores:** Sistema, Adoptante.

**Requisitos funcionales:**

- Recuperar respuestas del test.
- Recuperar datos técnicos de mascotas disponibles.
- Comparar variables equivalentes.
- Aplicar pesos y puntajes.
- Calcular 0% a 100%.
- Guardar resultados por adoptante y mascota.
- Notificar al frontend que el cálculo terminó.

**Criterios de aceptación:**

- Mascotas sin variables de temperamento reciben puntaje neutro definido.
- Si hay sobrecarga, mostrar mensaje de espera.

**Endpoints sugeridos:**

```http
POST /api/adopters/me/compatibility/recalculate
GET /api/adopters/me/compatibility-results
```

---

## Módulo 5 — Adopción del animal

### CU-16 — Enviar Solicitud de Adopción

**Objetivo:** permitir al adoptante solicitar una mascota disponible.

**Actor:** Adoptante.

**Requisitos funcionales:**

- Botón `Solicitar Adopción` en perfil de mascota disponible.
- Confirmación antes de enviar.
- Crear solicitud en estado `Recibida`.
- Notificar inmediatamente al Administrador.
- Mostrar solicitud en tablero del adoptante.

**Criterios de aceptación:**

- Si la mascota ya no está disponible, bloquear solicitud.
- Si ya existe solicitud activa para la misma mascota, redirigir a la existente.
- Si falla notificación, la solicitud se crea y se reintenta la notificación.

**Endpoints sugeridos:**

```http
POST /api/adoption-applications
GET /api/adoption-applications/:id
```

---

### CU-17 — Agendar Entrevista de Adopción

**Objetivo:** coordinar cita mediante slots reservables.

**Actores:** Administrador, Adoptante.

**Requisitos funcionales:**

- Administrador crea slots disponibles.
- Adoptante ve slots vinculados a su solicitud.
- Adoptante reserva un slot.
- Aplicar lock transaccional para evitar doble reserva.
- Cambiar solicitud a `Entrevista`.
- Notificar a Administrador y Adoptante.

**Criterios de aceptación:**

- Dos adoptantes no pueden reservar el mismo slot.
- Si no hay slots, mostrar mensaje de no disponibilidad.
- Si la solicitud ya no está en estado válido, bloquear reserva.

**Endpoints sugeridos:**

```http
POST /api/interview-slots
GET /api/interview-slots/available
POST /api/adoption-applications/:id/schedule-interview
PATCH /api/interview-slots/:id/cancel
```

---

### CU-18 — Consultar Tablero de Seguimiento

**Objetivo:** mostrar estado y detalle de solicitudes.

**Actores:** Administrador, Adoptante.

**Requisitos funcionales:**

- Administrador ve todas las solicitudes.
- Adoptante ve solo sus solicitudes.
- Mostrar estado actual, mascota, adoptante, historial y motivo de rechazo.
- Administrador puede filtrar por estado, fecha, mascota o adoptante.
- Administrador puede transicionar al siguiente estado válido.
- Al rechazar, exigir motivo.
- Al aprobar, disparar generación de contrato.

**Criterios de aceptación:**

- Estados terminales no pueden modificarse.
- No se aprueba sin documentos requeridos.
- Cambios son visibles inmediatamente.

**Endpoints sugeridos:**

```http
GET /api/adoption-applications
GET /api/adoption-applications/:id
PATCH /api/adoption-applications/:id/status
```

---

### CU-19 — Gestionar Repositorio Documental

**Objetivo:** cargar documentos privados del adoptante.

**Actores:** Adoptante, Administrador.

**Requisitos funcionales:**

- Adoptante carga cédula y comprobante de domicilio.
- Permitir PDF, JPG, PNG.
- Permitir captura desde cámara móvil.
- Al reemplazar, archivar versión anterior.
- Administrador recibe notificación.
- Solo Administrador accede a documentos.

**Criterios de aceptación:**

- No se puede cargar documentos sin solicitud activa.
- Archivos inválidos son rechazados.
- Si falla almacenamiento, documentos previos se conservan.

**Endpoints sugeridos:**

```http
POST /api/adoption-applications/:id/documents
GET /api/adoption-applications/:id/documents
PUT /api/documents/:id/replace
```

---

### CU-20 — Firmar Contrato de Adopción

**Objetivo:** generar PDF, capturar firma y cerrar adopción.

**Actores:** Sistema, Adoptante, Administrador.

**Requisitos funcionales:**

- Al aprobar solicitud, generar contrato PDF.
- Incluir datos de mascota, adoptante, fecha y cláusulas.
- Mostrar contrato al adoptante.
- Capturar firma en canvas HTML5.
- Incrustar firma en PDF final.
- Guardar PDF firmado en repositorio privado.
- Cambiar mascota a `Adoptado`.
- Cerrar solicitud formalmente.

**Criterios de aceptación:**

- No se puede cerrar sin PDF firmado.
- Si falla generación PDF, solicitud queda en `Aprobada` y mascota no cambia.
- Canvas debe funcionar en móvil.

**Endpoints sugeridos:**

```http
POST /api/adoption-applications/:id/contract/generate
GET /api/adoption-applications/:id/contract
POST /api/adoption-applications/:id/contract/sign
```

---

## Módulo 6 — Notificaciones, tareas y reportes

### CU-21 — Notificar Solicitudes y Documentos

**Objetivo:** alertar al Administrador sobre solicitudes y documentos.

**Actores:** Sistema, Administrador.

**Requisitos funcionales:**

- Detectar nueva solicitud o documento.
- Crear notificación con tipo de evento y adoptante.
- Enviar en tiempo real vía in-app o push.
- Redirigir al tablero de seguimiento.
- Si Administrador está desconectado, retener notificación o enviar push.

**Criterios de aceptación:**

- Si falla tiempo real, se registra para consulta manual.
- Si recurso ya no existe, mostrar mensaje.

**Endpoints sugeridos:**

```http
GET /api/notifications
PATCH /api/notifications/:id/read
```

---

### CU-22 — Generar Notificaciones de Salud y Mantenimiento

**Objetivo:** alertar sobre medicaciones, citas y tareas de limpieza.

**Actores:** Sistema, Veterinario, Voluntario.

**Requisitos funcionales:**

- Monitorear horarios de medicación y mantenimiento.
- Generar alerta con animal, tarea y hora.
- Notificar a Veterinario o Voluntario según tipo.
- Agrupar tareas simultáneas para evitar saturación.
- Si push está desactivado, mantener alerta in-app.

**Criterios de aceptación:**

- Alertas médicas críticas van al Veterinario.
- Limpieza y alimentación priorizan Voluntario.

**Endpoints sugeridos:**

```http
GET /api/tasks/alerts
POST /api/tasks
```

---

### CU-23 — Certificar Ejecución de Labores

**Objetivo:** registrar ejecución de tareas para auditoría.

**Actores:** Voluntario, Veterinario, Administrador.

**Requisitos funcionales:**

- Mostrar tareas pendientes.
- Permitir confirmar tarea realizada.
- Capturar usuario, fecha y hora exacta del servidor.
- Permitir comentario opcional.
- Guardar registro inalterable.
- Marcar alerta como completada.

**Criterios de aceptación:**

- Doble clic no genera doble auditoría.
- Si no se puede escribir auditoría, la tarea no se marca completada.

**Endpoints sugeridos:**

```http
POST /api/tasks/:id/complete
GET /api/audit/task-completions
```

---

### CU-24 — Generar Informes Estadísticos

**Objetivo:** generar reportes administrativos exportables.

**Actor:** Administrador.

**Requisitos funcionales:**

- Reportes de adopciones.
- Reportes de salud.
- Filtros de adopción: fechas, especie, métricas de IA.
- Filtros de salud: tratamiento activo, vacunas pendientes.
- Vista previa en pantalla.
- Exportación PDF o Excel.
- Reporte general del último mes si no hay filtros.

**Criterios de aceptación:**

- Si no hay datos, bloquear exportación.
- El proceso es de solo lectura.
- Si falla PDF, sugerir Excel y viceversa.

**Endpoints sugeridos:**

```http
GET /api/reports/adoptions
GET /api/reports/health
GET /api/reports/adoptions/export?format=pdf|xlsx
GET /api/reports/health/export?format=pdf|xlsx
```

---

## Configuración — Base de datos

### CU-25 — Configurar Nodo de Base de Datos Relacional

**Objetivo:** configurar SQL Server y verificar integridad.

**Actor:** Administrador.

**Requisitos funcionales:**

- Panel de configuración del sistema.
- Mostrar estado de conexión.
- Inicializar o actualizar estructura.
- Ejecutar scripts DDL.
- Verificar llaves foráneas y restricciones.
- Hacer prueba de escritura y lectura.
- Registrar operación en auditoría.
- Permitir migrar datos desde versiones anteriores o archivos planos.

**Criterios de aceptación:**

- Credenciales incorrectas bloquean operación.
- Falta de almacenamiento detiene proceso con alerta crítica.
- Base queda lista para soportar todos los módulos.

**Endpoints sugeridos:**

```http
GET /api/system/database/status
POST /api/system/database/migrate
POST /api/system/database/test
```

---

## 7. Fases de desarrollo para Codex

## Fase 0 — Arquitectura base

**Objetivo:** preparar el proyecto sin implementar aún todos los módulos.

**Tareas:**

- Crear estructura del repositorio.
- Configurar backend.
- Configurar frontend responsive.
- Configurar conexión a SQL Server.
- Crear sistema de migraciones.
- Crear sistema de variables de entorno.
- Crear seed de roles.
- Crear middleware base de errores.
- Crear logger.
- Crear README inicial.

**Prompt para Codex:**

```text
Analiza el repositorio actual y prepara la arquitectura base para Rescue Pet.

Necesito una aplicación modular con backend, frontend responsive, SQL Server, autenticación por roles, almacenamiento de archivos y soporte para futuras migraciones.

Crea la estructura inicial del proyecto, variables de entorno, conexión a base de datos, seed de roles, middleware de errores, logger y README inicial.

No implementes todavía los casos de uso completos. Solo deja la base técnica preparada para desarrollar por fases.
```

---

## Fase 1 — Usuarios, autenticación y roles

**Casos incluidos:** CU-09, CU-10, CU-11, CU-12.

**Tareas:**

- Registro público de adoptantes.
- Activación por correo.
- Login.
- Recuperación de contraseña.
- Gestión de perfil.
- Creación de usuarios internos.
- Baja lógica.
- Middleware RBAC.
- Logs de seguridad.

**Prompt para Codex:**

```text
Implementa la Fase 1 de Rescue Pet: usuarios, autenticación y roles.

Incluye CU-09, CU-10, CU-11 y CU-12.

Requisitos principales:
- Login con email y contraseña.
- Hash seguro de contraseñas.
- Sesiones o tokens con expiración.
- Roles: Administrador, Veterinario, Voluntario, Adoptante.
- Middleware RBAC en backend.
- Registro público de Adoptante con verificación por correo.
- Recuperación de contraseña.
- Gestión de perfil.
- Administrador puede crear Veterinarios y Voluntarios.
- Baja lógica de usuarios.
- Pruebas para login, registro, permisos y acceso no autorizado.
```

---

## Fase 2 — Gestión de mascotas

**Casos incluidos:** CU-01, CU-02, CU-03, CU-04, CU-05.

**Tareas:**

- CRUD principal de mascotas.
- Foto principal obligatoria.
- Galería multimedia.
- Localización de rescate.
- Máquina de estados.
- Historial de cambios.
- QR descargable.

**Prompt para Codex:**

```text
Implementa la Fase 2 de Rescue Pet: gestión de mascotas.

Incluye CU-01, CU-02, CU-03, CU-04 y CU-05.

Requisitos principales:
- Registro de mascota con estado inicial En Cuarentena.
- Foto principal obligatoria.
- Galería multimedia con JPG, PNG y WEBP.
- Localización con coordenadas opcionales y dirección manual.
- Máquina de estados validada en backend y base de datos.
- Historial de cambios de estado.
- Generación y descarga de QR en PNG.
- Catálogo público solo para mascotas Disponibles.
- Pruebas de validación, archivos, estados y QR.
```

---

## Fase 3 — Veterinaria

**Casos incluidos:** CU-06, CU-07, CU-08.

**Tareas:**

- Expediente clínico.
- Entradas clínicas inalterables.
- Vacunas.
- Alertas 72 horas antes.
- Acceso por rol.

**Prompt para Codex:**

```text
Implementa la Fase 3 de Rescue Pet: módulo veterinario.

Incluye CU-06, CU-07 y CU-08.

Requisitos principales:
- Expediente clínico por mascota.
- Entradas clínicas cronológicas e inalterables.
- Campos médicos obligatorios.
- Alertas de inmunización 72 horas antes.
- Confirmar dosis o postergar tratamiento.
- Acceso completo para Administrador y Veterinario autorizado.
- Resumen básico para Voluntario.
- Acceso denegado para Adoptante.
- Pruebas de permisos, expedientes y alertas.
```

---

## Fase 4 — Catálogo y matchmaking

**Casos incluidos:** CU-13, CU-14, CU-15.

**Tareas:**

- Catálogo público filtrable.
- Test de compatibilidad.
- Algoritmo de afinidad.
- Ordenamiento personalizado.

**Prompt para Codex:**

```text
Implementa la Fase 4 de Rescue Pet: catálogo y matchmaking.

Incluye CU-13, CU-14 y CU-15.

Requisitos principales:
- Mostrar únicamente mascotas Disponibles.
- Filtros por especie, tamaño y edad.
- Test de compatibilidad para Adoptantes.
- Guardar y actualizar respuestas.
- Calcular afinidad 0 a 100 usando reglas y pesos.
- Guardar resultados por adoptante y mascota.
- Reordenar catálogo por compatibilidad.
- Si no hay test, ordenar por fecha de ingreso.
- Pruebas de filtros, test y cálculo.
```

---

## Fase 5 — Adopción

**Casos incluidos:** CU-16, CU-17, CU-18, CU-19, CU-20.

**Tareas:**

- Solicitud de adopción.
- Tablero de seguimiento.
- Agenda de entrevistas.
- Repositorio documental.
- Contrato PDF.
- Firma digital.
- Cierre de adopción.

**Prompt para Codex:**

```text
Implementa la Fase 5 de Rescue Pet: proceso de adopción.

Incluye CU-16, CU-17, CU-18, CU-19 y CU-20.

Requisitos principales:
- Solicitud de adopción para mascotas Disponibles.
- Estado inicial Recibida.
- Tablero para Administrador y Adoptante.
- Estados: Recibida, Entrevista, Visita, Aprobada, Rechazada.
- Agenda con slots y bloqueo transaccional.
- Carga privada de cédula y comprobante de domicilio.
- Generación de contrato PDF al aprobar.
- Firma digital con canvas.
- PDF firmado privado.
- Cambio automático de mascota a Adoptado.
- Pruebas de flujo completo, documentos, agenda y contrato.
```

---

## Fase 6 — Notificaciones, tareas y auditoría

**Casos incluidos:** CU-21, CU-22, CU-23.

**Tareas:**

- Centro de notificaciones.
- Alertas de solicitudes y documentos.
- Alertas de salud y mantenimiento.
- Confirmación de tareas.
- Auditoría inalterable.

**Prompt para Codex:**

```text
Implementa la Fase 6 de Rescue Pet: notificaciones, tareas y auditoría.

Incluye CU-21, CU-22 y CU-23.

Requisitos principales:
- Notificaciones in-app.
- Soporte preparado para push.
- Notificar al Administrador por solicitudes y documentos.
- Notificar a Veterinario o Voluntario según tipo de tarea.
- Centro de notificaciones por usuario.
- Confirmar tarea realizada con timestamp del servidor.
- Registro de auditoría inalterable.
- Evitar doble confirmación por doble clic o error de red.
- Pruebas de notificaciones, permisos y auditoría.
```

---

## Fase 7 — Reportes administrativos

**Caso incluido:** CU-24.

**Tareas:**

- Reportes de adopción.
- Reportes de salud.
- Filtros.
- Vista previa.
- Exportación PDF y Excel.

**Prompt para Codex:**

```text
Implementa la Fase 7 de Rescue Pet: reportes administrativos.

Incluye CU-24.

Requisitos principales:
- Reportes solo para Administrador.
- Reporte de adopciones.
- Reporte de salud.
- Filtros por fechas, especie, métricas de IA, tratamiento activo y vacunas pendientes.
- Vista previa.
- Exportación PDF y Excel.
- Bloquear exportación si no hay datos.
- Proceso solo lectura.
- Pruebas para filtros y exportación.
```

---

## Fase 8 — Integración, pruebas y despliegue

**Objetivo:** validar el sistema completo.

**Tareas:**

- Pruebas E2E.
- Pruebas por rol.
- Pruebas móviles.
- Validación de seguridad.
- Validación de logs.
- Revisión de rendimiento.
- README final.
- Configuración de despliegue.

**Prompt para Codex:**

```text
Realiza la Fase 8 de Rescue Pet: integración, pruebas finales y preparación de despliegue.

Crea pruebas E2E para:
1. Registro de adoptante.
2. Activación de cuenta.
3. Login.
4. Registro de mascota.
5. Cambio de estado a Disponible.
6. Test de compatibilidad.
7. Solicitud de adopción.
8. Agenda de entrevista.
9. Carga de documentos.
10. Aprobación de solicitud.
11. Generación de contrato.
12. Firma digital.
13. Cambio de mascota a Adoptado.

Además:
- Validar RBAC en backend.
- Validar responsive móvil.
- Revisar manejo de errores.
- Revisar logs y auditoría.
- Preparar README final con instalación, variables, migraciones y datos de prueba.
```

---

## 8. Matriz de permisos inicial sugerida

| Recurso / Acción | Administrador | Veterinario | Voluntario | Adoptante |
|---|---:|---:|---:|---:|
| Registrar mascota | Sí | No | Sí | No |
| Editar mascota | Sí | Parcial | Parcial | No |
| Cambiar estado mascota | Sí | Sí | No | No |
| Gestionar galería | Sí | No | Sí | No |
| Ver catálogo | Sí | Sí | Sí | Sí |
| Registrar historial clínico | Sí | Sí | No | No |
| Ver historial clínico completo | Sí | Sí, si asignado | No | No |
| Ver resumen médico básico | Sí | Sí | Sí | No |
| Crear usuarios internos | Sí | No | No | No |
| Registrar adoptante | No aplica | No aplica | No aplica | Sí |
| Enviar solicitud adopción | No | No | No | Sí |
| Gestionar solicitudes | Sí | No | No | Solo propias |
| Cargar documentos | No | No | No | Sí, propios |
| Ver documentos | Sí | No | No | Solo metadatos propios |
| Generar contrato | Sí/Sistema | No | No | No |
| Firmar contrato | No | No | No | Sí, propio |
| Confirmar tareas | Sí | Sí | Sí | No |
| Ver reportes | Sí | No | No | No |

---

## 9. Requisitos no funcionales

### Seguridad

- Hash seguro de contraseñas.
- Tokens temporales para recuperación y activación.
- RBAC en backend.
- Logs de intentos no autorizados.
- Acceso privado a documentos y contratos.
- Validación de archivos.
- Protección contra enumeración de usuarios.

### Rendimiento

- Galería de imágenes debe cargar rápido.
- Catálogo debe usar paginación o carga diferida si crece.
- Imágenes deben optimizarse.
- Cálculo de compatibilidad debe ejecutarse de forma eficiente.

### Trazabilidad

- Registrar cambios de estado.
- Registrar modificaciones de permisos.
- Registrar inicio de sesión.
- Registrar ejecución de tareas.
- Registrar fallos críticos de servicios externos.

### Usabilidad

- El sistema debe ser operativo desde móvil.
- Firma digital debe funcionar en pantallas táctiles.
- Carga de documentos debe permitir cámara móvil.
- Mensajes de error deben ser claros.

---

## 10. Diagramas identificados en el PDF

El PDF incluye secciones visuales que deben usarse como referencia para validar el desarrollo:

| Páginas | Contenido |
|---|---|
| 35 a 39 | Diagramas de casos de uso por módulo |
| 40 a 49 | Diagramas de estados |
| 50 a 55 | Diagramas de actividades |
| 56 | Cronograma del proyecto |

### Interpretación para desarrollo

- Los diagramas de casos de uso validan actores y relaciones por módulo.
- Los diagramas de estados deben transformarse en validaciones backend y constraints de base de datos.
- Los diagramas de actividades deben transformarse en flujos de UI, servicios y pruebas E2E.
- El cronograma muestra trabajo por módulos durante abril y mayo, con responsables identificados por color.

---

## 11. Checklist de desarrollo

### Base técnica

- [ ] Repositorio configurado.
- [ ] Variables de entorno.
- [ ] SQL Server conectado.
- [ ] Migraciones.
- [ ] Seed de roles.
- [ ] Logger.
- [ ] Middleware de errores.

### Usuarios

- [ ] Registro adoptante.
- [ ] Activación por correo.
- [ ] Login.
- [ ] Recuperación contraseña.
- [ ] Gestión de perfil.
- [ ] Gestión usuarios internos.
- [ ] RBAC backend.

### Mascotas

- [ ] Registro mascota.
- [ ] Foto principal.
- [ ] Galería.
- [ ] Localización.
- [ ] QR.
- [ ] Máquina de estados.
- [ ] Historial de estados.

### Veterinaria

- [ ] Expediente clínico.
- [ ] Entradas inalterables.
- [ ] Vacunas.
- [ ] Alertas 72 horas.
- [ ] Vistas por rol.

### Matchmaking

- [ ] Catálogo.
- [ ] Filtros.
- [ ] Test.
- [ ] Algoritmo.
- [ ] Orden por compatibilidad.

### Adopción

- [ ] Solicitud.
- [ ] Tablero.
- [ ] Agenda.
- [ ] Documentos.
- [ ] Contrato.
- [ ] Firma.
- [ ] Cierre.

### Operación

- [ ] Notificaciones.
- [ ] Tareas.
- [ ] Auditoría.
- [ ] Reportes.

### Final

- [ ] Pruebas unitarias.
- [ ] Pruebas integración.
- [ ] Pruebas E2E.
- [ ] Pruebas responsive.
- [ ] README final.
- [ ] Despliegue.

---

## 12. Prompt maestro para iniciar con Codex

```text
Quiero desarrollar el sistema Rescue Pet por fases a partir del manual de casos de uso.

Antes de escribir código, analiza el repositorio actual y genera un plan técnico de implementación dividido en fases.

El sistema debe cubrir:
- Gestión de usuarios y roles.
- Gestión de mascotas.
- Historial clínico veterinario.
- Catálogo público.
- Test de compatibilidad y matchmaking.
- Proceso de adopción.
- Documentos privados.
- Contrato PDF con firma digital.
- Notificaciones.
- Tareas y auditoría.
- Reportes administrativos.
- SQL Server.
- Control RBAC en backend.

Primero revisa la arquitectura existente, identifica qué falta y propón el plan de archivos, modelos, endpoints, pantallas y migraciones.

No implementes todavía. Devuélveme un plan técnico por fases con tareas concretas y dependencias.
```

---

## 13. Regla de trabajo recomendada con Codex

No pedir a Codex que implemente todo Rescue Pet de una sola vez.

Flujo recomendado:

1. Darle el prompt maestro.
2. Revisar el plan generado.
3. Pedir implementación de una sola fase.
4. Ejecutar pruebas.
5. Corregir errores.
6. Hacer commit.
7. Pasar a la siguiente fase.

Formato recomendado de trabajo:

```text
Implementa únicamente la Fase X.
No modifiques módulos fuera del alcance salvo que sea necesario para integrar.
Crea migraciones, endpoints, servicios, componentes frontend y pruebas.
Al final, resume archivos modificados y cómo probarlo.
```

---

## 14. Notas de implementación importantes

- El algoritmo de compatibilidad puede iniciar como motor de reglas y pesos antes de implementar IA avanzada.
- La validación de estados debe estar en backend y base de datos.
- La seguridad documental es crítica: cédula, comprobante y contrato no deben ser públicos.
- La firma digital con canvas debe funcionar desde móvil.
- Los reportes deben ser de solo lectura.
- Los logs y auditorías deben diseñarse desde el inicio, no añadirse al final.
- Los errores de servicios externos no deben romper los flujos principales si existe alternativa.

---

## 15. Definición de terminado general

Una fase se considera terminada cuando:

- Sus endpoints están implementados.
- Sus pantallas o componentes principales funcionan.
- Las validaciones del caso de uso están cubiertas.
- Los permisos por rol están aplicados en backend.
- Los errores principales están manejados.
- Existen pruebas mínimas.
- El README o documentación técnica se actualiza si aplica.
- El flujo puede demostrarse manualmente de inicio a fin.

