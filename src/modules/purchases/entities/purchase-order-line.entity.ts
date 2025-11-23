import { modelOptions, prop } from '@typegoose/typegoose';

export enum PurchaseOrderLineStatus {
  PENDING = 'PENDING',
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
}

@modelOptions({ schemaOptions: { _id: false, timestamps: true } })
export class PurchaseOrderLine {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  variantId!: string;

  @prop({ required: true, min: 0 })
  quantity!: number;

  @prop({ default: 0 })
  receivedQuantity!: number;

  @prop({ required: true })
  unitCost!: number;

  @prop()
  currency?: string;

  @prop({ enum: PurchaseOrderLineStatus, default: PurchaseOrderLineStatus.PENDING })
  status!: PurchaseOrderLineStatus;

  @prop()
  suggestionId?: string;

  @prop({ required: true })
  workspaceId!: string;

  @prop({ required: true })
  companyId!: string;
}
