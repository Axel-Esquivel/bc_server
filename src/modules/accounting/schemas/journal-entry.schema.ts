import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { JournalEntryStatus } from '../entities/journal-entry.entity';

export type JournalEntryDocument = JournalEntry & Document;

@Schema({ _id: false })
class JournalEntryPeriod {
  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  month: number;
}

const JournalEntryPeriodSchema = SchemaFactory.createForClass(JournalEntryPeriod);

@Schema({ _id: false })
class JournalEntryContext {
  @Prop({ required: true })
  enterpriseId: string;

  @Prop()
  companyId?: string;

  @Prop()
  countryId?: string;

  @Prop()
  currencyId?: string;
}

const JournalEntryContextSchema = SchemaFactory.createForClass(JournalEntryContext);

@Schema({ _id: false })
class JournalEntrySource {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  refId: string;

  @Prop()
  eventId?: string;
}

const JournalEntrySourceSchema = SchemaFactory.createForClass(JournalEntrySource);

@Schema({ collection: 'accounting_journal_entries', timestamps: true })
export class JournalEntry {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: JournalEntryPeriodSchema, required: true })
  period: JournalEntryPeriod;

  @Prop({ type: JournalEntryContextSchema, required: true })
  context: JournalEntryContext;

  @Prop({ type: JournalEntrySourceSchema, required: true })
  source: JournalEntrySource;

  @Prop({ default: '' })
  description?: string;

  @Prop({ required: true, enum: JournalEntryStatus, default: JournalEntryStatus.POSTED })
  status: JournalEntryStatus;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);
JournalEntrySchema.index({ organizationId: 1, 'context.enterpriseId': 1, 'period.year': 1, 'period.month': 1 });
JournalEntrySchema.index({ organizationId: 1, 'source.eventId': 1 }, { unique: true, sparse: true });
