# Sprint 0 — Prompts

1) src/main.ts
- helmet, cors, ValidationPipe (whitelist/transform), puerto desde env, log de arranque.

2) src/app.module.ts
- ConfigModule.forRoot(isGlobal), MongooseModule.forRoot(process.env.MONGO_URI!), CqrsModule.

3) src/core/logs/logs.module.ts
- Exporta LogsService.

4) src/core/logs/models/request-log.model.ts
- Campos: requestId, userId?, deviceId?, ip, method, url, status, ms, createdAt (Date). Esquema Mongoose + índice en createdAt (desc).

5) src/core/logs/logs.service.ts
- `capture(log: RequestLog)` persiste; método `findRecent(limit=100)` opcional.

6) src/common/interceptors/audit.interceptor.ts
- requestId (uuid), medir tiempo, obtener userId/deviceId si existen en req, inyectar LogsService y capturar.
