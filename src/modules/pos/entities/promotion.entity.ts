import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class Promotion {
  @prop({ required: true })
  name!: string;

  @prop()
  description?: string;

  @prop({ default: 0 })
  discountRate!: number;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class ComboRule {
  @prop({ required: true })
  name!: string;

  @prop({ type: () => [String], default: [] })
  variantIds!: string[];

  @prop({ required: true })
  bundlePrice!: number;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}
