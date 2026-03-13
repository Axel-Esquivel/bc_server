# Auditoría de administración de usuarios en organización (Backend)

Fecha: 2026-03-13

## Resumen
El backend ya cuenta con un set amplio de endpoints y modelos para manejar membresías de organización, invitaciones (por email), solicitudes de ingreso, roles y permisos a nivel organización. La lógica principal vive en `OrganizationsModule` y `OrganizationsService`. Los módulos `roles` y `permissions` existen pero parecen independientes del flujo principal de organización (posible legado o soporte transversal).

## Endpoints existentes (OrganizationsController)
Ubicación: `server/src/modules/organizations/organizations.controller.ts`

Membresías / invitaciones / solicitudes:
- `GET /organizations/memberships` → lista membresías del usuario actual.
- `GET /organizations/me` → estado de membresías del usuario actual.
- `POST /organizations/join` → solicitud de ingreso por selector/código.
- `POST /organizations/join-request` → solicitud de ingreso por email.
- `POST /organizations/:id/join` → solicitud de ingreso a organización específica.
- `POST /organizations/:id/invite` → invita usuario por email.
- `POST /organizations/:id/members` → agrega miembro (email + rol).
- `POST /organizations/:id/members/:userId/accept` → acepta miembro.
- `POST /organizations/:id/members/:userId/reject` → rechaza miembro.
- `PATCH /organizations/:id/members/:userId` → actualiza rol de miembro.
- `PATCH /organizations/:id/members/:userId/role` → compat update de rol.
- `DELETE /organizations/:id/members/:userId` → remueve miembro.
- `DELETE /organizations/:id/leave` → usuario actual abandona organización.

Roles y permisos (a nivel organización):
- `GET /organizations/:id/roles`
- `POST /organizations/:id/roles`
- `PATCH /organizations/:id/roles/:roleKey`
- `DELETE /organizations/:id/roles/:roleKey`
- `GET /organizations/:id/permissions`

Otros endpoints de contexto:
- `GET /organizations`
- `GET /organizations/:id`
- `PATCH /organizations/:id/default`
- `PATCH /organizations/:id` (actualización general)

## Modelos y tipos existentes
Ubicación principal: `server/src/modules/organizations`

- `entities/organization.entity.ts`
  - `OrganizationMember` con `userId`, `email`, `roleKey`, `status`, `invitedBy`, `requestedBy`, fechas, etc.
  - `OrganizationRoleDefinition` con `permissions`.
- `types/organization-role.types.ts`
  - `OrganizationRole`, `OrganizationRoleKey`, `OWNER_ROLE_KEY`.
- DTOs relevantes:
  - `add-organization-member.dto.ts`
  - `invite-organization-member.dto.ts`
  - `join-organization*.dto.ts`
  - `update-organization*.dto.ts`

## Servicios existentes
- `OrganizationsService` implementa la mayor parte de la lógica de membresías, roles y permisos.
- `OrganizationMemberGuard`, `OrganizationAdminGuard`, `OrganizationOwnerGuard`.

## Roles y permisos fuera de Organizations
Módulos aparte:
- `RolesModule`: `POST /roles` (creación simple).
  - Archivo: `server/src/modules/roles/roles.controller.ts`
- `PermissionsModule`: `POST /permissions/assign` (asignar permisos a rol).
  - Archivo: `server/src/modules/permissions/permissions.controller.ts`

Observación: estos módulos no están claramente integrados con el flujo de roles en `OrganizationsModule` (posible legado o capa transversal).

## Qué ya existe y se puede reutilizar
- CRUD de roles y permisos por organización en `OrganizationsController`.
- Flujos de invitación, aceptación/rechazo y actualización de rol.
- Estructura de entidad y estado de membresía (`pending`, `active`).

## Qué está incompleto
- No se observa una entidad separada para “invitaciones” (se usa el miembro con estado).
- No hay endpoints explícitos para listar miembros por organización con filtros (solo dentro de getById).

## Qué no existe
- No hay un módulo dedicado a “Administración de miembros” independiente del módulo de organizaciones.
- No hay endpoints explícitos para “reenviar invitación” o “revocar invitación” (solo remove member).

## Propuesta breve para nuevo feature (sin implementar aún)
- Feature Angular “Organization Members” en settings o administración:
  - Lista de miembros con roles y estado.
  - Invitar por email.
  - Aceptar/rechazar solicitudes (si aplica).
  - Editar rol y remover miembro.
- Reutilizar endpoints de `OrganizationsController` existentes.

