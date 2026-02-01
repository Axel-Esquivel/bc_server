## 15) REALTIME, SOCKETS Y NOTIFICACIONES (POS, INVENTARIO, DASHBOARDS, CHAT)

Lee primero:
- docs/AGENT_BACKEND.md
- docs/00_PROJECT_OVERVIEW.md
- docs/01_ARCHITECTURE.md
- docs/02_MODULES_OVERVIEW.md
- docs/14_SECURITY_LOGS_AUDIT.md
- docs/16_REALTIME_AND_NOTIFICATIONS.md

Tarea:

Quiero que diseñes e implementes la **infraestructura de tiempo real** del backend de Business Control, usando NestJS 11 y websockets (socket.io), respetando siempre la arquitectura hexagonal + CQRS + eventos de dominio y el estilo de API definido en los demás documentos.

Alcance:

1. **Infraestructura base de realtime**:
   - Crea un módulo dedicado, por ejemplo: `src/modules/realtime/` con:
     - `realtime.module.ts`
     - `realtime.gateway.ts` (o varios gateways por dominio si lo consideras necesario)
     - Adaptador/configuración de socket.io (autenticación en el handshake, extracción de `userId`, `OrganizationId`, `deviceId` desde el JWT y los headers).
   - Define la convención de:
     - Namespace principal: `/realtime`.
     - Rooms por Organization, usuario y dispositivo:
       - `Organization:{OrganizationId}`
       - `user:{userId}`
       - `device:{deviceId}`
     - Rooms específicos para módulos donde tenga sentido (ej: `pos:workstation:{posId}`, `inventory:warehouse:{warehouseId}`, `chat:channel:{channelId}`).

2. **Integración con CQRS y eventos de dominio**:
   - No pongas lógica de negocio en los gateways.
   - La lógica debe seguir este flujo:
     - El cliente dispara peticiones HTTP o comandos que ya existen (POS, inventario, compras, etc.).
     - Los command handlers aplican la lógica de dominio y persisten en MongoDB.
     - Desde los command handlers (o domain event handlers) se emiten eventos de dominio como:
       - `SaleConfirmedEvent`
       - `InventoryMovementAppliedEvent`
       - `InventoryCountSessionUpdatedEvent`
       - `CustomerCreditChangedEvent`
     - Crea event handlers que escuchen estos eventos y usen el `RealtimeGateway` para publicar eventos a los sockets, siguiendo la convención descrita en `docs/16_REALTIME_AND_NOTIFICATIONS.md`.

3. **POS y ventas en tiempo real**:
   - Implementa los eventos mínimos para POS:
     - `pos:cart:updated` → cuando se actualiza un carrito (líneas, totales, descuentos).
     - `pos:cart:confirmed` → cuando se confirma una venta.
     - `pos:inventory:availability` → para avisar cambios relevantes de stock que afecten ventas.
   - Publica estos eventos hacia:
     - Room del Organization.
     - Room del cajero / POS cuando aplique.
   - Define interfaces TypeScript para los payloads de estos eventos, y mantenlos en una carpeta compartida (por ejemplo `src/shared/realtime/`).

4. **Inventario en tiempo real**:
   - Conecta el módulo de inventario ya existente con realtime:
     - Cuando se aplique un `InventoryMovement`, emite `inventory:stock:updated` con la proyección actualizada.
     - Cuando cambie el estado de una sesión de conteo físico, emite `inventory:count-session:updated`.
   - Usa rooms tipo:
     - `inventory:warehouse:{warehouseId}`
     - `Organization:{OrganizationId}` según corresponda.
   - Asegúrate que estos eventos respeten las reglas de multitenancy (`OrganizationId`) y solo notifiquen a quienes pertenezcan a ese Organization.

5. **Dashboards y KPIs en tiempo real**:
   - Diseña una forma de emitir eventos de dashboard en tiempo real, por ejemplo:
     - `dashboard:sales:updated`
     - `dashboard:inventory-kpis:updated`
   - No calcules los KPIs completos dentro del gateway.
   - Crea servicios/proyecciones que agreguen datos (ventas, inventario, etc.) y que sean invocados periódicamente o bajo ciertos eventos de dominio, y desde ahí emitan los eventos a los sockets.
   - Incluye algún mecanismo básico (aunque sea solo a nivel de diseño/comentarios) de throttling para no saturar a los clientes.

6. **Chat de ayuda y chat interno (empleados)**:
   - Define la estructura para soportar dos tipos de chat:
     - Chat de ayuda/soporte (`chat:help`), por Organization, opcionalmente por ticket.
     - Chat interno de empleados (`chat:staff`), por Organization, sucursal o canal.
   - Crea modelos y endpoints mínimos para persistir mensajes (sin lógica compleja, pero dejando claro cómo se audita cada mensaje: `userId`, `OrganizationId`, `deviceId`, `timestamp`).
   - Implementa los eventos de socket para:
     - `chat:help:new-message`, `chat:help:message-read`.
     - `chat:staff:new-message`, `chat:staff:message-read`.
   - Asegúrate de seguir los lineamientos de seguridad y auditoría de `docs/14_SECURITY_LOGS_AUDIT.md`.

7. **Seguridad, auditoría y multitenancy**:
   - Implementa autenticación en el handshake de socket.io usando los mismos JWT que en HTTP.
   - Resuelve y asigna siempre en el contexto del socket:
     - `userId`
     - `OrganizationId`
     - `deviceId`
   - Integra logs y auditoría para:
     - Conexión y desconexión de sockets.
     - Eventos emitidos (al menos a nivel de resumen, sin payloads sensibles).
   - Respeta la separación de datos por Organization en todos los canales y rooms.

Entrega esperada:
- Archivos TypeScript que definan:
  - `RealtimeModule`, `RealtimeGateway` y cualquier adaptador necesario.
  - Interfaces de payload para eventos clave (POS, inventario, dashboards, chat).
  - Event handlers que conecten los eventos de dominio existentes con la emisión de eventos de socket.
- Comentarios claros donde algo quede como stub o diseño pendiente.