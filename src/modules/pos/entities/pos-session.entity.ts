import { modelOptions, prop } from '@typegoose/typegoose';

export enum PosSessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class PosSession {
  @prop({ required: true, index: true })
  OrganizationId!: string;

  @prop({ required: true, index: true })
  companyId!: string;

  @prop({ required: true, index: true })
  enterpriseId!: string;

  @prop({ index: true })
  cashierUserId?: string;

  @prop({ required: true })
  status!: PosSessionStatus;

  @prop({ required: true, default: 0 })
  openingAmount!: number;

  @prop()
  openedAt!: Date;

  @prop()
  closedAt?: Date;

  @prop()
  closingAmount?: number;

  @prop({ required: true })
  warehouseId!: string;
}

export interface PosSessionRecord extends PosSession {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
