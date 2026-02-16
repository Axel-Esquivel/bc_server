import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type JournalEntryLineDocument = JournalEntryLine & Document;

@Schema({ collection: 'accounting_journal_entry_lines', timestamps: true })
export class JournalEntryLine {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  journalEntryId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  accountId: MongooseSchema.Types.ObjectId;

  @Prop({ default: 0 })
  debit: number;

  @Prop({ default: 0 })
  credit: number;

  @Prop()
  memo?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const JournalEntryLineSchema = SchemaFactory.createForClass(JournalEntryLine);
JournalEntryLineSchema.index({ journalEntryId: 1 });
