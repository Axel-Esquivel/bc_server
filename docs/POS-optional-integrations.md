# POS Optional Integrations (Backend)

Fecha: 2026-03-10

**Objetivo**
Documentar las integraciones opcionales del POS y garantizar que el POS base no falle cuando no estÃ©n instaladas.

## Dependencias obligatorias del POS
- `auth`
- `companies`
- `inventory`
- `organizations`
- `outbox`
- `products`
- `realtime`

## Integraciones opcionales y comportamiento
- **prepaid**
  - IntegraciÃ³n por puerto opcional `PREPAID_PORT` via `ModuleRef` (sin dependencia dura).
  - Si el puerto no existe, se omite el consumo prepaid sin romper la venta.

- **accounting**
  - No hay acoplamiento directo.
  - El POS emite eventos a outbox (`pos.sale.completed`, `pos.sale.posted`).
  - Si accounting no estÃ¡ instalado, los eventos quedan sin procesar sin afectar POS.

- **price-lists**
  - No se consume en backend POS.
  - El POS usa el precio de la variante (packaging default) desde productos.

- **customers**
  - Campo `customerId` es opcional en DTOs.
  - Si el mÃ³dulo no estÃ¡ instalado, la venta sigue funcionando sin cliente.

- **promotions**
  - LÃ³gica placeholder interna en POS (no depende de mÃ³dulo externo).

## Riesgos / notas
- Si en el futuro se agrega integraciÃ³n directa con mÃ³dulos opcionales, debe hacerse vÃ­a outbox, puertos o verificaciÃ³n de disponibilidad.
