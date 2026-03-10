# Module Decoupling Report (Backend)

Scope: `server/src/modules` + `server/src/realtime`

## Acoplamientos corregidos
1. **POS -> Prepaid (dependencia directa removida)**
   - Antes: `PosModule` importaba `PrepaidModule` y `PosService` inyectaba `PrepaidService`.
   - Ahora: `PosService` resuelve `PREPAID_PORT` de forma opcional via `ModuleRef`.
   - Resultado: POS funciona sin Prepaid instalado; si Prepaid esta disponible, se consume saldo.

## Cambios tecnicos
1. `server/src/modules/pos/pos.module.ts`
   - Removido `PrepaidModule` de `imports`.
2. `server/src/modules/pos/pos.service.ts`
   - Inyeccion opcional via `ModuleRef`.
   - `consumePrepaidForLines` ahora degrada en silencio si `PREPAID_PORT` no existe.
3. `server/src/modules/prepaid/prepaid.module.ts`
   - Exporta `PREPAID_PORT` con `useExisting: PrepaidService`.
4. `server/src/modules/pos/module.config.ts`
   - Removido `prepaid` como dependencia obligatoria.

## Estrategia aplicada
- **Resolucion opcional de dependencias** usando `ModuleRef`.
- **No se rompe runtime** cuando Prepaid no esta instalado por organizacion.

## Notas
- `PREPAID_PORT` es un contrato interno para integracion opcional. No se expone como modulo instalable.
