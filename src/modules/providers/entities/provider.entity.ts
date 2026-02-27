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

export enum ProviderStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class Provider {
  @prop({ required: true })
  name!: string;

  @prop()
  nit?: string;

  @prop()
  address?: string;

  @prop()
  creditLimit?: number;

  @prop()
  creditDays?: number;

  @prop({ required: true, enum: ProviderStatus, default: ProviderStatus.ACTIVE })
  status!: ProviderStatus;

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
