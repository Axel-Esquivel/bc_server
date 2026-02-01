# INVENTORY_COUNTS – Conteos físicos multi-ronda

Define cómo se implementan los conteos físicos de inventario.

## 1. Entidades

### 1.1. InventoryCountSession

- Campos:
  - `OrganizationId`, `companyId`
  - `warehouseId`
  - `scope`: `FULL`, `PARTIAL`, `CYCLE`
  - `mode`: `BLIND`, `GUIDED`
  - `roundsPlanned`
  - `status`:
    - `DRAFT`, `IN_PROGRESS`, `REVIEW`, `APPROVED`, `POSTED`, `CANCELLED`
  - `startedAt`, `closedAt`

### 1.2. InventoryCountLine

- Campos:
  - `sessionId`
  - `variantId`
  - `warehouseId`
  - `locationId?`
  - `batchId?`
  - `systemQtyAtStart`
  - `finalQty?`
  - `decisionBy?`, `decisionAt?`
  - `reason?`

### 1.3. InventoryCountRound

- Campos:
  - `sessionId`
  - `lineId`
  - `roundNumber`
  - `countedQty`
  - `countedBy`
  - `countedAt`
  - `source` (dispositivo, importación, etc.)

## 2. Flujo del conteo

1. Crear sesión (`POST /inventory-counts`).
2. Generar snapshot de `systemQtyAtStart` a partir de `StockProjection`.
3. Registrar resultados de rondas:
   - `POST /inventory-counts/:id/rounds`.
4. Revisar diferencias y definir `finalQty`:
   - `POST /inventory-counts/:id/review`.
5. Postear ajustes:
   - `POST /inventory-counts/:id/post` → genera `InventoryMovement` de ajuste.

## 3. Reglas de negocio

- En modo `BLIND` el usuario no ve `systemQtyAtStart` durante el conteo.
- En modo `GUIDED` se puede mostrar la ubicación y el producto a contar.
- No se puede `POST` una sesión si:
  - Tiene líneas sin `finalQty`.
  - La sesión no está en estado `REVIEW`.

## 4. Integración

- Usa `InventoryMovement` para generar ajustes.
- Impacta `StockProjection`.
- Puede generar eventos para contabilidad (diferencias significativas).
