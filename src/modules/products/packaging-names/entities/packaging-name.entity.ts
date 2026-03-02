import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class PackagingName {
  @prop({ required: true })
  name!: string;

  @prop({ required: true, min: 1 })
  multiplier!: number;

  @prop()
  nameNormalized?: string;

  @prop({ required: true, index: true })
  organizationId!: string;

  @prop({ default: true })
  isActive!: boolean;

  @prop({ default: false })
  isSystem?: boolean;

  @prop({ default: false })
  variableMultiplier?: boolean;

  @prop()
  sortOrder?: number;
}
