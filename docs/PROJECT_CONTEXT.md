# Contexto del Proyecto: Rescue Pet (Prototipo Funcional)

## 1. Objetivo del prototipo
El objetivo principal de Rescue Pet es demostrar el flujo crítico de un sistema de adopción animal. Se busca validar la interacción entre los distintos actores (Administrador, Veterinario, Voluntario, Adoptante) durante el proceso de rescate, tratamiento y adopción de una mascota, sin necesidad de implementar un producto comercial completo en esta fase inicial. El enfoque está en la funcionalidad core, la arquitectura base y la experiencia de usuario esencial.

## 2. Stack Elegido
**Frontend:**
- **Framework:** React + Vite
- **Lenguaje:** TypeScript
- **Estilos y Componentes:** Tailwind CSS + shadcn/ui
- **Generación de QR:** qrcode
- **Firma digital:** react-signature-canvas

**Backend:**
- **Entorno:** Node.js
- **Framework:** Express
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL
- **ORM:** Prisma
- **Autenticación:** JWT + bcrypt
- **Generación de PDF:** pdf-lib

**Otros:**
- **Storage:** Local/Simulado (preparado para migración futura a Supabase Storage)
- **Notificaciones:** In-app (simples)

## 3. Módulos a Implementar (Alcance del Prototipo)
- **Autenticación y Autorización:** Registro, inicio de sesión y gestión de roles.
- **Gestión de Animales:** Registro básico de una mascota rescatada, historial médico inicial y actualización de estado (Ej. En tratamiento, Disponible, Adoptado).
- **Flujo de Adopción:** Solicitud de adopción, revisión por parte de voluntarios/administradores y aprobación/rechazo.
- **Generación de Documentos:** Creación de un contrato de adopción en PDF.
- **Firma Digital:** Captura de la firma del adoptante en el contrato.
- **Identificación:** Generación de un código QR por mascota para acceso rápido a su perfil.
- **Notificaciones Básicas:** Avisos in-app sobre cambios de estado en las solicitudes de adopción.

## 4. Módulos Simulados (Fuera del Alcance Inicial)
- **Pasarela de Pagos:** Simulación de donaciones o cuotas de adopción.
- **Chat en Tiempo Real:** Las comunicaciones complejas se simularán con notas o actualizaciones de estado.
- **Almacenamiento en la Nube Completo:** Las imágenes y archivos se guardarán localmente en el servidor inicialmente.
- **Geolocalización Avanzada:** Búsqueda por mapa interactivo.

## 5. Flujo Principal del Sistema
1. **Ingreso:** Un Voluntario o Admin registra un animal rescatado en el sistema (Genera QR).
2. **Evaluación:** Un Veterinario actualiza el estado de salud y autoriza que el animal esté "Disponible para adopción".
3. **Solicitud:** Un Adoptante (registrado) navega, ve al animal y envía una solicitud de adopción.
4. **Revisión:** Un Voluntario o Admin revisa la solicitud y aprueba o rechaza al candidato.
5. **Formalización:** Si se aprueba, se genera un PDF (Contrato de Adopción) que el Adoptante firma digitalmente.
6. **Cierre:** El estado del animal cambia a "Adoptado" y se envía una notificación de confirmación al adoptante.

## 6. Entidades Principales
- **User:** Contiene credenciales, datos personales y rol.
- **Animal:** Representa a la mascota (nombre, especie, raza, edad, estado, historial).
- **AdoptionRequest:** Relaciona a un User (Adoptante) con un Animal, y rastrea el estado de la solicitud.
- **MedicalRecord:** Registro clínico de un animal, gestionado por el Veterinario.
- **Document (o Contract):** Almacena el enlace/referencia al contrato firmado.
- **Notification:** Avisos para los usuarios del sistema.

## 7. Roles y Permisos
- **Administrador:** Control total. Puede gestionar usuarios, animales, solicitudes y configuraciones del sistema.
- **Veterinario:** Acceso para actualizar historiales médicos (MedicalRecord) y cambiar el estado de salud de los animales.
- **Voluntario:** Puede registrar nuevos animales, gestionar solicitudes de adopción y actualizar información básica.
- **Adoptante:** Puede buscar animales, crear solicitudes de adopción, ver el estado de sus solicitudes, firmar contratos y recibir notificaciones.

## 8. Decisiones Técnicas
- **Arquitectura Monorepo Lógica:** Se usarán carpetas separadas (`frontend`, `backend`, `docs`) en un solo repositorio para facilitar el desarrollo inicial.
- **Vite:** Elegido por su velocidad de compilación y excelente integración con React y TypeScript, ideal para prototipado rápido.
- **Prisma + PostgreSQL:** Prisma proporciona tipado estricto end-to-end y migraciones de esquema sencillas, lo que acelera el desarrollo del backend.
- **Local Storage Inicial:** Para evitar la complejidad de configurar buckets cloud (como AWS S3 o Supabase Storage) desde el día 1, los archivos (imágenes, PDFs) se guardarán en el sistema de archivos del servidor, encapsulando la lógica de guardado en un servicio que pueda ser refactorizado fácilmente después.
- **Tailwind + shadcn/ui:** Permite construir interfaces consistentes, accesibles y estéticamente agradables con mucha rapidez sin escribir CSS personalizado extenso.
