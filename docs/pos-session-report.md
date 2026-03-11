# POS Session Report (Backend)

Fecha: 2026-03-11

## Alcance
- Apertura, consulta y cierre de sesión POS.
- Persistencia de sesión en `ModuleStateService`.

## Campos persistidos
- `OrganizationId`
- `companyId`
- `enterpriseId`
- `warehouseId`
- `cashierUserId`
- `openingAmount`
- `openedAt`
- `closedAt`
- `status`

## Validaciones
- No se permite abrir una segunda sesión para el mismo cajero.
- No se permite abrir una sesión si el almacén ya tiene sesión activa.
- No se permite cerrar sesiones inexistentes o ya cerradas.

## Endpoints
- `POST /pos/sessions/open`
- `GET /pos/sessions/active`
- `POST /pos/sessions/close`

## Pendientes
- Persistencia en MongoDB.
- Reglas de arqueo y cierre con totales.
