# POS Session Report (Backend)

Fecha: 2026-03-12

## Alcance
- Apertura, consulta y cierre de sesión POS ligada a `PosConfig`.
- Persistencia de sesión en `ModuleStateService`.

## Campos persistidos
- `posConfigId`
- `OrganizationId`
- `companyId`
- `enterpriseId`
- `warehouseId`
- `cashierUserId`
- `openedByUserId`
- `closedByUserId`
- `openingAmount`
- `expectedClosingAmount`
- `countedClosingAmount`
- `differenceAmount`
- `openedAt`
- `closedAt`
- `status`
- `notes`

## Estados
- `DRAFT`
- `OPEN`
- `CLOSING_PENDING`
- `CLOSED`
- `CANCELLED`

## Validaciones
- No se permite abrir sesión sin `posConfigId`.
- El usuario debe estar en `allowedUserIds` del POS.
- El POS debe pertenecer al mismo contexto (organization/company/enterprise/warehouse).
- Si `requiresOpening` es true, exige `openingAmount`.
- No se permite abrir más de una sesión abierta por cajero.
- No se permite abrir sesión si el almacén ya tiene una sesión abierta.
- Cierre permitido solo por el mismo cajero, salvo `allowOtherUsersClose`.

## Endpoints
- `POST /pos/sessions/open`
- `GET /pos/sessions/active`
- `POST /pos/sessions/close`

## Integración con ventas
- `createSale` valida sesión abierta y vincula la venta a la sesión activa.

## Pendientes
- Persistencia en MongoDB.
- Arqueo detallado por denominaciones.
