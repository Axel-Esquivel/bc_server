# POS Audit Report (Backend)

Fecha: 2026-03-10

**Estructura actual**
- `server/src/modules/pos/`
  - `pos.module.ts`
  - `pos.controller.ts`
  - `pos.service.ts`
  - `module.config.ts`
  - `dto/` (`create-pos-sale.dto.ts`, `add-cart-line.dto.ts`, `add-payment.dto.ts`, `open/close-session`, `confirm-cart`, `pos-sale-action`)
  - `entities/` (`cart`, `cart-line`, `sale`, `sale-line`, `payment`, `pos-session`, `promotion`)

**Rutas existentes (controller)**
- `POST /api/pos/carts`
- `POST /api/pos/carts/:id/lines`
- `POST /api/pos/carts/:id/payments`
- `POST /api/pos/carts/:id/confirm`
- `POST /api/pos/sessions/open`
- `POST /api/pos/sessions/close`
- `POST /api/pos/sales`
- `POST /api/pos/sales/:id/post`
- `POST /api/pos/sales/:id/void`
- `GET /api/pos/sales`

**Dependencias reales**
- Directas: `InventoryService`, `RealtimeService`, `OrganizationsService`, `CompaniesService`, `ModuleStateService`, `CoreEventsService`, `OutboxService`
- Opcional: `PREPAID_PORT` via `ModuleRef` (sin dependencia dura)

**Hallazgos**
- Inconsistencia de identificador: `productId` en `CreatePosSaleLineDto` y payloads de eventos, pero el flujo real y los endpoints usan `variantId` (stock, precios, reservaciones).
- Evento `pos.sale.completed` consumido por contabilidad esperaba `productId`.

**Correcciones aplicadas**
- `CreatePosSaleLineDto` ahora acepta `variantId` (con fallback a `productId` para compatibilidad).
- `PosService.createSale` resuelve `variantId` y valida presencia.
- Eventos (`pos.sale.*`) ahora emiten `variantId` en las líneas.
- `AccountingPostingService` acepta `variantId` y mantiene fallback a `productId`.
- `AccountingPosSaleMapper` tipado alineado a `variantId`.

**Deuda técnica pendiente**
- Persistencia en memoria en `PosService` (estado no durable).
- Endpoints de carritos sin guardas JWT en todas las rutas (validar política).
- Promociones/combos aún son placeholders.

**Recomendación**
Continuar sobre esta base (no reconstruir de cero), priorizando persistencia y consolidación de reglas de precio/promos.
