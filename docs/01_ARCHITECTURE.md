# 01 – Arquitectura del Backend

Este documento describe la arquitectura del backend de **Business Control**.

## 1. Estilo arquitectónico

- Arquitectura **hexagonal / puertos y adaptadores**:
  - Dominio en el centro.
  - Adaptadores para HTTP, persistencia, mensajería, etc.
- Uso de **CQRS**:
  - Separación entre Commands (modifican estado) y Queries (solo lectura).
- Uso progresivo de **event sourcing**:
  - Algunos módulos (users, contabilidad) podrán almacenar eventos además del estado actual.

## 2. Capas principales

Lógicamente dividimos el código en:

1. **Core** (`src/core`):
   - Interceptores globales.
   - Filtros de excepciones.
   - Middlewares (requestId, audit, rate limiting).
   - Guards base (JWT, roles, permisos).

2. **Config / Shared / Common**:
   - Configuración de entorno.
   - Utilidades compartidas (helpers, tipos comunes, etc.).
   - No contienen lógica de dominio.

3. **Módulos de dominio** (`src/modules`):
   - Cada subcarpeta representa un módulo funcional (auth, products, inventory, etc.).
   - Cada módulo contiene:
     - `controllers/`
     - `services/` (aplicación / dominio)
     - `models/` o `schemas/` (Typegoose)
     - `dto/`
     - `commands/` y `queries/` (cuando aplica)
     - `events/` (cuando aplica)

4. **Integraciones externas**:
   - Microservicio `xlsx-ops` (para Excel).
   - Futuras integraciones (pagos, facturación electrónica, etc.).

## 3. Estructura típica de un módulo

Ejemplo (simplificado):

```txt
src/modules/products/
  controllers/
    products.controller.ts
  services/
    products.service.ts
  models/
    product.model.ts
    product-variant.model.ts
  dto/
    create-product.dto.ts
    update-product.dto.ts
  commands/
    handlers/
      create-product.handler.ts
  queries/
    handlers/
      list-products.handler.ts
```

Reglas:

- El **controller** solo maneja HTTP → llama a comandos / consultas o servicios.
- Los **services** coordinan lógica de dominio (pero evitan ser “dios”).
- Los **handlers** de commands/queries contienen la lógica específica de cada operación.
- Los **models** usan Typegoose y Mongoose, con índices importantes (por workspaceId, etc.).

## 4. Manejo de datos y multitenancy

- Todas las operaciones deben filtrar por `workspaceId` (obligatorio).
- `companyId` se usa cuando se necesita distinguir por empresa dentro del mismo workspace.
- Se deben usar índices compuestos (`workspaceId + otros campos`) para acelerar búsquedas.

## 5. CQRS y eventos de dominio

- Cada acción importante del sistema debe generar un **evento de dominio**:
  - Ejemplos: `UserRegisteredEvent`, `PurchaseOrderConfirmedEvent`, `SaleCompletedEvent`.
- Los event handlers pueden:
  - Disparar notificaciones.
  - Actualizar proyecciones (por ejemplo, reportes o dashboards).
  - Registrar auditoría adicional.

## 6. Manejo de errores y respuestas

- Interceptor global transforma cualquier retorno en `ApiResponse<T>`.
- El filtro global maneja HttpException y errores genéricos.
- Nunca se devuelven errores sin estructura.

Ver detalles en `15_API_STYLE_GUIDE.md` y `14_SECURITY_LOGS_AUDIT.md`.
