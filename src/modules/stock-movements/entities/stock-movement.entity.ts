import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type StockMovementDocument = StockMovement & Document;

export enum StockMovementType {
  IN = 'in',
  OUT = 'out',
  INTERNAL = 'internal',
  ADJUST = 'adjust',
  RETURN = 'return',
  SCRAP = 'scrap',
}

export enum StockMovementStatus {
  POSTED = 'posted',
  REVERSED = 'reversed',
}

@Schema({ _id: false })
export class StockMovementReference {
  @Prop({ required: true })
  module!: string;

  @Prop({ required: true })
  entity!: string;

  @Prop({ required: true })
  entityId!: string;

  @Prop({ required: true })
  lineId!: string;
}

const StockMovementReferenceSchema = SchemaFactory.createForClass(StockMovementReference);

@Schema({ collection: 'stock_movements', timestamps: true })
export class StockMovement {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  enterpriseId!: string;

  @Prop({ required: true, enum: StockMovementType })
  type!: StockMovementType;

  @Prop({ required: true })
  productId!: string;

  @Prop({ required: true })
  qty!: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  fromLocationId!: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  toLocationId!: MongooseSchema.Types.ObjectId | null;

  @Prop({ required: true, default: 0 })
  unitCost!: number;

  @Prop({ type: StockMovementReferenceSchema, required: true })
  reference!: StockMovementReference;

  @Prop({ required: true, enum: StockMovementStatus, default: StockMovementStatus.POSTED })
  status!: StockMovementStatus;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);
StockMovementSchema.index({ enterpriseId: 1, createdAt: -1 });
StockMovementSchema.index({ enterpriseId: 1, productId: 1, createdAt: -1 });
StockMovementSchema.index(
  {
    organizationId: 1,
    enterpriseId: 1,
    'reference.module': 1,
    'reference.entity': 1,
    'reference.entityId': 1,
    'reference.lineId': 1,
  },
  { unique: true },
);
