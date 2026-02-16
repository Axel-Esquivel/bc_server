import { modelOptions, prop } from '@typegoose/typegoose';
import { JournalEntryLine } from './journal-entry-line.entity';

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class JournalEntry {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  date!: Date;

  @prop({ required: true })
  reference!: string;

  @prop()
  sourceModule?: string;

  @prop()
  sourceId?: string;

  @prop({ enum: JournalEntryStatus, default: JournalEntryStatus.POSTED })
  status!: JournalEntryStatus;

  @prop({ type: () => [JournalEntryLine], default: [] })
  lines!: JournalEntryLine[];

  @prop({ required: true })
  OrganizationId!: string;
}
