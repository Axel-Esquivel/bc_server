import { modelOptions, prop } from '@typegoose/typegoose';

class PriceListItem {
  @prop({ required: true })
  variantId!: string;

  @prop({ required: true })
  price!: number;

  @prop({ default: 'USD' })
  currency!: string;

  @prop({ default: 1 })
  minQuantity!: number;

  @prop()
  customerSegment?: string;

  @prop()
  channel?: string;

  @prop()
  discountPercentage?: number;
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class PriceList {
  @prop({ required: true })
  name!: string;

  @prop()
  description?: string;

  @prop({ type: () => [PriceListItem], default: [] })
  items!: PriceListItem[];

  @prop({ required: true, index: true })
  workspaceId!: string;

  @prop({ required: true, index: true })
  companyId!: string;
}

export { PriceListItem };
