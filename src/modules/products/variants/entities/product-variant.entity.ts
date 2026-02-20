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

  @prop()
  internalBarcode?: string;

  @prop({ required: true, default: 0 })
  minStock!: number;

  @prop({ required: true })
  uomId!: string;

  @prop()
  uomCategoryId?: string;

  @prop({ required: true, default: 1 })
  quantity!: number;

  @prop({ default: true })
  sellable!: boolean;

  @prop({ required: true, index: true })
  OrganizationId!: string;

  @prop({ required: true, index: true })
  companyId!: string;

  @prop({ required: true, index: true })
  enterpriseId!: string;
}
