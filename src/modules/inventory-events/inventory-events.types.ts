import { LocationUsage } from '../locations/entities/location.entity';

export type InventoryInboundEventType =
  | 'PurchaseReceived'
  | 'PosTicketClosed'
  | 'SaleConfirmed'
  | 'TransferDispatched'
  | 'TransferReceived';

export interface InventoryEventReference {
  module: string;
  entity: string;
  entityId: string;
  lineId: string;
}

export interface InventoryInboundEventPayloadBase {
  organizationId: string;
  enterpriseId: string;
  productId: string;
  qty: number;
  unitCost?: number;
  warehouseId?: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  fromLocationCode?: string;
  toLocationCode?: string;
  fromLocationUsage?: LocationUsage;
  toLocationUsage?: LocationUsage;
  reference: InventoryEventReference;
}

export type PurchaseReceivedPayload = InventoryInboundEventPayloadBase;
export type PosTicketClosedPayload = InventoryInboundEventPayloadBase;
export type SaleConfirmedPayload = InventoryInboundEventPayloadBase;
export type TransferDispatchedPayload = InventoryInboundEventPayloadBase;
export type TransferReceivedPayload = InventoryInboundEventPayloadBase;
