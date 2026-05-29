# API - Autenticacion y Usuarios

Esta documentacion describe los endpoints base de autenticacion y gestion de usuarios.

## Base URL

Servidor local:

```text
http://localhost:3000
```

## Autenticacion (`/auth`)

### Registro de Adoptante

`POST /auth/register-adopter`

Permite a un nuevo usuario registrarse con rol `ADOPTER`.

Body:

```json
{
  "fullName": "Juan Perez",
  "email": "juan@example.com",
  "password": "mypassword123",
  "phone": "+1234567890"
}
```

### Login

`POST /auth/login`

Autentica al usuario y devuelve un token JWT.

Body:

```json
{
  "email": "admin@rescuepet.com",
  "password": "password123"
}
```

Respuesta exitosa:

```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "fullName": "Admin Rescue Pet",
    "email": "admin@rescuepet.com",
    "role": "ADMIN"
  }
}
```

### Obtener Usuario Actual

`GET /auth/me`

Header:

```text
Authorization: Bearer <token>
```

Devuelve la informacion del usuario autenticado.

## Usuarios (`/users`)

Todas las rutas requieren:

```text
Authorization: Bearer <token>
```

### Listar Usuarios

`GET /users`

Roles permitidos:

- `ADMIN`

### Ver Detalle de Usuario

`GET /users/:id`

Roles permitidos:

- `ADMIN`
- El propio usuario cuando `:id` coincide con el ID del token.

### Actualizar Usuario

`PATCH /users/:id`

Roles permitidos:

- `ADMIN`
- El propio usuario.

Body:

```json
{
  "fullName": "Juan Nuevo",
  "phone": "+987654321"
}
```

Nota de seguridad:

- Solo `ADMIN` puede modificar `role` o `isActive`.
- Si otro rol envia esos campos, el backend los ignora.

## Formato de Errores

```json
{
  "success": false,
  "error": "Mensaje descriptivo",
  "details": []
}
```

## Auditoria

El sistema registra automaticamente:

- Login exitoso: `LOGIN`.
- Registro de adoptante: `REGISTER`.
- Actualizacion de perfil: `UPDATE_USER`.
