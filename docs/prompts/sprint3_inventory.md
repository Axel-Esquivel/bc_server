# Sprint 3 — Prompts

1) inventory-movement.model.ts
   - { OrganizationId, companyId, warehouseId, variantId, lot?, expiryDate?, type:'IN'|'OUT'|'ADJ'|'TRANSFER_OUT'|'TRANSFER_IN', qty, uomId, createdBy, createdAt, source{docType, docId}, operationId único }
2) stock-projection.model.ts
   - { OrganizationId, companyId, warehouseId, variantId, lot?, onHand, reserved, available, version, expiryDate? } índices compuestos
3) stock-reservation.model.ts
   - { OrganizationId, companyId, warehouseId, variantId, lot?, qty, expiresAt, reason, refId, createdBy }
4) inventory.service.ts
   - reserve(), commitSale(), releaseReservation() con idempotencia y optimistic locking
5) expirations.service.ts (opcional)
   - FEFO helpers + alertas
