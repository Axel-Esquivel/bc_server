# POS Rebuild Report (Backend)

Fecha: 2026-03-10

**Resumen**
Se reconstruyó el módulo POS bajo la carpeta `server/src/modules/POS`, reemplazando la ubicación anterior. Se reforzó el flujo con variantes, se agregaron endpoints de consulta POS y se alinearon dependencias.

**Eliminado/Reemplazado**
- Carpeta anterior: `server/src/modules/pos` (reemplazada por `server/src/modules/POS`).

**Conservado**
- Lógica base de ventas, inventario, outbox y sesiones (refactorizada a la nueva ruta).

**Estructura final**
- `server/src/modules/POS/`
  - `pos.module.ts`
  - `pos.controller.ts`
  - `pos.service.ts`
  - `module.config.ts`
  - `dto/` (incluye `active-session-query.dto.ts`)
  - `entities/`

**Endpoints POS**
- `POST /api/pos/sessions/open`
- `GET /api/pos/sessions/active`
- `POST /api/pos/sessions/close`
- `GET /api/pos/variants/search`
- `GET /api/pos/variants/by-code`
- `POST /api/pos/sales`
- `POST /api/pos/sales/:id/post`
- `POST /api/pos/sales/:id/void`
- `GET /api/pos/sales`
- `POST /api/pos/carts` (base existente)
- `POST /api/pos/carts/:id/lines`
- `POST /api/pos/carts/:id/payments`
- `POST /api/pos/carts/:id/confirm`

**Dependencias**
- Requeridas: `auth`, `companies`, `inventory`, `organizations`, `outbox`, `products`, `realtime`
- Opcionales: `PREPAID_PORT` via `ModuleRef` (no bloquea el runtime)

**Integraciones opcionales**
- Contabilidad vÃ­a outbox (`pos.sale.completed`, `pos.sale.posted`)
- Prepaid vÃ­a puerto opcional

**IntegraciÃ³n con inventario**
- ValidaciÃ³n de stock en `postSale` con proyecciones de inventario (`inventoryService.listStock`).
- Descuento de inventario al confirmar/postear venta vÃ­a `inventoryService.recordMovement`.

**Riesgos / deuda tÃ©cnica**
- Persistencia POS aÃºn en memoria (ModuleState).
- Endpoints de carritos pueden requerir endurecimiento de guardas segÃºn polÃ­tica final.
