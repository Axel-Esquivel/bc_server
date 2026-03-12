# POS Cierre por denominaciones (Backend)

Fecha: 2026-03-12

## Objetivo
Registrar el cierre de caja por denominaciones, calcular total contado y diferencia frente al esperado.

## Cambios
- `PosSessionRecord` incluye `closingDenominations`.
- `ClosePosSessionDto` acepta `closingDenominations`.
- Se calcula `countedClosingAmount` desde denominaciones.
- Se calcula `differenceAmount` con base en `expectedClosingAmount`.
- Se requiere observación si hay diferencia distinta de cero.

## Validaciones
- No se permite cerrar sesión inexistente o no abierta.
- Se valida permiso del usuario según `allowOtherUsersClose`.
- Se requiere cierre por denominaciones con moneda consistente.

## Endpoint
- `POST /pos/sessions/close`

## Pendientes
- Movimientos de caja fuera de ventas (no registrados aún).
