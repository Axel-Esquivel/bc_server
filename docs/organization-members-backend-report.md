# Backend – Administración de miembros de organización

Fecha: 2026-03-13

## Resumen
Se completó el backend para administración de miembros reutilizando `OrganizationsModule` y su estructura existente. No se creó arquitectura paralela. Se añadieron endpoints para listar miembros, listar pendientes, ver detalle y gestionar acceso (activar/desactivar). Se mantuvieron los endpoints existentes de invitación, aceptación, rechazo y cambio de rol.

## Archivos modificados / creados
- Modificado: `server/src/modules/organizations/entities/organization.entity.ts`
- Modificado: `server/src/modules/organizations/organizations.service.ts`
- Modificado: `server/src/modules/organizations/organizations.controller.ts`
- Modificado: `server/src/modules/organizations/schemas/organization.schema.ts`
- Creado: `server/src/modules/organizations/dto/update-organization-member-access.dto.ts`

## Modelo de miembro usado
Base existente: `OrganizationMember` (en `organization.entity.ts` y schema).

Estado actualizado:
- `pending`
- `active`
- `disabled` (nuevo, para desactivar acceso sin eliminar la membresía)

## Endpoints finales relevantes
Ya existentes:
- `POST /organizations/:id/invite`
- `POST /organizations/:id/members`
- `POST /organizations/:id/members/:userId/accept`
- `PATCH /organizations/:id/members/:userId/accept`
- `POST /organizations/:id/members/:userId/reject`
- `PATCH /organizations/:id/members/:userId/reject`
- `PATCH /organizations/:id/members/:userId`
- `PATCH /organizations/:id/members/:userId/role`
- `DELETE /organizations/:id/members/:userId`
- `GET /organizations/memberships`

Agregados / completados:
- `GET /organizations/:id/members`
- `GET /organizations/:id/members/pending`
- `GET /organizations/:id/members/:userId`
- `PATCH /organizations/:id/members/:userId/access`

## Reglas implementadas
- Solo miembros activos y con permiso `users.read` pueden listar y consultar detalle.
- Solo miembros activos y con permiso `users.write` pueden aprobar/rechazar, cambiar rol o activar/desactivar.
- No se puede desactivar al owner.
- Miembros en estado `pending` deben aprobarse con `accept`, no con `access`.

## Permisos necesarios
Se reutilizan permisos existentes de organization:
- Lectura: `users.read`
- Escritura/admin: `users.write`

## Notas
- El flujo de “join request” ya existía y se mantiene.
- El módulo `roles` y `permissions` sigue como soporte transversal, pero la administración de roles por organización permanece en `OrganizationsModule`.
