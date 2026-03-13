# Roles y permisos de miembros (Backend)

Fecha: 2026-03-13

## Resumen
Se reforzó la aplicación de roles y permisos en el backend usando la estructura existente de `OrganizationsModule`. Ahora:
- Los permisos efectivos se resuelven para el contexto activo al emitir tokens y al consultar `/auth/me`.
- El acceso administrativo a miembros sigue validado por permisos (`users.read`, `users.write`) definidos en roles de organización.
- El estado del miembro (`active`, `pending`, `disabled`) controla el acceso real.

## Archivos modificados
- `server/src/modules/organizations/organizations.service.ts`
  - Nuevo helper `getMemberPermissions(organizationId, userId)` para resolver permisos efectivos.
- `server/src/modules/auth/auth.service.ts`
  - Se incluyen permisos efectivos en tokens (`login`, `register`, `refresh`).
  - `/auth/me` devuelve `activeContext` y `permissions`.

## Lógica aplicada
- Los permisos se obtienen desde el rol asignado en la organización activa.
- Si el miembro no está activo o no existe, se devuelve lista vacía de permisos.
- Los guards de organización siguen aplicando permisos a nivel organización con datos actuales (no del token).

## Endpoints relevantes
- `GET /auth/me` ahora incluye:
  - `activeContext`
  - `permissions`
- Endpoints de organizaciones usan `OrganizationAdminGuard` y `OrganizationPermission` para validar:
  - `users.read`
  - `users.write`

## Consideraciones
- El token almacena permisos del contexto activo al momento de login/refresh.
- Si se cambia el rol mientras la sesión está activa, el token se actualiza al refrescar o volver a iniciar sesión.

