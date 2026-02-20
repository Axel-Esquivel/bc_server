import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CounterDocument = Counter & Document;

@Schema({ collection: 'counters', timestamps: true })
export class Counter {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true, default: 0 })
  seq: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
CounterSchema.index({ organizationId: 1, key: 1 }, { unique: true });
