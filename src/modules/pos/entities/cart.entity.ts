import { modelOptions, prop } from '@typegoose/typegoose';
import { CartLineRecord } from './cart-line.entity';
import { PaymentRecord } from './payment.entity';

export enum CartStatus {
  OPEN = 'OPEN',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class Cart {
  @prop({ required: true, index: true })
  OrganizationId!: string;

  @prop({ required: true, index: true })
  companyId!: string;

  @prop({ required: true, index: true })
  warehouseId!: string;

  @prop({ index: true })
  userId?: string;

  @prop({ default: 'USD' })
  currency!: string;

  @prop({ required: true, enum: CartStatus, default: CartStatus.OPEN })
  status!: CartStatus;

  @prop({ default: 0 })
  subtotal!: number;

  @prop({ default: 0 })
  discountTotal!: number;

  @prop({ default: 0 })
  total!: number;
}

export interface CartRecord extends Cart {
  id: string;
  lines: CartLineRecord[];
  payments: PaymentRecord[];
  saleId?: string;
  createdAt: Date;
  updatedAt: Date;
}
