# POS Configuración y acceso por usuario

Fecha: 2026-03-12

## Objetivo
Agregar configuración de puntos de venta (PosConfig) con acceso por usuario y endpoints CRUD coherentes con el módulo POS.

## Modelo implementado
- `PosConfigRecord` en `server/src/modules/pos/entities/pos-config.entity.ts`
  - `name`, `code`
  - `OrganizationId`, `companyId`, `enterpriseId`, `warehouseId`
  - `currencyId`
  - `active`
  - `allowedPaymentMethods`
  - `allowedUserIds`
  - `requiresOpening`
  - `allowOtherUsersClose`
  - `notes`
  - `createdAt`, `updatedAt`

## DTOs
- `server/src/modules/pos/dto/create-pos-config.dto.ts`
- `server/src/modules/pos/dto/update-pos-config.dto.ts`
- `server/src/modules/pos/dto/pos-config-list-query.dto.ts`

## Endpoints agregados
- `POST /pos/configs`
- `GET /pos/configs`
- `GET /pos/configs/available/me`
- `GET /pos/configs/:id`
- `PATCH /pos/configs/:id`
- `DELETE /pos/configs/:id`

## Validaciones clave
- `allowedUserIds` y `allowedPaymentMethods` no pueden ir vacíos.
- Solo usuarios permitidos pueden abrir sesión con un POS.
- El POS debe pertenecer al mismo contexto (organization/company/enterprise/warehouse).
- Si `requiresOpening` es true, se exige monto de apertura.

## Archivos modificados
- `server/src/modules/pos/entities/pos-config.entity.ts`
- `server/src/modules/pos/entities/pos-session.entity.ts`
- `server/src/modules/pos/dto/create-pos-config.dto.ts`
- `server/src/modules/pos/dto/update-pos-config.dto.ts`
- `server/src/modules/pos/dto/pos-config-list-query.dto.ts`
- `server/src/modules/pos/dto/open-pos-session.dto.ts`
- `server/src/modules/pos/dto/active-pos-session.dto.ts`
- `server/src/modules/pos/dto/close-pos-session.dto.ts`
- `server/src/modules/pos/pos.controller.ts`
- `server/src/modules/pos/pos.service.ts`
- `server/src/modules/pos/pos.module.ts`
- `server/src/modules/pos/module.config.ts`

## Pendientes
- Integración con arqueo/denominaciones en cierre de caja.
- UI específica de seguimiento de sesiones por POS.
