import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type StockReservationDocument = StockReservation & Document;

export type StockReservationStatus = 'active' | 'released' | 'consumed';

@Schema({ _id: false })
export class StockReservationReference {
  @Prop({ required: true })
  module!: string;

  @Prop({ required: true })
  entity!: string;

  @Prop({ required: true })
  entityId!: string;

  @Prop({ required: true })
  lineId!: string;
}

const StockReservationReferenceSchema = SchemaFactory.createForClass(StockReservationReference);

@Schema({ collection: 'stock_reservations', timestamps: true })
export class StockReservation {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  enterpriseId!: string;

  @Prop({ required: true, index: true })
  productId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  locationId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  qty!: number;

  @Prop({ type: StockReservationReferenceSchema, required: true })
  reference!: StockReservationReference;

  @Prop({ required: true, enum: ['active', 'released', 'consumed'], default: 'active' })
  status!: StockReservationStatus;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const StockReservationSchema = SchemaFactory.createForClass(StockReservation);
StockReservationSchema.index(
  { enterpriseId: 1, 'reference.entityId': 1, 'reference.lineId': 1, productId: 1, locationId: 1 },
  { unique: true },
);
