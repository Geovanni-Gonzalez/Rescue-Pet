# API - Autenticación y Usuarios

Esta documentación describe cómo interactuar con los endpoints base del backend para autenticación y gestión de usuarios.

## Base URL
Localmente el servidor corre en: `http://localhost:3000`

## Autenticación (`/auth`)

### 1. Registro de Adoptante
**POST** `/auth/register-adopter`
Permite a un nuevo usuario registrarse con rol `ADOPTER`.

**Body (JSON):**
```json
{
  "fullName": "Juan Pérez",
  "email": "juan@example.com",
  "password": "mypassword123",
  "phone": "+1234567890" // Opcional
}
```

### 2. Inicio de Sesión (Login)
**POST** `/auth/login`
Autentica al usuario y devuelve un token JWT.

**Body (JSON):**
```json
{
  "email": "admin@rescuepet.com",
  "password": "password123"
}
```
**Respuesta Exitosa:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### 3. Obtener mis datos (Me)
**GET** `/auth/me`
**Headers:** `Authorization: Bearer <tu_token_jwt>`
Devuelve la información completa del usuario autenticado actual.

---

## Usuarios (`/users`)

Todas estas rutas requieren el header `Authorization: Bearer <token>`.

### 1. Listar Usuarios
**GET** `/users`
**Roles permitidos:** `ADMIN`
Devuelve la lista de todos los usuarios en el sistema.

### 2. Ver Detalles de Usuario
**GET** `/users/:id`
**Roles permitidos:** `ADMIN` o el propio usuario (`:id` coincide con el del token).

### 3. Actualizar Usuario
**PATCH** `/users/:id`
**Roles permitidos:** `ADMIN` o el propio usuario.
Permite modificar el perfil de un usuario.
- **Nota de Seguridad:** Solo el rol `ADMIN` puede modificar los campos protegidos como `role` o `isActive`. Si un `ADOPTER` intenta enviar un cambio de rol, el sistema ignorará ese campo de forma segura.

**Body (JSON):**
```json
{
  "fullName": "Juan Nuevo",
  "phone": "+987654321"
}
```

## Control de Errores y Validaciones
Todos los errores devuelven un formato estructurado y el código HTTP adecuado (400, 401, 403, 404, 500).
```json
{
  "success": false,
  "error": "Mensaje descriptivo",
  "details": [ /* Errores de validación Zod si aplica */ ]
}
```

## Logs de Auditoría
El sistema registra automáticamente en la tabla `AuditLog` las siguientes acciones:
- Inicios de sesión exitosos (`LOGIN`).
- Registros de nuevos adoptantes (`REGISTER`).
- Modificaciones en perfiles de usuario (`UPDATE_USER`).
