# Domain Events (contratos)

- StockReserved { reservationId, OrganizationId, companyId, warehouseId, variantId, qty, at }
- StockReservationExpired { reservationId, ... }
- SaleCreated { saleId, cartId, items[], amounts, at }
- SaleCommitted { saleId, movements[], at }
- GoodsReceived { grnId, items[], at }
