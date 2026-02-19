import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class UomCategory {
  @prop({ required: true })
  name!: string;

  @prop()
  nameNormalized?: string;

  @prop({ required: true, index: true })
  organizationId!: string;

  @prop({ default: true })
  isActive!: boolean;
}
