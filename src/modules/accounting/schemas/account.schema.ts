import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AccountDocument = Account & Document;

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

@Schema({ collection: 'accounting_accounts', timestamps: true })
export class Account {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['asset', 'liability', 'equity', 'income', 'expense'] })
  type: AccountType;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  parentAccountId?: MongooseSchema.Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
AccountSchema.index({ organizationId: 1, code: 1 }, { unique: true });
