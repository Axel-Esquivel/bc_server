# POS Rebuild Report (Backend)

Fecha: 2026-03-10

## Estructura final
- `server/src/modules/POS/`
  - `pos.module.ts`
  - `pos.controller.ts`
  - `pos.service.ts`
  - `module.config.ts`
  - `dto/`
    - `open-pos-session.dto.ts`
    - `close-pos-session.dto.ts`
    - `active-session-query.dto.ts`
    - `create-pos-sale.dto.ts`
    - `pos-sale-action.dto.ts`
  - `entities/`
    - `pos-session.entity.ts`
    - `sale.entity.ts`
    - `sale-line.entity.ts`
    - `payment.entity.ts`

## Endpoints creados
- `POST /api/pos/sessions/open`
- `GET /api/pos/sessions/active`
- `POST /api/pos/sessions/close`
- `GET /api/pos/variants/search`
- `GET /api/pos/variants/by-code`
- `POST /api/pos/sales`
- `POST /api/pos/sales/:id/post`
- `GET /api/pos/sales`

## Dependencias reales
- `auth`, `companies`, `inventory`, `organizations`, `outbox`, `products`

## Decisiones de integracion
- Ventas por `variantId` de forma consistente.
- Validacion de stock antes de postear venta.
- Movimientos de inventario `OUT` por linea.
- Eventos outbox `pos.sale.posted` para integraciones opcionales (contabilidad).

## Archivos modificados
- `server/src/app.module.ts`
- `server/src/modules/module-loader/module-registry.data.ts`
- `server/src/modules/module-loader/module.config.ts`
- `server/src/core/constants/modules.catalog.ts`

## Notas
- Persistencia en memoria via `ModuleStateService` como base inicial.
- No hay acoplamiento directo a accounting; solo outbox.
