import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type InventoryAdjustmentDocument = InventoryAdjustment & Document;

export type InventoryAdjustmentState = 'draft' | 'counting' | 'posted' | 'cancelled';

@Schema({ _id: false })
export class InventoryAdjustmentLine {
  @Prop({ required: true })
  lineId!: string;

  @Prop({ required: true })
  productId!: string;

  @Prop({ required: true })
  countedQty!: number;
}

const InventoryAdjustmentLineSchema = SchemaFactory.createForClass(InventoryAdjustmentLine);

@Schema({ collection: 'inventory_adjustments', timestamps: true })
export class InventoryAdjustment {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  enterpriseId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  warehouseId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  locationId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['draft', 'counting', 'posted', 'cancelled'] })
  state!: InventoryAdjustmentState;

  @Prop({ type: [InventoryAdjustmentLineSchema], default: [] })
  lines!: InventoryAdjustmentLine[];

  @Prop()
  postedAt?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const InventoryAdjustmentSchema = SchemaFactory.createForClass(InventoryAdjustment);
InventoryAdjustmentSchema.index({ organizationId: 1, enterpriseId: 1, state: 1 });
