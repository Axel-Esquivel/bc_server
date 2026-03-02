import { modelOptions, prop } from '@typegoose/typegoose';

export enum PurchaseOrderLineStatus {
  PENDING = 'PENDING',
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
}

export enum PurchaseOrderLineDiscountType {
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT',
}

@modelOptions({ schemaOptions: { _id: false, timestamps: true } })
export class PurchaseOrderLine {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  variantId!: string;

  @prop({ required: true })
  packagingId!: string;

  @prop({ required: true, min: 1 })
  packagingMultiplier!: number;

  @prop()
  packagingNameId?: string;

  @prop()
  packagingMultiplierSnapshot?: number;

  @prop({ required: true, min: 0 })
  quantity!: number;

  @prop({ default: 0 })
  receivedQuantity!: number;

  @prop({ required: true })
  unitCost!: number;

  @prop()
  currency?: string;

  @prop()
  freightCost?: number;

  @prop()
  extraCosts?: number;

  @prop()
  notes?: string;

  @prop({ min: 0 })
  bonusQty?: number;

  @prop({ enum: PurchaseOrderLineDiscountType })
  discountType?: PurchaseOrderLineDiscountType;

  @prop({ min: 0 })
  discountValue?: number;

  @prop({ enum: PurchaseOrderLineStatus, default: PurchaseOrderLineStatus.PENDING })
  status!: PurchaseOrderLineStatus;

  @prop()
  suggestionId?: string;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}
