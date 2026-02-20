import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class PackagingName {
  @prop({ required: true })
  name!: string;

  @prop()
  nameNormalized?: string;

  @prop({ required: true, index: true })
  organizationId!: string;

  @prop({ default: true })
  isActive!: boolean;

  @prop()
  sortOrder?: number;
}
