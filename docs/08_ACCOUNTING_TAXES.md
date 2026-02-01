# 08 – Contabilidad e Impuestos

Define el módulo de **contabilidad automática** e **impuestos**.

## 1. Entidades

- `Account`
- `JournalEntry`
- `JournalEntryLine`
- `TaxRule`

### 1.1. Account

- Catálogo de cuentas contables.
- Campos:
  - `code`
  - `name`
  - `type` (activo, pasivo, patrimonio, ingreso, gasto, etc.)
  - `OrganizationId`, `companyId`

### 1.2. JournalEntry

- Asiento contable.
- Campos:
  - `date`
  - `reference`
  - `lines[]`
  - `OrganizationId`, `companyId`
  - `status`: `DRAFT`, `POSTED`

### 1.3. JournalEntryLine

- Campos:
  - `accountId`
  - `debit`
  - `credit`
  - referencias a eventos de origen (venta, compra, ajuste, etc.)

### 1.4. TaxRule

- Reglas de impuestos:
  - `name`
  - `rate`
  - `type` (IVA, retención, etc.)
  - `OrganizationId`, `companyId`

## 2. Integración basada en eventos

- Eventos de negocio que generan entradas contables:
  - `SaleCompletedEvent`
  - `PurchaseOrderReceivedEvent`
  - `InventoryAdjustedEvent`
  - `PaymentRegisteredEvent`
- Cada evento debe tener un handler que:
  - Construya el JournalEntry.
  - Asigne cuentas según configuración del cliente.

## 3. Bloqueo de períodos

- Períodos contables que pueden cerrarse:
  - Una vez cerrado, no se pueden modificar asientos.
- Requiere:
  - Validar fechas de nuevas transacciones.
  - Opcionalmente permitir asientos de ajuste en períodos especiales.
