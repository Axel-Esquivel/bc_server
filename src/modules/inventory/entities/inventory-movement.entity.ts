import { modelOptions, prop } from '@typegoose/typegoose';

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

  @prop()
  locationId?: string;

  @prop()
  batchId?: string;

  @prop({ required: true, min: 0 })
  quantity!: number;

  @prop({ required: true, unique: true, index: true })
  operationId!: string;

  @prop({ type: () => Object })
  references?: Record<string, any>;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}

export interface InventoryMovementRecord extends InventoryMovement {
  id: string;
  createdAt: Date;
}
