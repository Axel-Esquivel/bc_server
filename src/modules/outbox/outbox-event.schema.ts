import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type OutboxEventDocument = OutboxEvent & Document;

export type OutboxEventStatus = 'pending' | 'processed' | 'failed';

@Schema({ collection: 'outbox_events', timestamps: true })
export class OutboxEvent {
  @Prop({ required: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, index: true })
  enterpriseId: string;

  @Prop({ required: true, index: true })
  moduleKey: string;

  @Prop({ required: true, index: true })
  eventType: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  payload!: Record<string, unknown>;

  @Prop({ required: true, enum: ['pending', 'processed', 'failed'], default: 'pending' })
  status: OutboxEventStatus;

  @Prop()
  processedAt?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
OutboxEventSchema.index({ organizationId: 1, enterpriseId: 1, status: 1 });
