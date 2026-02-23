import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TransferDocument = Transfer & Document;

export type TransferState =
  | 'draft'
  | 'confirmed'
  | 'in_transit'
  | 'received'
  | 'done'
  | 'cancelled';

@Schema({ _id: false })
export class TransferLine {
  @Prop({ required: true })
  lineId!: string;

  @Prop({ required: true })
  productId!: string;

  @Prop({ required: true })
  qty!: number;
}

const TransferLineSchema = SchemaFactory.createForClass(TransferLine);

@Schema({ collection: 'transfers', timestamps: true })
export class Transfer {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  enterpriseId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  originWarehouseId!: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  destinationWarehouseId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['draft', 'confirmed', 'in_transit', 'received', 'done', 'cancelled'] })
  state!: TransferState;

  @Prop({ type: [TransferLineSchema], default: [] })
  lines!: TransferLine[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TransferSchema = SchemaFactory.createForClass(Transfer);
TransferSchema.index({ organizationId: 1, enterpriseId: 1, state: 1 });
