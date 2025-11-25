# 03 – Auth, Workspaces, Roles y Permissions

Este documento define los requisitos funcionales y de diseño para:

- Autenticación y sesiones.
- Workspaces y miembros.
- Roles y permisos.
- Dispositivos (devices).

## 1. Autenticación (AuthModule)

### 1.1. Funcionalidad

- **Login**:
  - Email o username + password.
  - Devuelve:
    - accessToken (JWT)
    - refreshToken
    - información básica del usuario
    - deviceId asociado (si aplica)
- **Registro**:
  - Crear el primer usuario administrador del sistema.
  - Posteriores registros pueden estar restringidos a ciertos roles.
- **Refresh token**:
  - Permite renovar accessToken mientras el refreshToken sea válido y no revocado.
- **Perfil actual**:
  - `/auth/me` devuelve el usuario actual, sus roles y workspaces.

### 1.2. Requisitos técnicos

- Usar `JwtModule` de NestJS.
- Guard `JwtAuthGuard` debe:
  - Validar el token.
  - Adjuntar al request:
    - `userId`
    - `workspaceId` actual (si viene en el token o cabecera)
    - `deviceId`
- Hash de contraseñas con `bcrypt`.

## 2. Workspaces (WorkspacesModule)

### 2.1. Concepto

- Un workspace agrupa:
  - Datos de negocio.
  - Configuraciones específicas.
  - Miembros (usuarios) con roles.

### 2.2. Entidad básica

- Campos principales:
  - `_id`
  - `name`
  - `slug`
  - `companyId` principal (opcional al inicio)
  - `members`: arreglo con:
    - `user`
    - `role`

### 2.3. Endpoints

- `POST /workspaces`
  - Crea un nuevo workspace.
- `POST /workspaces/:id/members`
  - Agrega o actualiza un miembro con un rol determinado.

## 3. Roles y permisos

### 3.1. RolesModule

- Representan conjuntos de permisos nombrados:
  - `name`, `description`
  - `permissions: string[]` (o relación con Permission)
  - Asociados a un workspace.

### 3.2. PermissionsModule

- Permisos granulares tipo string:
  - Formato sugerido: `resource:action:scope`
    - Ejemplo: `products:read:any`, `products:update:own`.
- Endpoints:
  - `POST /permissions/assign` para asignar permisos a un rol.

### 3.3. Guards

- `RolesGuard`:
  - Verifica que el usuario tenga un rol requerido en el workspace.
- `PermissionsGuard`:
  - Verifica que el usuario tenga el permiso requerido para la acción.

## 4. Devices (DevicesModule)

### 4.1. Objetivo

- Controlar desde qué dispositivos accede un usuario:
  - Auditoría.
  - Bloqueo remoto.
  - Control de sesiones activas.

### 4.2. Entidad Device

- Campos sugeridos:
  - `userId`
  - `deviceId` (fingerprint desde frontend)
  - `name` / `description`
  - `lastLoginAt`
  - `isBlocked`
  - `metadata` (navegador, SO, IP inicial)

### 4.3. Endpoints

- `GET /devices`
  - Lista los dispositivos del usuario actual.
- `POST /devices/block`
  - Marca un dispositivo como bloqueado.

## 5. Auditoría y seguridad

- Todas las acciones de auth y gestión de roles/permisos deben:
  - Loguearse con `userId`, `workspaceId`, `deviceId`, `ip`.
- Ver detalles en `14_SECURITY_LOGS_AUDIT.md`.
