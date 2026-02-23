import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type StockDocument = Stock & Document;

@Schema({ collection: 'stock', timestamps: true })
export class Stock {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  enterpriseId!: string;

  @Prop({ required: true, index: true })
  productId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  warehouseId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  locationId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, default: 0 })
  onHand!: number;

  @Prop({ required: true, default: 0 })
  reserved!: number;

  @Prop({ required: true, default: 0 })
  avgCost!: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const StockSchema = SchemaFactory.createForClass(Stock);
StockSchema.index(
  { organizationId: 1, enterpriseId: 1, locationId: 1, productId: 1 },
  { unique: true },
);
StockSchema.index({ enterpriseId: 1, warehouseId: 1 });
StockSchema.index({ enterpriseId: 1, productId: 1 });
