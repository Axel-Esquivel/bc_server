import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AccountingOutboxDocument = AccountingOutbox & Document;

export type AccountingOutboxStatus = 'pending' | 'processed' | 'failed' | 'ignored';

@Schema({ _id: false })
class AccountingOutboxContext {
  @Prop({ required: true })
  enterpriseId: string;

  @Prop()
  companyId?: string;

  @Prop()
  countryId?: string;

  @Prop()
  currencyId?: string;

  @Prop()
  year?: number;

  @Prop()
  month?: number;
}

const AccountingOutboxContextSchema = SchemaFactory.createForClass(AccountingOutboxContext);

@Schema({ _id: false })
class AccountingOutboxRef {
  @Prop({ required: true })
  entity: string;

  @Prop({ required: true })
  id: string;
}

const AccountingOutboxRefSchema = SchemaFactory.createForClass(AccountingOutboxRef);

@Schema({ collection: 'accounting_outbox', timestamps: true })
export class AccountingOutbox {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, unique: true, index: true })
  eventId: string;

  @Prop({ required: true, index: true })
  eventType: string;

  @Prop({ required: true })
  occurredAt: Date;

  @Prop({ type: AccountingOutboxContextSchema, required: true })
  context: AccountingOutboxContext;

  @Prop({ type: AccountingOutboxRefSchema, required: true })
  ref: AccountingOutboxRef;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload: Record<string, unknown>;

  @Prop({ required: true, enum: ['pending', 'processed', 'failed', 'ignored'], default: 'pending' })
  status: AccountingOutboxStatus;

  @Prop({ default: 0 })
  retries: number;

  @Prop()
  lastError?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AccountingOutboxSchema = SchemaFactory.createForClass(AccountingOutbox);
AccountingOutboxSchema.index({ organizationId: 1, status: 1, occurredAt: 1 });
