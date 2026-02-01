# 04 – Productos, Variantes, UoM, Proveedores y Listas de Precios

Este documento define el modelo de productos tipo Odoo para Business Control.

## 1. Productos y variantes

### 1.1. Product

- Producto genérico (no necesariamente vendible).
- Campos:
  - `name`
  - `categoryId` (del catálogo)
  - `OrganizationId`, `companyId`
  - flags:
    - `isActive`
    - `isStockTracked`
    - `isService`
- No maneja stock directamente.

### 1.2. ProductVariant

- Unidad vendible.
- Campos:
  - `productId`
  - `name` (puede derivarse de product + atributos)
  - `sku` (interno, obligatorio)
  - `barcodes: string[]`
  - `uomId` (unidad de medida base)
  - `OrganizationId`, `companyId`
  - flags:
    - `isSalable`
    - `isPurchasable`
- Puede tener precios, costos y stock.

## 2. Unidades de medida (UoM)

- Entidad `Uom`:
  - `name`, `symbol`
  - `category` (por ejemplo, peso, volumen, unidades)
  - `factor` (relación con unidad base de la categoría)
- Ejemplo:
  - `Unidad` (factor 1)
  - `Caja x12` (factor 12, misma categoría).

## 3. Proveedores (Providers)

- Entidad `Provider`:
  - `name`, `nit` / identificación fiscal
  - `contacts`, `phones`, `emails`
  - `OrganizationId`, `companyId`
- Relación con variantes:
  - `providerVariants[]` con:
    - `variantId`
    - `providerSku`
    - `lastCost`
    - `currency`

## 4. Listas de precios (Price Lists)

- Entidad `PriceList`:
  - `name`
  - `currency`
  - `OrganizationId`, `companyId`
  - `isDefault`
- `PriceListLine` (embebido o separado):
  - `variantId`
  - `price`
  - `minQty` (para escalas por cantidad)
  - reglas adicionales (por cliente, canal, etc. a futuro).

## 5. Catálogos (Catalogs)

- Estructuras para clasificar productos:
  - Categorías de producto.
  - Familias, marcas, etc.
- Usados para reportes y contabilidad.

## 6. Reglas generales

- Todas las entidades deben tener:
  - `OrganizationId`
  - `companyId` cuando aplique.
- No se deben mezclar variantes de distintos Organizations.
- Las búsquedas por nombre/sku/barcode deben estar indexadas.
