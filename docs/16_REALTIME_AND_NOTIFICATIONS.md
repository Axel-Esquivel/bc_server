# 16_REALTIME_AND_NOTIFICATIONS (Backend Only)


## 1. Objetivos del módulo en tiempo real

El backend debe proveer infraestructura WebSocket para:

### 1.1. POS en tiempo real
- Transmisión de **ventas en tiempo real**.
- Actualización inmediata de:
  - carrito del POS,
  - pagos,
  - confirmaciones,
  - totales diarios.

### 1.2. Inventarios en tiempo real
- Movimientos de inventario transmitidos al instante:
  - transferencias,
  - ajustes,
  - entradas/salidas,
  - conteos de inventario.

### 1.3. Alertas del sistema
- Envío de alertas del backend:
  - stock bajo,
  - productos vencidos,
  - límites de caja,
  - tareas del sistema.

### 1.4. Chat interno del sistema
- Soporte a:
  - chat de soporte interno (administrador ↔ usuarios),
  - chat de empleados (usuarios ↔ usuarios).

Todo administrado exclusivamente desde **NestJS WebSocket Gateway**.

---

## 2. Arquitectura del módulo WebSockets

Estructura recomendada:

```
src/modules/realtime/
    realtime.module.ts
    gateways/
        pos.gateway.ts
        inventory.gateway.ts
        notifications.gateway.ts
        chat.gateway.ts
    services/
        realtime.service.ts
        pos-events.service.ts
        inventory-events.service.ts
        notifications.service.ts
        chat.service.ts
    dto/
        pos.dto.ts
        inventory.dto.ts
        chat.dto.ts
```

---

## 3. Gateways incluidos

### 3.1. POSGateway
Eventos:
- `pos.cart.updated`
- `pos.cart.payment`
- `pos.sale.completed`
- `pos.daily-totals.updated`

### 3.2. InventoryGateway
Eventos:
- `inventory.movement.created`
- `inventory.movement.updated`
- `inventory.count.updated`

### 3.3. NotificationsGateway
Eventos:
- `system.alert`
- `system.warning`
- `system.info`

### 3.4. ChatGateway
Eventos:
- `chat.message`
- `chat.typing`
- `chat.history`

---

## 4. Integración con los módulos existentes

Los siguientes módulos deben disparar eventos al WebSocket Gateway:

### 4.1. Módulo POS
Cada venta debe emitir:
```
this.realtime.posSaleCompleted(sale);
this.realtime.updateDailyTotals(totals);
```

### 4.2. Módulo Inventory
Cuando exista un movimiento:
```
this.realtime.inventoryMovementCreated(movement);
```

### 4.3. Módulo Notifications
Para alertas:
```
this.realtime.systemAlert({ title, message });
```

### 4.4. Módulo Chat
Para chat interno:
```
this.realtime.sendMessage(roomId, message);
```

---

## 5. Seguridad de WebSockets

- Autenticación por **JWT**.
- Validación de usuario y permisos por **middleware de socket**.
- Diferenciar rooms:
  - `company:{id}`
  - `workspace:{id}`
  - `pos:{deviceId}`
  - `chat:{roomId}`

---

## 6. Ejemplo de un Gateway limpio (NestJS)

```ts
@WebSocketGateway({ cors: true, namespace: '/pos' })
export class PosGateway {
  @WebSocketServer()
  server: Server;

  sendSaleCompleted(data: any) {
    this.server.emit('pos.sale.completed', data);
  }
}
```

---

## 7. Variables de entorno necesarias

Agregar al `.env`:

```
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3001
```

Crear `.env.example`:

```
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3001
DATABASE_URI=
JWT_SECRET=
```

---

## 8. Checklist de integración backend

- [ ] Crear módulo `realtime`
- [ ] Crear gateways
- [ ] Crear servicios de emisión
- [ ] Integrar eventos en POS
- [ ] Integrar eventos en Inventory
- [ ] Integrar eventos en Notifications
- [ ] Integrar eventos en Chat
- [ ] Asegurar autenticación por JWT
- [ ] Documentar en Swagger

---

## 9. Próximo documento sugerido  
**17_EVENTS_AND_DOMAIN_DRIVEN_REALTIME_FLOWS.md**  
Para documentar:  
- flujo completo de venta → inventario → dashboard → notificaciones.

