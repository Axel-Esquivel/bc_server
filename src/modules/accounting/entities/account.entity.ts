import { modelOptions, prop } from '@typegoose/typegoose';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  INCOME = 'income',
  EXPENSE = 'expense',
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
}
