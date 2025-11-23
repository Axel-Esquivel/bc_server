import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class CustomerBalance {
  @prop({ required: true, index: true })
  customerId!: string;

  @prop({ required: true })
  balance!: number;

  @prop({ required: true })
  creditLimit!: number;

  @prop({ required: true })
  availableCredit!: number;

  @prop({ required: true, index: true })
  workspaceId!: string;

  @prop({ required: true, index: true })
  companyId!: string;
}
