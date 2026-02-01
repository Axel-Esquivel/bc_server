# Agent Guide (Codex) – Backend NestJS

## Objetivo
Generar y editar archivos del **servidor NestJS** (Node 18/20) con MongoDB y Redis, arquitectura modular (hexagonal + CQRS). Sin usar `nestjs-typegoose`.

## Reglas de oro
1. **Un archivo por respuesta.** Entregar **exclusivamente** el contenido del archivo indicado (sin prefacios ni explicaciones).
2. Debe **compilar** con TypeScript estricto. Incluir imports correctos.
3. Mantener **nombres, firmas y rutas** indicadas; no renombrar clases, métodos ni rutas existentes.
4. Validación con `class-validator`; DTOs con `@ApiProperty?` opcional a futuro.
5. Seguridad: usar `ValidationPipe` (whitelist/transform), evitar `any`.
6. Estilo NestJS 11: módulos pequeños, servicios inyectables, controladores delgados.
7. MongoDB con `@nestjs/mongoose` y `mongoose`. No usar `nestjs-typegoose`.
8. Logs y auditoría: respetar `AuditInterceptor` y `LogsService.capture(...)`.
9. Sin pseudo-código. Si algo depende de otro módulo, **agrega un TODO claro**, pero entrega el archivo compilable.

## Estructura relevante
- `src/main.ts`
- `src/app.module.ts`
- `src/common/interceptors/audit.interceptor.ts`
- `src/core/logs/*` (module, service, model)
- `src/core/auth/*` (module, service, controller)
- `src/core/users/*` (module, model, service, controller)
- `src/domains/*` (catalog, inventory, pos, purchases, pricing, accounting)

## Librerías
- `@nestjs/cqrs @nestjs/mongoose mongoose @nestjs/config`
- `class-validator class-transformer`
- `@nestjs/websockets @nestjs/platform-socket.io socket.io`
- `ioredis helmet cors uuid dotenv`

## Convenciones
- Multi-empresa por `OrganizationId` y `companyId` en modelos de negocio.
- Indexar campos críticos (búsquedas, integridad).
- Endpoints REST con prefijo de módulo; sin mezclar responsabilidades.

## Formato de las respuestas
- Encabezado: _ninguno_.
- Cuerpo: **solo el contenido exacto del archivo**.

