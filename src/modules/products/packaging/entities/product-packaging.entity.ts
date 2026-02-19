import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class ProductPackaging {
  @prop({ required: true })
  variantId!: string;

  @prop({ required: true })
  name!: string;

  @prop({ required: true, min: 1 })
  unitsPerPack!: number;

  @prop()
  barcode?: string;

  @prop({ required: true, default: 0 })
  price!: number;

  @prop({ default: true })
  isActive!: boolean;

  @prop({ required: true, index: true })
  OrganizationId!: string;

  @prop({ required: true, index: true })
  companyId!: string;

  @prop({ required: true, index: true })
  enterpriseId!: string;
}
