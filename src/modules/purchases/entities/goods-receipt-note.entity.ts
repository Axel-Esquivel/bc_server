import { modelOptions, prop } from '@typegoose/typegoose';

export class GoodsReceiptLine {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  variantId!: string;

  @prop({ required: true })
  quantity!: number;

  @prop({ required: true })
  unitCost!: number;

  @prop()
  locationId?: string;

  @prop()
  batchId?: string;

  @prop()
  currency?: string;

  @prop({ required: true })
  workspaceId!: string;

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
  workspaceId!: string;

  @prop({ required: true })
  companyId!: string;
}
