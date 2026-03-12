# POS Movimientos de caja (Backend)

Fecha: 2026-03-12

## Objetivo
Registrar movimientos de caja durante la sesión POS y reflejar su impacto en el efectivo esperado.

## Modelo
- `PosCashMovementRecord` en `server/src/modules/pos/entities/pos-cash-movement.entity.ts`
  - `sessionId`, `type`, `amount`, `currencyId`, `paymentMethod`, `reason`, `notes`, `createdByUserId`, `createdAt`

## Endpoints
- `POST /pos/sessions/:id/movements`
- `GET /pos/sessions/:id/movements`

## Reglas
- Solo se permite movimiento con sesión abierta.
- Solo efectivo (`paymentMethod = CASH`).
- El monto se firma según tipo:
  - `income` y `float` suman.
  - `expense` y `withdrawal` restan.
  - `adjustment` respeta el signo del monto.
- Se valida que la moneda coincida con el POS.

## Impacto en cierre
- `expectedClosingAmount` incluye pagos en efectivo + movimientos de caja.
- El resumen de sesión retorna `cashMovements`.
