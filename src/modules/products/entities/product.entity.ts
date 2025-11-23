import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class Product {
  @prop({ required: true })
  name!: string;

  @prop()
  category?: string;

  @prop({ default: false })
  purchasable!: boolean;

  @prop({ default: true })
  sellable!: boolean;

  @prop({ default: false })
  trackInventory!: boolean;

  @prop({ required: true, index: true })
  workspaceId!: string;

  @prop({ required: true, index: true })
  companyId!: string;
}
