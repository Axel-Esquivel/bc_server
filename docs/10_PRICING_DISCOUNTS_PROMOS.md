# 10 – Precios, Descuentos y Promociones

Define el sistema de precios y promociones.

## 1. Listas de precios

- Ver `04_PRODUCTS_VARIANTS_PROVIDERS.md` para la entidad base `PriceList`.
- Reglas:
  - Cada workspace puede tener varias listas.
  - Una lista puede ser default para un canal o tipo de venta.

## 2. Reglas de descuento

- Descuento por cantidad:
  - A partir de cierto `minQty` reducir el precio.
- Descuento por cliente o grupo de clientes:
  - Ligadas a `Customer` o segmentos.

## 3. Promociones y combos

- Entidad `Promotion`:
  - `name`
  - `type`:
    - `BUY_X_GET_Y`
    - `PERCENTAGE_DISCOUNT`
    - `FIXED_DISCOUNT`
  - `validFrom`, `validTo`
  - `conditions` (JSON estructurado)
  - `effects` (JSON estructurado)

- Entidad `ComboRule`:
  - Permite combos tipo:
    - 3x2
    - Combo de productos a precio especial.

## 4. Evaluación de precios en POS

- Para cada línea del carrito:
  - Determinar precio base desde la lista de precios.
  - Aplicar descuentos por cantidad.
  - Evaluar promociones globales del carrito.
- Mantener la lógica en servicios de dominio reutilizables (no en el controller).
