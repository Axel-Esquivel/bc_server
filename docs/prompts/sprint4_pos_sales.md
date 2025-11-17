# Sprint 4 — Prompts

1) pos/cart.model.ts { storeId, userId, status:'OPEN'|'CONFIRMED'|'CANCELLED', items[{variantId, qty, unitPrice, discounts[], lot?}], reservationsIds[], total, currency, createdAt }
2) pos/carts.service.ts create/open/confirm/cancel (usa inventory.reserve/commitSale)
3) pos/carts.controller.ts POST /pos/carts, POST /pos/carts/:id/confirm
4) sales/sale.model.ts y sales/sales.service.ts (persistencia de venta)
5) sockets/pos.gateway.ts emite 'pos:cart:update' y 'inventory:level:update'
