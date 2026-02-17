import { modelOptions, prop } from '@typegoose/typegoose';
import type { JsonObject } from '../../../core/events/business-event';

export enum InventoryDirection {
  IN = 'IN',
  OUT = 'OUT',
  ADJUST = 'ADJUST',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class InventoryMovement {
  @prop({ required: true, enum: InventoryDirection })
  direction!: InventoryDirection;

  @prop({ required: true, index: true })
  variantId!: string;

  @prop({ required: true, index: true })
  warehouseId!: string;

  @prop({ required: true, index: true })
  enterpriseId!: string;

  @prop()
  locationId?: string;

  @prop()
  batchId?: string;

  @prop({ required: true, min: 0 })
  quantity!: number;

  @prop({ required: true, unique: true, index: true })
  operationId!: string;

  @prop({ type: () => Object })
  references?: JsonObject;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}

export interface InventoryMovementRecord extends InventoryMovement {
  id: string;
  createdAt: Date;
}
