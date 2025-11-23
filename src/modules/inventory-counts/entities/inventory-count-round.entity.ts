import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class InventoryCountRound {
  @prop({ required: true, index: true })
  sessionId!: string;

  @prop({ required: true, index: true })
  lineId!: string;

  @prop({ required: true, min: 1 })
  roundNumber!: number;

  @prop({ required: true })
  countedQty!: number;

  @prop()
  countedBy?: string;

  @prop()
  countedAt?: Date;

  @prop()
  source?: string;

  @prop({ required: true })
  workspaceId!: string;

  @prop({ required: true })
  companyId!: string;
}

export interface InventoryCountRoundRecord extends InventoryCountRound {
  id: string;
  createdAt: Date;
}
