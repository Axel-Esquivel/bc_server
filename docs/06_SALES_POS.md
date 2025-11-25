# 06 – Ventas y POS

Define el módulo de **ventas** y **punto de venta (POS)**.

## 1. Entidades principales

### 1.1. Cart

- Carrito de venta temporal.
- Campos:
  - `workspaceId`, `companyId`
  - `customerId?`
  - `warehouseId`
  - `status`: `OPEN`, `CONFIRMED`, `CANCELLED`
  - `lines[]` (o entidad separada `CartLine`)
  - `totals` calculados (subtotal, descuentos, impuestos, total).

### 1.2. CartLine

- Campos:
  - `cartId`
  - `variantId`
  - `quantity`
  - `unitPrice`
  - `discounts?`
  - `taxes?`

### 1.3. Sale / SaleLine

- Al confirmar un carrito se genera:
  - `Sale` (cabecera)
  - `SaleLine[]` (detalle)
- `Sale` incluye:
  - `workspaceId`, `companyId`
  - `customerId?`
  - `warehouseId`
  - `status`: `CONFIRMED`, `CANCELLED`, `REFUNDED`, etc.
  - `payments[]`
  - referencias a movimientos de inventario.

### 1.4. Payment

- Campos:
  - `saleId`
  - `method`: `CASH`, `CARD`, `VOUCHER`, `MIXED`, etc.
  - `amount`
  - `currency`

## 2. Flujo POS

1. Crear carrito: `POST /pos/carts`.
2. Agregar líneas: `POST /pos/carts/:id/lines`.
3. Calcular promociones y precios (ver `10_PRICING_DISCOUNTS_PROMOS.md`).
4. Registrar pagos: `POST /pos/carts/:id/payments`.
5. Confirmar venta:
   - `POST /pos/carts/:id/confirm`:
     - Genera `Sale`, `SaleLine`.
     - Crea `InventoryMovement` OUT.
     - Dispara eventos para contabilidad.

## 3. Reglas de stock

- Al agregar ítems al carrito:
  - Se puede **reservar** stock (incrementar `reserved`).
- Al confirmar el carrito:
  - Se crea movimiento `OUT` y se descuenta de `onHand`.

## 4. Integración con clientes y crédito

- Si la venta es al crédito:
  - Debe crear transacciones de cliente (ver `09_CLIENTS_CREDIT.md`).
- Bloquear ventas si el cliente excede su límite de crédito.

## 5. Sockets (visión general)

- Eventos en tiempo real (definidos a detalle en documento de realtime):
  - Actualización de carritos.
  - Disponibilidad de inventario.
  - Notificaciones de nuevas ventas para dashboards.
