# Arquitectura

- Patrón: Hexagonal + CQRS. Controladores delgados → Commands/Queries → Servicios de dominio → Repositorios.
- Persistencia: Mongoose. Índices compuestos por multi-empresa.
- Concurrencia inventario: ledger + proyección + reservas + optimistic locking.
- Eventos: contratos definidos en `docs/events.md`. Bus inicial: Redis.
- Seguridad: JWT, RBAC por módulo/acción, AuditInterceptor global.
