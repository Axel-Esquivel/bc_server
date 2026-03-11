import { modelOptions, prop } from '@typegoose/typegoose';

export enum PosSessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class PosSession {
  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;

  @prop({ required: true })
  enterpriseId!: string;

  @prop({ required: true })
  warehouseId!: string;

  @prop({ required: true })
  cashierUserId!: string;

  @prop({ required: true, enum: PosSessionStatus })
  status!: PosSessionStatus;

  @prop({ required: true })
  openingAmount!: number;

  @prop()
  closingAmount?: number;

  @prop({ required: true })
  openedAt!: Date;

  @prop()
  closedAt?: Date;

  @prop({ required: true })
  createdAt!: Date;

  @prop({ required: true })
  updatedAt!: Date;
}

export interface PosSessionRecord extends PosSession {
  id: string;
}
