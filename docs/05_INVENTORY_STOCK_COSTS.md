# 05 – Inventario, Stock y Costos

Define cómo se maneja el inventario y los costos en Business Control.

## 1. Entidades principales

### 1.1. InventoryMovement

- Representa un movimiento atómico de inventario.
- Campos:
  - `direction`: `IN`, `OUT`, `ADJUST`, `TRANSFER_OUT`, `TRANSFER_IN`
  - `variantId`
  - `warehouseId`
  - `locationId?`
  - `batchId?`
  - `quantity` (> 0)
  - `unitCost` (al momento del movimiento)
  - `operationId` (idempotencia)
  - referencias:
    - `saleId?`, `purchaseOrderId?`, `grnId?`, `inventoryCountId?`, etc.
  - `OrganizationId`, `companyId`
  - `createdAt`

### 1.2. StockProjection

- Proyección actual de stock por combinación:
  - `variantId`, `warehouseId`, `locationId?`, `batchId?`
- Campos:
  - `onHand`
  - `reserved`
  - `available` (= onHand - reserved)
  - `version` (para locking optimista)

## 2. Reglas de negocio de stock

- No se debe permitir `onHand` negativo a menos que:
  - `Warehouse.allowNegativeStock = true`.
- Cada `InventoryMovement` debe:
  - Actualizar la `StockProjection` correspondiente.
- Reservas:
  - Al crear carritos de venta se incrementa `reserved`.
  - Al confirmar venta se convierten en movimientos `OUT`.

## 3. Costeo

- Estrategia inicial:
  - **Promedio ponderado** por variante + warehouse.
- Al registrar un `IN`:
  - Se recalcula el costo promedio.
- Al registrar un `OUT`:
  - Se usa el costo promedio vigente para el asiento contable.

## 4. Integración con otros módulos

- **PurchasesModule**:
  - Confirmación de GRN → genera movimientos `IN`.
- **PosModule / Sales**:
  - Confirmación de venta → genera movimientos `OUT`.
- **InventoryCountsModule**:
  - Ajustes de conteo → genera `ADJUST` (IN u OUT según el caso).

## 5. Endpoints base

- `GET /inventory/stock`
  - Filtros: `variantId`, `warehouseId`, `locationId`.
- `POST /inventory/movements`
  - Endpoint genérico para aplicar movimientos (internamente llamado desde otros módulos).

## 6. Relación con bodegas y ubicaciones

- Ver `WAREHOUSE_LOCATIONS.md` para detalles de Warehouse y Location.
- Ver `INVENTORY_COUNTS.md` para conteos físicos.
