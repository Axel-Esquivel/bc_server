import { modelOptions, prop } from '@typegoose/typegoose';

export enum InventoryCountLineStatus {
  PENDING = 'PENDING',
  RECOUNT_REQUIRED = 'RECOUNT_REQUIRED',
  OK = 'OK',
  FINALIZED = 'FINALIZED',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class InventoryCountLine {
  @prop({ required: true, index: true })
  sessionId!: string;

  @prop({ required: true })
  variantId!: string;

  @prop({ required: true })
  warehouseId!: string;

  @prop()
  locationId?: string;

  @prop()
  batchId?: string;

  @prop({ required: true })
  systemQtyAtStart!: number;

  @prop()
  finalQty?: number;

  @prop()
  decisionBy?: string;

  @prop()
  decisionAt?: Date;

  @prop()
  reason?: string;

  @prop({ required: true, enum: InventoryCountLineStatus, default: InventoryCountLineStatus.PENDING })
  status!: InventoryCountLineStatus;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}

export interface InventoryCountLineRecord extends InventoryCountLine {
  id: string;
  createdAt: Date;
}
