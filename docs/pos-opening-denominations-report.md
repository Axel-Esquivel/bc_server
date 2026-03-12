# POS Apertura por denominaciones (Backend)

Fecha: 2026-03-12

## Objetivo
Registrar el efectivo inicial por denominaciones en la apertura de sesión POS y calcular el `openingAmount` automáticamente.

## Modelo agregado
- `server/src/modules/pos/entities/pos-session-denomination.entity.ts`
  - `stage`: `opening`
  - `currencyId`
  - `denominationValue`
  - `denominationType`: `bill | coin`
  - `quantity`
  - `subtotal`

## Cambios en sesión POS
- `PosSessionRecord` incluye `openingDenominations`.
- `openingAmount` se calcula desde denominaciones si se envían.

## DTOs
- `server/src/modules/pos/dto/pos-session-denomination.dto.ts`
- `server/src/modules/pos/dto/open-pos-session.dto.ts` (incluye `openingDenominations`)

## Validaciones
- Si `requiresOpening` es true, se exige al menos una denominación con cantidad > 0.
- La moneda de las denominaciones debe coincidir con el `currencyId` del POS.
- Valores y cantidades deben ser positivos.

## Pendientes
- Cierre por denominaciones (no incluido en esta fase).
- Catálogo persistente de denominaciones por moneda.
