# Backlog inicial – Backend NestJS

## Sprint 0 – Bootstrap
- [ ] `src/main.ts`: helmet, cors, ValidationPipe (whitelist/transform), puerto desde `process.env.PORT`.
- [ ] `src/app.module.ts`: `ConfigModule.forRoot`, `MongooseModule.forRoot(process.env.MONGO_URI!)`, `CqrsModule`.
- [ ] `src/common/interceptors/audit.interceptor.ts`: genera `requestId`, mide tiempo, llama `LogsService.capture(log)`.
- [ ] `src/core/logs/logs.module.ts`
- [ ] `src/core/logs/models/request-log.model.ts`
- [ ] `src/core/logs/logs.service.ts` con `capture(log: RequestLog)`.

## Sprint 1 – Usuarios y Auth
- [ ] `src/core/users/users.module.ts`
- [ ] `src/core/users/models/user.model.ts` (email único, name, passwordHash, OrganizationIds[], companyIds[])
- [ ] `src/core/users/services/users.service.ts` (create, findByEmail, findById)
- [ ] `src/core/users/controllers/users.controller.ts` (POST /users, GET /users/me)

- [ ] `src/core/auth/auth.module.ts` (JwtModule.registerAsync)
- [ ] `src/core/auth/services/auth.service.ts` (`hashPassword`, `comparePasswords`, `signAccessToken`, `verifyToken`)
- [ ] `src/core/auth/controllers/auth.controller.ts` (POST /auth/login)

## Sprint 2 – Catálogo base (UoM / Product / Variant)
- [ ] UoM: module/model/service/controller
- [ ] Product: model + service + controller
- [ ] ProductVariant: model + service + controller (barcodes[], sku?, uomId, uomQty, flags batch/expiry)
- [ ] Validadores y DTOs.

## Sprint 3 – Price Lists / Rules (mínimo)
- [ ] Modelos y CRUD
- [ ] `getEffectivePrice(variantId, companyId, channel, qty, date)`

## Sprint 4 – Inventario (Ledger + Proyección + Reservas)
- [ ] `InventoryMovement` model (IN/OUT/ADJ/TRANSFER_*)
- [ ] `StockProjection` model (onHand, reserved, available, version)
- [ ] `StockReservation` model
- [ ] `inventory.service.ts` (reserve, commitSale, releaseReservation) con idempotencia por `operationId`

> **Nota:** al pedir a Codex cada archivo, referencia esta lista y exige:  
> “**Entrega exclusivamente el contenido del archivo X**.”
