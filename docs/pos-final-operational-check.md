# Verificación final operativa POS (Backend)

Fecha: 2026-03-12

## Estructura final
- `server/src/modules/pos/`
  - `pos.module.ts`
  - `pos.controller.ts`
  - `pos.service.ts`
  - `entities/`
    - `pos-config.entity.ts`
    - `pos-session.entity.ts`
    - `pos-session-denomination.entity.ts`
    - `pos-cash-movement.entity.ts`
    - `payment.entity.ts`
    - `sale.entity.ts`
    - `sale-line.entity.ts`
  - `dto/`
    - `create-pos-config.dto.ts`
    - `update-pos-config.dto.ts`
    - `pos-config-list-query.dto.ts`
    - `open-pos-session.dto.ts`
    - `close-pos-session.dto.ts`
    - `active-pos-session.dto.ts`
    - `pos-session-denomination.dto.ts`
    - `pos-session-summary.dto.ts`
    - `create-pos-sale.dto.ts`
    - `pos-sale-action.dto.ts`
    - `create-pos-cash-movement.dto.ts`
    - `pos-cash-movement-list-query.dto.ts`

## Implementación POS única
- Único módulo backend POS en `server/src/modules/pos`.
- Sin carpetas duplicadas `POS`/`pos`.

## Endpoints activos
- Configuración POS
  - `POST /pos/configs`
  - `GET /pos/configs`
  - `GET /pos/configs/available/me`
  - `GET /pos/configs/:id`
  - `PATCH /pos/configs/:id`
  - `DELETE /pos/configs/:id`
- Sesiones POS
  - `POST /pos/sessions/open`
  - `GET /pos/sessions/active`
  - `GET /pos/sessions/:id/summary`
  - `POST /pos/sessions/close`
- Ventas POS
  - `POST /pos/sales`
  - `POST /pos/sales/:id/post`
  - `GET /pos/sales/recent`
- Búsqueda de variantes
  - `GET /pos/variants/search`
  - `GET /pos/variants/by-code`
- Movimientos de caja
  - `POST /pos/sessions/:id/movements`
  - `GET /pos/sessions/:id/movements`

## Flujo funcional validado
- PosConfig y acceso por usuario: validado en `pos.service.ts` y `pos.controller.ts`.
- Sesión POS: apertura, consulta activa y cierre con validaciones de usuario y contexto.
- Apertura por denominaciones: guardada en `openingDenominations` y `openingAmount` calculado.
- Cierre por denominaciones: `closingDenominations` + `countedClosingAmount` + `differenceAmount`.
- Movimientos de caja: registrados en efectivo y aplicados al esperado.
- Esperado de caja: apertura + ventas en efectivo + movimientos de caja.
- Permisos por acción: validación por permisos `pos.*` en endpoints POS.

## Pendientes
- Catálogo persistente de denominaciones por moneda.
- Movimientos de caja con permisos especiales por rol más granular (si se requiere).

## Riesgos
- El sistema de permisos depende de roles de organización; si no se asignan permisos `pos.*`, el POS quedará inaccesible.
- Movimientos de caja solo efectivo; si se requieren otros métodos, ajustar reglas.

## Deuda técnica
- Persistencia de estado POS aún en `ModuleStateService` (no Mongo por entidad dedicada).

## Siguientes mejoras recomendadas
1. Catálogo de denominaciones por moneda configurable.
2. Reportes de caja por sesión con exportación.
3. Auditoría detallada de acciones de POS.
