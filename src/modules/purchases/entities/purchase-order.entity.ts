import { modelOptions, prop } from '@typegoose/typegoose';
import { PurchaseOrderLine } from './purchase-order-line.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class PurchaseOrder {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  supplierId!: string;

  @prop({ required: true })
  warehouseId!: string;

  @prop({ enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status!: PurchaseOrderStatus;

  @prop({ type: () => [PurchaseOrderLine], default: [] })
  lines!: PurchaseOrderLine[];

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;

  @prop({ required: true })
  createdAt!: string;

  @prop()
  expectedDeliveryDate?: string;

  @prop()
  receivedAt?: string;

  @prop()
  globalFreight?: number;

  @prop()
  globalExtraCosts?: number;
}
