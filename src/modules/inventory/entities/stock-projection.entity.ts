import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class StockProjection {
  @prop({ required: true, index: true })
  variantId!: string;

  @prop({ required: true, index: true })
  warehouseId!: string;

  @prop({ index: true })
  locationId?: string;

  @prop({ index: true })
  batchId?: string;

  @prop({ required: true, default: 0 })
  onHand!: number;

  @prop({ required: true, default: 0 })
  reserved!: number;

  @prop({ required: true, default: 0 })
  available!: number;

  @prop({ required: true, default: 0 })
  version!: number;

  @prop({ required: true })
  workspaceId!: string;

  @prop({ required: true })
  companyId!: string;
}

export interface StockProjectionRecord extends StockProjection {
  id: string;
}
