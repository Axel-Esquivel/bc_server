import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class Customer {
  @prop({ required: true })
  name!: string;

  @prop()
  email?: string;

  @prop()
  phone?: string;

  @prop({ default: true })
  active!: boolean;

  @prop({ required: true, index: true })
  workspaceId!: string;

  @prop({ required: true, index: true })
  companyId!: string;
}
