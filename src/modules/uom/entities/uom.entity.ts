import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class Uom {
  @prop({ required: true })
  name!: string;

  @prop()
  nameNormalized?: string;

  @prop({ required: true })
  symbol!: string;

  @prop({ required: true, index: true })
  categoryId!: string;

  @prop({ required: true })
  factor!: number;

  @prop({ required: true, default: false })
  isBase!: boolean;

  @prop({ required: true, index: true })
  organizationId!: string;

  @prop({ default: true })
  isActive!: boolean;
}
