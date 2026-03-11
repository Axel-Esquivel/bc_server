# POS Optional Integrations (Backend)

Fecha: 2026-03-10

## Dependencias obligatorias del POS
- `auth`
- `companies`
- `inventory`
- `organizations`
- `outbox`
- `products`

## Integraciones opcionales evaluadas
- **price-lists**
  - No hay consumo directo desde el POS backend.
  - El POS usa precio base provisto por el frontend.
- **prepaid**
  - No hay consumo directo desde el POS backend.
- **customers**
  - `customerId` es opcional en el DTO de venta.
- **promotions**
  - No hay integracion activa; descuentos se mantienen en `0`.
- **accounting**
  - Sin acoplamiento directo.
  - El POS emite eventos por outbox (`pos.sale.completed`) para integraciones contables opcionales.
  - Accounting acepta `pos.sale.completed` y `pos.sale.posted` como compatibilidad hacia atras.

## Degradacion segura
- Si los modulos opcionales no estan instalados, el POS opera con precios base y sin funcionalidades adicionales.
