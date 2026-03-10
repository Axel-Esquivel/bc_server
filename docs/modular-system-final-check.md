# Modular System Final Check (Backend)

Scope: `server/src`

## Estado general
- Metadata de modulos: OK (todos los modulos en `server/src/modules/*` tienen `module.config.ts`).
- Registro de modulos: OK (`module-registry.data.ts` incluye todos los modulos y soporte interno).
- Dependencias declaradas vs reales: OK (sin discrepancias detectadas).
- Catalogo de tienda: coherente con modulos instalables; modulos internos/soporte no aparecen.

## Modulos correctos
- Todos los modulos con metadata y dependencias alineadas.
- `realtime` registrado como soporte interno (no instalable).
- `outbox` y `product-categories` registrados como soporte interno.

## Modulos aún inconsistentes
- Ninguno detectado en dependencias/metadata/registro.

## Deuda tecnica pendiente
- `app.module.ts` mantiene imports estaticos (no se cambia por estabilidad).
- `modules.catalog.ts` no incluye algunos modulos internos por diseno (ok), pero requiere mantenimiento manual.

## Riesgos actuales
- Acoplamiento estatico en AppModule limita desinstalacion real en runtime; mitigado por checks de modulo en servicios, pero sigue siendo riesgo estructural.

## Siguiente fase recomendada
1. Revisar carga dinamica (sin romper arranque) para reducir imports estaticos en AppModule.
2. Automatizar sincronizacion de catalogo con metadata.
