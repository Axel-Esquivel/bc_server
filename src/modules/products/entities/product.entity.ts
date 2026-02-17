import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class Product {
  @prop({ required: true })
  name!: string;

  @prop()
  sku?: string;

  @prop()
  barcode?: string;

  @prop({ required: true, default: 0 })
  price!: number;

  @prop({ required: true, default: true })
  isActive!: boolean;

  @prop()
  category?: string;

  @prop({ default: false })
  purchasable!: boolean;

  @prop({ default: true })
  sellable!: boolean;

  @prop({ default: false })
  trackInventory!: boolean;

  @prop({ required: true, index: true })
  OrganizationId!: string;

  @prop({ required: true, index: true })
  companyId!: string;

  @prop({ required: true, index: true })
  enterpriseId!: string;
}
