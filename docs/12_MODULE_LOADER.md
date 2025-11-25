# 12 – Module Loader (estilo Odoo)

Define el sistema de carga dinámica de módulos.

## 1. Objetivo

- Permitir que módulos del backend puedan:
  - Habilitarse o deshabilitarse dinámicamente.
  - Declarar dependencias entre sí.
- Similar a los módulos de Odoo.

## 2. module.config.ts

- Cada módulo tendrá un archivo `module.config.ts` con:

  ```ts
  export default {
    name: 'auth',
    version: '1.0.0',
    enabled: true,
    dependencies: ['core'],
  };
  ```

- Campos:
  - `name`: identificador único del módulo.
  - `version`: versión semver.
  - `enabled`: si está activo.
  - `dependencies`: lista de nombres de otros módulos requeridos.

## 3. ModuleLoaderService

- Responsabilidades:
  - Leer la lista de módulos disponibles.
  - Resolver dependencias.
  - Marcar módulos como:
    - `active`
    - `degraded` (si falta alguna dependencia).
  - Exponer métodos:
    - `listModules()`
    - `enableModule(name)`
    - `disableModule(name)`

- Persistencia:
  - Puede empezar en memoria.
  - Más adelante, guardar en MongoDB.

## 4. Endpoints

- `GET /modules`
  - Lista de módulos, versión y estado.
- `POST /modules/install`
  - Marca un módulo como habilitado.
- `POST /modules/uninstall`
  - Marca un módulo como deshabilitado.
