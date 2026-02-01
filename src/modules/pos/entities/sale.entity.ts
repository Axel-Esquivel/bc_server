import { modelOptions, prop } from '@typegoose/typegoose';
import { PaymentRecord } from './payment.entity';
import { SaleLineRecord } from './sale-line.entity';

export enum SaleStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class Sale {
  @prop({ required: true, index: true })
  OrganizationId!: string;

  @prop({ required: true, index: true })
  companyId!: string;

  @prop({ required: true, index: true })
  warehouseId!: string;

  @prop({ index: true })
  branchId?: string;

  @prop({ index: true })
  terminalId?: string;

  @prop({ index: true })
  cashierUserId?: string;

  @prop({ index: true })
  cartId?: string;

  @prop({ index: true })
  customerId?: string;

  @prop({ default: 'USD' })
  currency!: string;

  @prop({ required: true, enum: SaleStatus, default: SaleStatus.DRAFT })
  status!: SaleStatus;

  @prop({ default: 0 })
  subtotal!: number;

  @prop({ default: 0 })
  discountTotal!: number;

  @prop({ default: 0 })
  total!: number;
}

export interface SaleRecord extends Sale {
  id: string;
  lines: SaleLineRecord[];
  payments: PaymentRecord[];
  createdAt: Date;
  updatedAt: Date;
}
