import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class SupplierCostHistory {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  supplierId!: string;

  @prop({ required: true })
  variantId!: string;

  @prop({ required: true })
  unitCost!: number;

  @prop()
  currency?: string;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}
