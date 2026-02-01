import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class Uom {
  @prop({ required: true })
  name!: string;

  @prop({ required: true, unique: true })
  code!: string;

  @prop({ required: true })
  factor!: number;

  @prop({ required: true, index: true })
  OrganizationId!: string;

  @prop({ required: true, index: true })
  companyId!: string;
}
