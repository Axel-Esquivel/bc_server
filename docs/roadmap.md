# Roadmap (Sprints)

## Principios base
Hexagonal + CQRS + Event Bus (Redis de inicio). Event Sourcing opcional en Inventario/Ventas. Multi-empresa por `OrganizationId`, `companyId`. Concurrencia en inventario con reservas + optimistic locking. UoM y conversión. Socket.IO realtime. RBAC. Auditoría global.

---

## Sprint 0 — Fundamentos
- Bootstrap (`main.ts`, `app.module.ts`)
- Logs (módulo + modelo + servicio)
- AuditInterceptor global
- Configuración env

## Sprint 1 — Auth, Users, Roles, Organizations, Devices
- Users (modelo, service, controller)
- Auth (login JWT, hash/compare)
- Roles/Permissions (decorador + guard básico)
- Organizations (miembros/roles)
- Devices (ping / lastSeen)

## Sprint 2 — Catálogo
- UoM (module/model/service/controller)
- Product (genérico)
- ProductVariant (vendible: barcodes[], sku?, uomId/uomQty, flags batch/expiry)
- Providers
- PriceLists + PriceRules + `getEffectivePrice(...)`

## Sprint 3 — Inventario
- InventoryMovement (ledger inmutable + `operationId`)
- StockProjection (onHand/reserved/available + `version`)
- StockReservation (reservas con expiración)
- Services: `reserve`, `commitSale`, `releaseReservation`
- Batches/Expirations (FEFO opcional)

## Sprint 4 — POS & Ventas
- Cart (reserva stock)
- Sale (commit ledger)
- Promotions/Combos (esqueleto)
- Sockets: `pos:cart:update`, `inventory:level:update`
