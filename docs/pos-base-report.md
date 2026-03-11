# POS Base Report (Backend)

Fecha: 2026-03-11

## Estructura creada
- `server/src/modules/pos/`
  - `pos.module.ts`
  - `pos.controller.ts`
  - `pos.service.ts`
  - `module.config.ts`
  - `dto/active-pos-session.dto.ts`
  - `dto/open-pos-session.dto.ts`
  - `dto/close-pos-session.dto.ts`
  - `dto/create-pos-sale.dto.ts`
  - `dto/pos-sale-action.dto.ts`
  - `entities/pos-session.entity.ts`
  - `entities/sale.entity.ts`
  - `entities/sale-line.entity.ts`
  - `entities/payment.entity.ts`

## Endpoints creados
- `POST /pos/sessions/open`
- `POST /pos/sessions/close`
- `GET /pos/sessions/active`
- `GET /pos/variants/search`
- `GET /pos/variants/by-code`
- `POST /pos/sales`
- `POST /pos/sales/:id/post`
- `GET /pos/sales/recent`

## Integraciones funcionales
- Variantes reales desde `ProductsService.searchForPos` y `findByCodeForPos`.
- Validación de stock con `InventoryService.listStock`.
- Descuento de inventario usando `InventoryService.recordMovement`.
- Sesiones y ventas persistidas en `ModuleStateService`.
- Evento desacoplado vía outbox: `pos.sale.completed`.

## Lógica de sesión/caja
- Sesión asociada a organización, compañía, empresa, almacén y cajero.
- Se impide abrir una segunda sesión si el cajero ya tiene una sesión abierta.
- Se impide abrir sesión si el almacén ya tiene una sesión abierta.
- Cierre requiere sesión activa y registra `closedAt` y `closingAmount`.

## Modelos y DTOs
- Sesión POS, venta, líneas y pagos con enums claros.
- DTOs con validaciones por `class-validator`.

## Decisiones tomadas
- Pago permitido solo en efectivo en esta fase.
- Búsqueda y venta basadas en `variantId`.
- No acoplar POS con accounting; solo outbox.

## Pendientes para siguientes fases
- Persistencia real en MongoDB (sesiones y ventas).
- Descuentos e impuestos reales.
- Métodos de pago adicionales y conciliación.
