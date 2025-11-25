# 07 – Compras y Reabastecimiento

Define el módulo de **compras**, **reabasto** y costos de proveedor.

## 1. Entidades principales

- `PurchaseOrder`
- `PurchaseOrderLine`
- `GoodsReceiptNote` (GRN)
- `SupplierCostHistory`

### 1.1. PurchaseOrder

- Campos:
  - `workspaceId`, `companyId`
  - `providerId`
  - `status`: `DRAFT`, `CONFIRMED`, `RECEIVED`, `CANCELLED`
  - `expectedDate`
  - `lines[]`

### 1.2. PurchaseOrderLine

- Campos:
  - `orderId`
  - `variantId`
  - `quantity`
  - `unitCost`
  - `currency`

### 1.3. GoodsReceiptNote (GRN)

- Documento de recepción de mercadería.
- Al confirmarse:
  - Genera `InventoryMovement` de tipo `IN`.
  - Actualiza costos.

### 1.4. SupplierCostHistory

- Historial de costos por proveedor y variante:
  - `providerId`
  - `variantId`
  - `cost`
  - `currency`
  - `date`

## 2. Sugerencias de compra

- Endpoint: `GET /purchases/suggestions`
- Basado en:
  - Stock mínimo.
  - Rotación.
  - Ventas recientes.
  - Fechas de vencimiento (FEFO).

## 3. Flujo de compra

1. Revisar sugerencias.
2. Crear `PurchaseOrder` a partir de las sugerencias.
3. Confirmar orden.
4. Registrar GRN (`POST /purchases/grn`).
5. Actualizar stock y costos promedio.

## 4. Integración con contabilidad

- Confirmación de GRN debe generar asientos contables:
  - Inventario
  - Cuentas por pagar
  - Impuestos (ver `08_ACCOUNTING_TAXES.md`).
