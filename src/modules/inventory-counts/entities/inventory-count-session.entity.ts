import { modelOptions, prop } from '@typegoose/typegoose';

export enum InventoryCountScope {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  CYCLE = 'CYCLE',
}

export enum InventoryCountMode {
  BLIND = 'BLIND',
  GUIDED = 'GUIDED',
}

export enum InventoryCountStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class InventoryCountSession {
  @prop({ required: true })
  workspaceId!: string;

  @prop({ required: true })
  companyId!: string;

  @prop({ required: true })
  warehouseId!: string;

  @prop({ required: true, enum: InventoryCountScope })
  scope!: InventoryCountScope;

  @prop({ required: true, enum: InventoryCountMode })
  mode!: InventoryCountMode;

  @prop({ required: true, min: 1 })
  roundsPlanned!: number;

  @prop({ required: true, enum: InventoryCountStatus, default: InventoryCountStatus.DRAFT })
  status!: InventoryCountStatus;

  @prop()
  startedAt?: Date;

  @prop()
  closedAt?: Date;
}

export interface InventoryCountSessionRecord extends InventoryCountSession {
  id: string;
  createdAt: Date;
}
