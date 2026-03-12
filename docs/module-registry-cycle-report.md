# Module Registry Cycle Report

Fecha: 2026-03-12

## Contexto
Se revisaron `ModuleRegistryService`, `ModuleLoaderService`, `module-registry.data.ts` y los `module.config.ts` del backend para corregir ciclos de dependencias reportados en logs.

## Ciclos detectados (según logs y metadata previa)
1. `accounting -> organizations -> accounting`
2. `auth -> companies -> auth`
3. `auth -> companies -> module-loader -> pos -> auth`
4. `auth -> devices -> auth` (potencial)
5. `auth -> organizations -> auth` (potencial)

## Causas identificadas
- `module-loader` declaraba dependencias hacia todos los módulos, generando ciclos artificiales con módulos installables (ej. `pos`).
- `companies`, `branches` y `users` declaraban dependencia con `auth` sin requerirla como dependencia modular dura.
- `devices` declaraba dependencia con `auth` únicamente por uso de guardas, generando un ciclo con `auth`.
- `organizations` declaraba dependencias amplias hacia módulos core e installables, generando ciclos con módulos que ya dependen de `organizations`.

## Correcciones aplicadas
1. `server/src/modules/module-loader/module.config.ts`
   - Dependencias ajustadas a `[]` (el loader no depende funcionalmente de los módulos que gestiona).
2. `server/src/modules/companies/module.config.ts`
   - Se removió `auth` de dependencias.
3. `server/src/modules/branches/module.config.ts`
   - Se removió `auth` de dependencias.
4. `server/src/modules/users/module.config.ts`
   - Se removió `auth` de dependencias.
5. `server/src/modules/devices/module.config.ts`
   - Se removió `auth` de dependencias.
6. `server/src/modules/organizations/module.config.ts`
   - Dependencias reducidas a `['module-loader']` para evitar ciclos y reflejar el carácter base del módulo.

## Ciclos resueltos
- `auth -> companies -> auth`
- `auth -> companies -> module-loader -> pos -> auth`
- `auth -> devices -> auth`
- `auth -> organizations -> auth`
- `accounting -> organizations -> accounting`

## Ciclos pendientes
No se detectaron ciclos adicionales en la metadata revisada tras los ajustes. Si vuelven a aparecer en runtime, revisar nuevas dependencias declaradas o módulos añadidos.

## Módulos con metadata corregida
- `module-loader`
- `companies`
- `branches`
- `users`
- `devices`
- `organizations`

## Notas
- Estos cambios ajustan la metadata del registro modular para evitar falsos positivos y ciclos innecesarios, sin modificar el runtime de Nest.
- No se alteró la carga estática de módulos ni la arquitectura actual del backend.
