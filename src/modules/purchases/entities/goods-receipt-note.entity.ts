import { modelOptions, prop } from '@typegoose/typegoose';

export enum GoodsReceiptDiscountType {
  PERCENT = 'percent',
  AMOUNT = 'amount',
  PERCENT_UPPER = 'PERCENT',
  AMOUNT_UPPER = 'AMOUNT',
}

export class GoodsReceiptLine {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  variantId!: string;

  @prop()
  productId?: string;

  @prop({ required: true })
  quantity!: number;

  @prop()
  quantityReceived?: number;

  @prop({ required: true })
  unitCost!: number;

  @prop()
  effectiveUnitCost?: number;

  @prop()
  locationId?: string;

  @prop()
  batchId?: string;

  @prop()
  currency?: string;

  @prop()
  bonusQty?: number;

  @prop()
  bonusVariantId?: string;

  @prop()
  bonusVariantQty?: number;

  @prop({ enum: GoodsReceiptDiscountType })
  discountType?: GoodsReceiptDiscountType;

  @prop()
  discountValue?: number;

  @prop()
  isBonus?: boolean;

  @prop()
  bonusSourceLineId?: string;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class GoodsReceiptNote {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  warehouseId!: string;

  @prop()
  purchaseOrderId?: string;

  @prop({ type: () => [GoodsReceiptLine], default: [] })
  lines!: GoodsReceiptLine[];

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}
