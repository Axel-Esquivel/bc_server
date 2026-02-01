import { modelOptions, prop } from '@typegoose/typegoose';

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
  TAX = 'TAX',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class Account {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  code!: string;

  @prop({ required: true })
  name!: string;

  @prop({ enum: AccountType, required: true })
  type!: AccountType;

  @prop()
  description?: string;

  @prop({ default: true })
  active!: boolean;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}
