# 09 – Clientes y Crédito

Define el módulo de **clientes**, líneas de crédito y estados de cuenta.

## 1. Entidades

- `Customer`
- `CreditLine`
- `CustomerTransaction`
- `CustomerBalance`

### 1.1. Customer

- Campos:
  - `name`
  - `nit` / identificación fiscal
  - `phones`, `emails`
  - `address`
  - `OrganizationId`, `companyId`
  - `creditLineId?`

### 1.2. CreditLine

- Campos:
  - `customerId`
  - `limitAmount`
  - `availableAmount` (derivado)
  - `terms` (días de crédito)
  - `status`: `ACTIVE`, `BLOCKED`

### 1.3. CustomerTransaction

- Registro de movimientos de cuenta de cliente:
  - `type`: `CHARGE`, `PAYMENT`, `ADJUSTMENT`
  - `amount`
  - `date`
  - referencias (venta, nota de crédito, etc.)

### 1.4. CustomerBalance

- Proyección del saldo:
  - `customerId`
  - `balance`
  - `lastUpdatedAt`

## 2. Reglas de crédito

- No permitir nuevas ventas al crédito si:
  - El total del cliente supera el límite.
- Las ventas al contado no afectan la línea de crédito.

## 3. Endpoints

- CRUD de clientes (`/customers`).
- Configuración de crédito:
  - `/customers/:id/credit` (crear/actualizar CreditLine).
- Estado de cuenta:
  - `/customers/:id/statement`.
