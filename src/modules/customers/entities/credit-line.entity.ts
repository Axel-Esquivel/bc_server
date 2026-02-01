import { modelOptions, prop } from '@typegoose/typegoose';

export enum CreditStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class CreditLine {
  @prop({ required: true, index: true })
  customerId!: string;

  @prop({ default: 0 })
  creditLimit!: number;

  @prop({ default: 'USD' })
  currency!: string;

  @prop({ enum: CreditStatus, default: CreditStatus.ACTIVE })
  status!: CreditStatus;

  @prop({ required: true, index: true })
  OrganizationId!: string;

  @prop({ required: true, index: true })
  companyId!: string;
}
