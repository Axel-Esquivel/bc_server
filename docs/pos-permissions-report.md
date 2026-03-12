# POS Permisos por acción (Backend)

Fecha: 2026-03-12

## Objetivo
Reforzar el control de acceso por usuario y por acción en el módulo POS usando permisos del sistema existente.

## Permisos POS agregados
Se incorporaron permisos específicos en el catálogo de la organización:
- `pos.access`
- `pos.session.open`
- `pos.session.close`
- `pos.session.history`
- `pos.sale.create`
- `pos.sale.discount`
- `pos.sale.cancel`
- `pos.reprint`
- `pos.cash.move`
- `pos.cash.withdrawal`

## Validaciones en endpoints
Se agregaron validaciones de permiso y de identidad en:
- Configuración POS (`pos.configure` para crear/editar/eliminar, `pos.read` para listar/consultar).
- Sesiones POS (`pos.session.open`, `pos.session.close`, `pos.session.history`, `pos.access`).
- Ventas POS (`pos.sale.create`).
- Movimientos de caja (`pos.cash.move` y `pos.cash.withdrawal` para retiros).

## Archivos modificados
- `server/src/modules/organizations/organizations.service.ts`
- `server/src/modules/pos/pos.controller.ts`
- `server/src/modules/pos/dto/create-pos-cash-movement.dto.ts`
- `server/src/modules/pos/pos.service.ts`

## Notas
- Se valida que el usuario autenticado coincida con `cashierUserId` o `createdByUserId`.
- Se mantiene compatibilidad con el sistema de roles/permisos existente.
