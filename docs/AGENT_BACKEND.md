# AGENT_BACKEND – Guía para el agente de código (Backend)

Este documento define **cómo debe trabajar cualquier agente de IA / asistente de código** dentro del backend de **Business Control**.

## 1. Contexto general

- Proyecto: **Business Control – Backend**
- Stack principal:
  - Node.js + **NestJS 11**
  - MongoDB + **@nestjs/mongoose** + **@typegoose/typegoose**
  - Arquitectura **hexagonal**, **CQRS** (commands/queries) y **event sourcing** progresivo.
- Dominio: ERP ligero para tiendas / POS:
  - Productos, variantes, UoM, proveedores, listas de precios.
  - Inventario, bodegas, ubicaciones, conteos físicos.
  - Compras, POS, ventas, clientes y crédito.
  - Contabilidad automática, impuestos, reportes.
  - Multiempresa / multi-workspace.

El agente debe **siempre respetar** la estructura de carpetas, nombres de clases y contratos ya definidos.

## 2. Documentos que el agente debe leer SIEMPRE

Antes de generar código o modificar archivos, el agente debe considerar como referencia mínima:

- `docs/AGENT_BACKEND.md` (este documento)
- `docs/00_PROJECT_OVERVIEW.md`
- `docs/01_ARCHITECTURE.md`
- `docs/02_MODULES_OVERVIEW.md`
- `docs/15_API_STYLE_GUIDE.md`
- `docs/14_SECURITY_LOGS_AUDIT.md`

Para tareas específicas también deberá revisar:

- `docs/03_AUTH_WORKSPACES_ROLES.md`
- `docs/04_PRODUCTS_VARIANTS_PROVIDERS.md`
- `docs/05_INVENTORY_STOCK_COSTS.md`
- `docs/06_SALES_POS.md`
- `docs/07_PURCHASES_REPLENISHMENT.md`
- `docs/08_ACCOUNTING_TAXES.md`
- `docs/09_CLIENTS_CREDIT.md`
- `docs/10_PRICING_DISCOUNTS_PROMOS.md`
- `docs/11_REPORTS_BI.md`
- `docs/12_MODULE_LOADER.md`
- `docs/13_DEVOPS_DOCKER_CI_CD.md`
- `docs/WAREHOUSE_LOCATIONS.md`
- `docs/INVENTORY_COUNTS.md`

## 3. Reglas obligatorias para el agente

1. **No cambiar nombres** de:
   - Clases
   - Módulos
   - Servicios
   - Carpetas / rutas
   a menos que el usuario lo pida explícitamente y se explique el impacto.

2. Mantener:
   - `workspaceId` y `companyId` en las entidades que lo usan.
   - Patrones de repositorio, servicios y controladores ya definidos.

3. **Respuestas HTTP**:
   - Todas las respuestas deben usar la estructura `ApiResponse<T>` descrita en `15_API_STYLE_GUIDE.md`:
     ```ts
     export interface ApiResponse<T> {
       status: 'success' | 'error';
       message: string;
       result: T;
       error: any;
     }
     ```

4. **Validaciones**:
   - Usar `class-validator` en todos los DTOs expuestos.
   - No exponer IDs internos sensibles si no es necesario.

5. **CQRS + eventos**:
   - Para módulos nuevos, seguir el patrón:
     - `commands/` + `queries/` + `events/`
     - Handlers en subcarpetas (`handlers/`).
   - Servicios de dominio ligeros, sin lógica de HTTP.

6. **Logs y auditoría**:
   - Usar los middlewares / interceptores del core para:
     - `requestId`
     - `userId`
     - `workspaceId`
     - `deviceId`
     - `ip`
   - No imprimir datos sensibles en logs.

7. **Multi-tenancy**:
   - Cualquier entidad nueva que represente datos de negocio debe incluir:
     - `workspaceId: string`
     - opcionalmente `companyId: string`
   - Nunca mezclar datos de workspaces distintos en la misma consulta.

## 4. Estilo de código

- TypeScript estricto.
- Clases y métodos con nombres claros orientados al dominio (no genéricos tipo `doStuff`).
- Comentarios solo donde realmente agregan claridad.
- Mantener consistencia de imports (paths relativos/absolutos según el proyecto actual).

## 5. Flujo recomendado de trabajo para el agente

1. Leer los documentos relevantes listados arriba.
2. Identificar **qué módulo** y **qué capa** se debe tocar:
   - Controller
   - Service / Domain Service
   - Command / Query handler
   - Schema / Model
3. Proponer cambios localizados, evitando reescribir archivos completos si no es necesario.
4. Mantener compatibilidad hacia atrás (backwards compatible) siempre que se pueda.

## 6. Frase de inicio

Cuando el agente haya leído los documentos y esté listo para trabajar, debe responder:

> `LISTO (BACKEND)` – listo para generar o modificar código respetando los documentos de arquitectura y estilo.
