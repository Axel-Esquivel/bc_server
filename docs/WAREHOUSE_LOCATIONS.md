# WAREHOUSE_LOCATIONS – Bodegas y ubicaciones

Este documento detalla el modelo de bodegas y ubicaciones.

## 1. Warehouse

- Campos:
  - `name`
  - `code`
  - `type`: `STORE`, `WAREHOUSE`, `TRANSIT`, `VIRTUAL`
  - flags:
    - `allowNegativeStock`
    - `allowCountingLock`
  - `OrganizationId`, `companyId`

- Ver módulo `WarehousesModule`.

## 2. Location

- Ubicación física dentro de una bodega.
- Campos:
  - `warehouseId`
  - `code` estructurado:
    - `zone-aisle-rack-level-bin` (ejemplo: `A-01-03-02-05`)
  - `type`:
    - `PICKING`, `BULK`, `RECEIVING`, `SHIPPING`, `RETURN`, `QUARANTINE`, etc.
  - `capacity` (opcional)
  - restricciones (por peso, volumen, tipo de producto)

- Reglas:
  - Una `Location` pertenece a un único `Warehouse`.
  - No eliminar `Location` si tiene stock (o al menos validarlo).

## 3. Endpoints básicos

- `GET /warehouses`
- `POST /warehouses`
- `GET /warehouses/:id`
- `POST /warehouses/:id/locations`
- `GET /warehouses/:id/locations`

## 4. Relación con inventario

- `InventoryMovement` puede incluir `locationId`.
- `StockProjection` también puede estar particionada por `locationId`.
- Conteos físicos (`INVENTORY_COUNTS.md`) se hacen por warehouse/location.
