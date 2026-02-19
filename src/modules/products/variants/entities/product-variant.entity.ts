import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class ProductVariant {
  @prop({ required: true })
  productId!: string;

  @prop({ required: true })
  name!: string;

  @prop({ required: true, unique: true })
  sku!: string;

  @prop({ type: () => [String], default: [] })
  barcodes!: string[];

  @prop({ required: true, default: 0 })
  price!: number;

  @prop({ required: true })
  uomId!: string;

  @prop({ default: true })
  sellable!: boolean;

  @prop({ required: true, index: true })
  OrganizationId!: string;

  @prop({ required: true, index: true })
  companyId!: string;

  @prop({ required: true, index: true })
  enterpriseId!: string;
}
