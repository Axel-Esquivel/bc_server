import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { _id: false } })
export class JournalEntryLine {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  accountId!: string;

  @prop({ default: 0 })
  debit!: number;

  @prop({ default: 0 })
  credit!: number;

  @prop()
  description?: string;

  @prop()
  taxRuleId?: string;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}
