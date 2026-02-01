import { modelOptions, prop } from '@typegoose/typegoose';

class CostHistoryEntry {
  @prop({ required: true })
  variantId!: string;

  @prop({ required: true })
  cost!: number;

  @prop({ default: 'USD' })
  currency!: string;

  @prop({ default: () => new Date() })
  recordedAt!: Date;
}

class ProviderVariant {
  @prop({ required: true })
  variantId!: string;

  @prop({ default: true })
  active!: boolean;

  @prop({ type: () => [CostHistoryEntry], default: [] })
  costHistory!: CostHistoryEntry[];
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class Provider {
  @prop({ required: true })
  name!: string;

  @prop()
  contactEmail?: string;

  @prop()
  contactPhone?: string;

  @prop({ type: () => [ProviderVariant], default: [] })
  variants!: ProviderVariant[];

  @prop({ required: true, index: true })
  OrganizationId!: string;

  @prop({ required: true, index: true })
  companyId!: string;
}

export { CostHistoryEntry, ProviderVariant };
