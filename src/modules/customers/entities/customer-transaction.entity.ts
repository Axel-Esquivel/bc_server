import { modelOptions, prop } from '@typegoose/typegoose';

export enum CustomerTransactionType {
  CHARGE = 'CHARGE',
  PAYMENT = 'PAYMENT',
  ADJUSTMENT = 'ADJUSTMENT',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class CustomerTransaction {
  @prop({ required: true, index: true })
  customerId!: string;

  @prop({ enum: CustomerTransactionType, required: true })
  type!: CustomerTransactionType;

  @prop({ required: true, min: 0 })
  amount!: number;

  @prop()
  description?: string;

  @prop()
  reference?: string;

  @prop({ default: () => new Date() })
  occurredAt!: Date;

  @prop({ required: true, index: true })
  workspaceId!: string;

  @prop({ required: true, index: true })
  companyId!: string;
}
