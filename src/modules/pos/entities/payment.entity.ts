import { modelOptions, prop } from '@typegoose/typegoose';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  VOUCHER = 'VOUCHER',
  TRANSFER = 'TRANSFER',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class Payment {
  @prop({ required: true, enum: PaymentMethod })
  method!: PaymentMethod;

  @prop({ required: true })
  amount!: number;

  @prop({ default: 'USD' })
  currency!: string;

  @prop()
  reference?: string;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}

export interface PaymentRecord extends Payment {
  id: string;
  saleId?: string;
  cartId?: string;
}
