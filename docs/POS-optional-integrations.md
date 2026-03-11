# POS Optional Integrations (Backend)

Fecha: 2026-03-11

## Integraciones opcionales evaluadas
- **price-lists**
  - El POS no depende directamente de price-lists.
  - La resolución de precios se maneja en `ProductsService.resolvePrice`, que ya valida si el módulo está instalado.
- **prepaid**
  - Sin integración directa en el POS base.
- **customers**
  - `customerId` es opcional en la venta, pero no se consume en el POS base.
- **promotions**
  - Sin integración activa; descuentos quedan en cero.
- **accounting**
  - Sin acoplamiento directo.
  - El POS emite evento `pos.sale.completed` vía outbox si accounting está instalado.

## Degradación segura
- Si un módulo opcional no está instalado, el POS base opera con precio base y sin funciones adicionales.
- No hay llamadas a servicios opcionales si no están habilitados.
